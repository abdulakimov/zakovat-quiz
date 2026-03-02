import assert from "node:assert/strict";
import { getCanonicalBaseUrl } from "../src/lib/url";

function makeHeaders(values: Record<string, string | undefined>) {
  return {
    get(name: string) {
      const key = Object.keys(values).find((item) => item.toLowerCase() === name.toLowerCase());
      return key ? values[key] ?? null : null;
    },
  } as Pick<Headers, "get">;
}

function run() {
  process.env.PUBLIC_APP_URL = "https://example.com";
  assert.equal(
    getCanonicalBaseUrl(
      makeHeaders({
        "x-forwarded-proto": "http",
        "x-forwarded-host": "internal.local:3000",
      }),
    ),
    "https://example.com",
  );

  delete process.env.PUBLIC_APP_URL;
  assert.equal(
    getCanonicalBaseUrl(
      makeHeaders({
        "x-forwarded-proto": "https",
        "x-forwarded-host": "9935-89-236-218-41.ngrok-free.app",
      }),
    ),
    "https://9935-89-236-218-41.ngrok-free.app",
  );

  assert.equal(
    getCanonicalBaseUrl(
      makeHeaders({
        host: "localhost:3000",
      }),
    ),
    "http://localhost:3000",
  );

  assert.equal(
    getCanonicalBaseUrl(
      makeHeaders({
        "x-forwarded-proto": "https,http",
        "x-forwarded-host": "proxy.example.com,internal.local",
        host: "localhost:3000",
      }),
    ),
    "https://proxy.example.com",
  );

  assert.equal(
    getCanonicalBaseUrl(
      makeHeaders({
        "x-forwarded-proto": "https",
        host: "localhost:3000",
      }),
    ),
    "http://localhost:3000",
  );

  console.log("All URL origin tests passed.");
}

run();
