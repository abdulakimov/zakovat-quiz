import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";

const port = Number(process.env.PLAYWRIGHT_PORT ?? "3100");
const host = "127.0.0.1";
const baseUrl = `http://${host}:${port}`;
const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const googleFontMockResponses = path.join(process.cwd(), "scripts", "next-font-google-mocked-responses.cjs");

function parseWindowsListeningPids(output, targetPort) {
  const pids = new Set();
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (!line.startsWith("TCP")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 5) continue;
    const localAddress = parts[1] ?? "";
    const state = parts[3] ?? "";
    const pidRaw = parts[4] ?? "";
    if (state !== "LISTENING") continue;
    if (!localAddress.endsWith(`:${targetPort}`)) continue;
    const pid = Number(pidRaw);
    if (Number.isInteger(pid) && pid > 0) pids.add(pid);
  }
  return Array.from(pids);
}

function getPortOwnerPids(targetPort) {
  if (process.platform === "win32") {
    try {
      const output = execFileSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8" });
      return parseWindowsListeningPids(output, targetPort);
    } catch {
      return [];
    }
  }

  try {
    const output = execFileSync("lsof", ["-ti", `tcp:${targetPort}`], { encoding: "utf8" }).trim();
    if (!output) return [];
    return output
      .split(/\r?\n/)
      .map((line) => Number(line.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0);
  } catch {
    return [];
  }
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function killPid(pid) {
  if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) return;
  if (!isPidAlive(pid)) return;

  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      // Ignore if process already exited.
    }
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }

  const start = Date.now();
  while (Date.now() - start < 5000) {
    if (!isPidAlive(pid)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // Ignore if process already exited.
  }
}

const useShell = process.platform === "win32";

async function runCommand(command, args, extraEnv = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: useShell,
      env: {
        ...process.env,
        PLAYWRIGHT_PORT: String(port),
        PLAYWRIGHT_BASE_URL: baseUrl,
        ...extraEnv,
      },
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (typeof code === "number" && code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed: ${command} ${args.join(" ")} (code: ${code ?? "null"}, signal: ${signal ?? "null"})`));
    });
  });
}

async function removeStaleNextDevLock() {
  const lockPath = path.join(process.cwd(), ".next", "dev", "lock");
  try {
    await fs.rm(lockPath, { recursive: true, force: true });
  } catch {
    // Ignore lock cleanup errors.
  }
}

async function freePort(targetPort) {
  const pids = getPortOwnerPids(targetPort).filter((pid) => pid !== process.pid);
  for (const pid of pids) {
    await killPid(pid);
  }
}

async function main() {
  await removeStaleNextDevLock();
  await freePort(port);

  const requestedMode = process.env.E2E_SERVER_MODE ?? "auto";
  let startMode = requestedMode === "dev" ? "dev" : "prod";

  if (startMode === "prod" && process.env.E2E_SKIP_BUILD !== "1") {
    try {
      await runCommand(pnpmCmd, ["exec", "next", "build"], {
        NEXT_FONT_GOOGLE_MOCKED_RESPONSES: googleFontMockResponses,
      });
    } catch (error) {
      if (requestedMode === "prod") throw error;
      // Build can fail in restricted CI/dev machines (e.g. blocked font fetch); use dev server in that case.
      startMode = "dev";
    }
  }

  let startCommand = pnpmCmd;
  let startArgs = ["exec", "next", "dev", "-H", host, "-p", String(port)];
  let startWithShell = useShell;

  if (startMode === "prod") {
    const standaloneServerPath = path.join(process.cwd(), ".next", "standalone", "server.js");
    startCommand = pnpmCmd;
    startArgs = ["exec", "next", "start", "-H", host, "-p", String(port)];
    startWithShell = useShell;
    try {
      await fs.access(standaloneServerPath);
      startCommand = process.execPath;
      startArgs = [standaloneServerPath];
      startWithShell = false;
    } catch {
      // Fallback for non-standalone builds.
    }
  }

  const server = spawn(startCommand, startArgs, {
    stdio: "inherit",
    shell: startWithShell,
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: host,
      PLAYWRIGHT_PORT: String(port),
      PLAYWRIGHT_BASE_URL: baseUrl,
      APP_BASE_URL: process.env.APP_BASE_URL ?? baseUrl,
      PUBLIC_APP_URL: process.env.PUBLIC_APP_URL ?? baseUrl,
    },
  });

  const shutdown = (signal) => {
    if (!server.killed) {
      server.kill(signal);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  server.on("error", (error) => {
    console.error(error);
    process.exit(1);
  });

  server.on("exit", (code, signal) => {
    if (signal) {
      process.exit(0);
      return;
    }
    process.exit(code ?? 1);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
