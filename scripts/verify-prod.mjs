import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import http from "node:http";

const host = "127.0.0.1";
const preferredPort = Number(process.env.PORT ?? "3100");
const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const useShell = process.platform === "win32";
const googleFontMockResponses = path.join(process.cwd(), "scripts", "next-font-google-mocked-responses.cjs");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeStdout(message) {
  process.stdout.write(`${message}\n`);
}

function writeStderr(message) {
  process.stderr.write(`${message}\n`);
}

function terminateChildProcess(child) {
  return new Promise((resolve) => {
    if (!child || child.killed || child.exitCode !== null) {
      resolve();
      return;
    }

    const done = () => resolve();
    child.once("exit", done);
    child.once("error", done);

    if (process.platform === "win32") {
      try {
        execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      } catch {
        try {
          child.kill();
        } catch {
          resolve();
        }
      }
      return;
    }

    try {
      child.kill("SIGTERM");
    } catch {
      resolve();
    }

    setTimeout(() => {
      if (child.exitCode === null) {
        try {
          child.kill("SIGKILL");
        } catch {
          // ignore
        }
      }
    }, 5000);
  });
}

function parseWindowsListeningPids(output, targetPort) {
  const pids = new Set();
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || !line.startsWith("TCP")) continue;
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

async function runCommand(command, args, extraEnv = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: useShell,
      env: {
        ...process.env,
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

async function listBuiltFonts() {
  const mediaDir = path.join(process.cwd(), ".next", "static", "media");
  let files = [];
  try {
    const entries = await fs.readdir(mediaDir, { withFileTypes: true });
    files = entries
      .filter((entry) => entry.isFile() && /\.(woff2?)$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    files = [];
  }

  writeStdout("\nBuilt font assets (.next/static/media):");
  if (!files.length) {
    writeStdout("- none found");
    return files;
  }
  for (const file of files) {
    writeStdout(`- ${file}`);
  }
  writeStdout(`Total font files: ${files.length}`);
  return files;
}

function checkServerReady(targetUrl) {
  return new Promise((resolve) => {
    const request = http.get(targetUrl, (response) => {
      response.resume();
      resolve(response.statusCode && response.statusCode < 500);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(3000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(targetUrl, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkServerReady(targetUrl)) return;
    await sleep(500);
  }
  throw new Error(`Timed out waiting for server readiness: ${targetUrl}`);
}

function assertPortIsFree(targetPort) {
  const pids = getPortOwnerPids(targetPort).filter((pid) => pid !== process.pid);
  return pids.length === 0;
}

function resolveOpenPort(startPort, maxAttempts = 20) {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const candidate = startPort + offset;
    if (assertPortIsFree(candidate)) return candidate;
  }
  throw new Error(`No free port found in range ${startPort}-${startPort + maxAttempts - 1}.`);
}

async function main() {
  await runCommand(pnpmCmd, ["lint"]);
  await runCommand(pnpmCmd, ["typecheck"]);
  await runCommand(pnpmCmd, ["test"]);
  await runCommand(pnpmCmd, ["build"], {
    NEXT_FONT_GOOGLE_MOCKED_RESPONSES: googleFontMockResponses,
  });
  await listBuiltFonts();

  const port = resolveOpenPort(preferredPort);
  const baseUrl = `http://${host}:${port}`;
  if (port !== preferredPort) {
    writeStdout(`Preferred port ${preferredPort} is occupied. Using port ${port} instead.`);
  }

  const standaloneServerPath = path.join(process.cwd(), ".next", "standalone", "server.js");
  let serverCommand = pnpmCmd;
  let serverArgs = ["start", "-p", String(port)];
  let serverShell = useShell;
  try {
    await fs.access(standaloneServerPath);
    serverCommand = process.execPath;
    serverArgs = [standaloneServerPath];
    serverShell = false;
  } catch {
    // Fallback to next start for non-standalone output.
  }

  const server = spawn(serverCommand, serverArgs, {
    stdio: "inherit",
    shell: serverShell,
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: host,
      APP_BASE_URL: process.env.APP_BASE_URL ?? baseUrl,
      PUBLIC_APP_URL: process.env.PUBLIC_APP_URL ?? baseUrl,
    },
  });

  const cleanup = async () => {
    await terminateChildProcess(server);
  };

  const shutdown = async () => {
    await cleanup();
    process.exit(1);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await waitForServer(`${baseUrl}/uz/auth/login`);
    await runCommand(pnpmCmd, ["diag:font"], {
      FONT_DIAG_BASE_URL: baseUrl,
    });
  } finally {
    process.removeListener("SIGINT", shutdown);
    process.removeListener("SIGTERM", shutdown);
    await cleanup();
  }
}

main().catch((error) => {
  writeStderr(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
