import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.FONT_DIAG_BASE_URL ?? "http://127.0.0.1:3100";
const artifactsDir = path.join(process.cwd(), ".artifacts");
const screenshotsDir = path.join(artifactsDir, "screenshots");
const reportJsonPath = path.join(artifactsDir, "font-report.json");
const reportMdPath = path.join(artifactsDir, "font-report.md");
const expectedFontTokens = ["Geist", "__Geist", "--font-sans", "var(--font-sans)"];
const fallbackFontTokens = [
  "ui-sans-serif",
  "system-ui",
  "-apple-system",
  "Segoe UI",
  "Roboto",
  "Arial",
  "Noto Sans",
  "sans-serif",
];

const pageSpecs = [
  { key: "login", path: "/uz/auth/login" },
  { key: "app", path: "/uz/app" },
  { key: "profile", path: "/uz/app/profile?tab=profile" },
];

function normalizeFontFamily(value) {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasExpectedFont(fontFamily, fontVariableResolvedFamily) {
  const variableLower = (fontVariableResolvedFamily ?? "").toLowerCase();
  return expectedFontTokens.some((token) => {
    const tokenLower = token.toLowerCase();
    return fontFamily.toLowerCase().includes(tokenLower) || variableLower.includes(tokenLower);
  });
}

function isFallbackOnlyFont(fontFamily) {
  if (!fontFamily) return true;
  if (hasExpectedFont(fontFamily)) return false;
  const cleaned = fontFamily
    .split(",")
    .map((part) => part.replace(/["']/g, "").trim())
    .filter(Boolean);
  if (!cleaned.length) return true;
  return cleaned.every((item) => fallbackFontTokens.some((token) => item.toLowerCase().includes(token.toLowerCase())));
}

function isFontRequest(url, resourceType) {
  if (resourceType === "font") return true;
  return /\.(woff2?)(\?|$)/i.test(url);
}

function toNumber(value) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function makeMarkdown(report) {
  const lines = [];
  lines.push("# Font Diagnostic Report");
  lines.push("");
  lines.push(`- Base URL: ${report.baseUrl}`);
  lines.push(`- Created at: ${report.createdAt}`);
  lines.push(`- Overall status: ${report.ok ? "PASS" : "FAIL"}`);
  lines.push("");
  lines.push("## Build Font Assets");
  lines.push(`- Total files: ${report.buildFontAssets.total}`);
  for (const file of report.buildFontAssets.files) {
    lines.push(`- ${file}`);
  }
  lines.push("");
  lines.push("## Page Diagnostics");
  for (const page of report.pages) {
    lines.push(`### ${page.key}`);
    lines.push(`- URL: ${page.url}`);
    lines.push(`- Final URL: ${page.finalUrl}`);
    lines.push(`- Body font-family: ${page.computed.bodyFontFamily}`);
    lines.push(`- --font-sans value: ${page.computed.fontSansVariable}`);
    lines.push(`- Body font-size: ${page.computed.bodyFontSize}`);
    lines.push(`- Body font-weight: ${page.computed.bodyFontWeight}`);
    lines.push(`- HTML font-size: ${page.computed.documentElementFontSize}`);
    lines.push(`- document.fonts.status: ${page.computed.documentFontsStatus}`);
    lines.push(`- Expected font token found: ${page.expectedFontMatched ? "yes" : "no"}`);
    lines.push(`- Fallback-only body font: ${page.fallbackOnlyBodyFont ? "yes" : "no"}`);
    lines.push(`- Screenshot: ${page.screenshotPath}`);
    lines.push(`- Font requests: ${page.fontRequests.length}`);
    if (page.navigationError) {
      lines.push(`- Navigation error: ${page.navigationError}`);
    }
    for (const req of page.fontRequests) {
      lines.push(
        `  - [${req.ok ? "OK" : "FAIL"}] ${req.status ?? "no-status"} ${req.url} content-length=${req.contentLength ?? "n/a"} cache-control=${req.cacheControl ?? "n/a"}`,
      );
    }
    if (page.failedFontRequests.length) {
      lines.push("- Failed font requests:");
      for (const failed of page.failedFontRequests) {
        lines.push(`  - ${failed.url} (status: ${failed.status ?? "failed"})`);
      }
    }
    lines.push("");
  }

  if (report.failReasons.length) {
    lines.push("## Fail Reasons");
    for (const reason of report.failReasons) {
      lines.push(`- ${reason}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function listBuildFontAssets() {
  const mediaDir = path.join(process.cwd(), ".next", "static", "media");
  try {
    const entries = await fs.readdir(mediaDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && /\.(woff2?)$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
    return {
      dir: mediaDir,
      total: files.length,
      files,
    };
  } catch {
    return {
      dir: mediaDir,
      total: 0,
      files: [],
    };
  }
}

async function diagnosePage(page, spec) {
  const pageFontRequests = [];
  page.on("requestfinished", async (request) => {
    if (!isFontRequest(request.url(), request.resourceType())) return;
    let status = null;
    let headers = {};
    try {
      const response = await request.response();
      if (response) {
        status = response.status();
        headers = response.headers();
      }
    } catch {
      // Ignore and record minimal info.
    }
    pageFontRequests.push({
      url: request.url(),
      resourceType: request.resourceType(),
      method: request.method(),
      status,
      ok: status === 200,
      contentLength: toNumber(headers["content-length"]),
      cacheControl: headers["cache-control"] ?? null,
      age: headers["age"] ?? null,
      etag: headers.etag ?? null,
    });
  });

  page.on("requestfailed", (request) => {
    if (!isFontRequest(request.url(), request.resourceType())) return;
    pageFontRequests.push({
      url: request.url(),
      resourceType: request.resourceType(),
      method: request.method(),
      status: null,
      ok: false,
      contentLength: null,
      cacheControl: null,
      age: null,
      etag: null,
      failureText: request.failure()?.errorText ?? "request failed",
    });
  });

  const url = `${baseUrl}${spec.path}`;
  let navigationError = null;
  let computed = {
    documentElementFontSize: null,
    bodyFontSize: null,
    bodyFontFamily: "",
    bodyFontWeight: null,
    fontSansVariable: "",
    documentFontsStatus: "unknown",
    documentFontsSize: null,
  };
  try {
    const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    if (!response) {
      navigationError = `No response received for ${url}`;
    } else {
      await page.waitForTimeout(1000);
      await page.evaluate(async () => {
        if (document.fonts?.ready) {
          try {
            await document.fonts.ready;
          } catch {
            // Ignore font readiness errors.
          }
        }
      });
      await page.waitForTimeout(500);

      computed = await page.evaluate(() => {
        const htmlStyle = window.getComputedStyle(document.documentElement);
        const bodyStyle = window.getComputedStyle(document.body);
        const rootStyle = window.getComputedStyle(document.documentElement);
        return {
          documentElementFontSize: htmlStyle.fontSize,
          bodyFontSize: bodyStyle.fontSize,
          bodyFontFamily: bodyStyle.fontFamily,
          bodyFontWeight: bodyStyle.fontWeight,
          fontSansVariable: rootStyle.getPropertyValue("--font-sans").trim(),
          documentFontsStatus: document.fonts?.status ?? "unsupported",
          documentFontsSize: typeof document.fonts?.size === "number" ? document.fonts.size : null,
        };
      });
    }
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error);
  }

  const screenshotPath = path.join(screenshotsDir, `${spec.key}.png`);
  try {
    await page.screenshot({ path: screenshotPath, fullPage: true });
  } catch {
    // Ignore screenshot failures.
  }

  const normalizedBodyFontFamily = normalizeFontFamily(computed.bodyFontFamily);
  const normalizedFontSansVariable = normalizeFontFamily(computed.fontSansVariable);
  const expectedFontMatched = hasExpectedFont(normalizedBodyFontFamily, normalizedFontSansVariable);
  const fallbackOnlyBodyFont = isFallbackOnlyFont(normalizedBodyFontFamily);
  const failedFontRequests = pageFontRequests.filter((req) => req.status !== 200);

  return {
    key: spec.key,
    url,
    finalUrl: page.url(),
    screenshotPath: path.relative(process.cwd(), screenshotPath),
    computed: {
      ...computed,
      bodyFontFamily: normalizedBodyFontFamily,
      fontSansVariable: normalizedFontSansVariable,
    },
    expectedFontMatched,
    fallbackOnlyBodyFont,
    fontRequests: pageFontRequests,
    failedFontRequests,
    navigationError,
  };
}

async function main() {
  await fs.mkdir(artifactsDir, { recursive: true });
  await fs.mkdir(screenshotsDir, { recursive: true });

  const buildFontAssets = await listBuildFontAssets();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  const pages = [];
  try {
    for (const spec of pageSpecs) {
      const page = await context.newPage();
      try {
        pages.push(await diagnosePage(page, spec));
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const allFontRequests = pages.flatMap((entry) => entry.fontRequests);
  const failedFontRequests = pages.flatMap((entry) => entry.failedFontRequests);
  const pagesWithFallbackOnly = pages.filter((entry) => entry.fallbackOnlyBodyFont);
  const nonLocalFontRequests = allFontRequests.filter((request) => {
    try {
      const requestUrl = new URL(request.url);
      const currentBaseUrl = new URL(baseUrl);
      return requestUrl.origin !== currentBaseUrl.origin;
    } catch {
      return true;
    }
  });
  const failReasons = [];
  if (!allFontRequests.length) {
    failReasons.push("No font requests were captured.");
  }
  if (pagesWithFallbackOnly.length) {
    failReasons.push(
      `Fallback-only body font-family detected on: ${pagesWithFallbackOnly.map((entry) => entry.key).join(", ")}`,
    );
  }
  if (failedFontRequests.length) {
    failReasons.push(`${failedFontRequests.length} font request(s) failed or returned non-200 status.`);
  }
  if (nonLocalFontRequests.length) {
    failReasons.push(`External font request(s) detected: ${nonLocalFontRequests.length}.`);
  }
  const pagesWithNavigationErrors = pages.filter((entry) => Boolean(entry.navigationError));
  if (pagesWithNavigationErrors.length) {
    failReasons.push(
      `Navigation failed on: ${pagesWithNavigationErrors.map((entry) => `${entry.key} (${entry.navigationError})`).join(", ")}`,
    );
  }

  const report = {
    createdAt: new Date().toISOString(),
    baseUrl,
    expectedFontTokens,
    buildFontAssets,
    pages,
    totals: {
      pages: pages.length,
      fontRequests: allFontRequests.length,
      failedFontRequests: failedFontRequests.length,
      externalFontRequests: nonLocalFontRequests.length,
    },
    failReasons,
    ok: failReasons.length === 0,
  };

  await fs.writeFile(reportJsonPath, JSON.stringify(report, null, 2), "utf8");
  await fs.writeFile(reportMdPath, makeMarkdown(report), "utf8");

  process.stdout.write(`Font report written: ${path.relative(process.cwd(), reportJsonPath)}\n`);
  process.stdout.write(`Font report written: ${path.relative(process.cwd(), reportMdPath)}\n`);
  if (!report.ok) {
    for (const reason of failReasons) {
      process.stderr.write(`FONT_DIAG_FAIL: ${reason}\n`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
