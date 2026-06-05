import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadRoute() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-prices-refresh-api-"));
  tempDirs.push(dir);
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  delete process.env.TOKENTRACE_DISABLE_PRICE_REFRESH;
  delete process.env.TOKENTRACE_PRICING_MANIFEST_URL;
  vi.resetModules();
  const [route, pricing, { sqlite }] = await Promise.all([
    import("@/app/api/prices/refresh/route"),
    import("@/src/lib/pricing"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...route, ...pricing, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  vi.unstubAllGlobals();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/prices/refresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("/api/prices/refresh", () => {
  it("POST imports the bundled manifest without touching the network", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { POST, getPricingRows } = await loadRoute();

    const response = await POST(jsonRequest({ source: "bundled" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("bundled");
    expect(body.url).toBeNull();
    expect(body.error).toBeNull();
    expect(body.imported).toBeGreaterThan(0);
    expect(getPricingRows().length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("POST falls back to the bundled manifest when the remote request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network offline")));
    const { POST, getPricingRows } = await loadRoute();

    const response = await POST(jsonRequest({ source: "remote" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("bundled");
    expect(body.url).toBeNull();
    expect(body.error).toContain("network offline");
    expect(body.imported).toBeGreaterThan(0);
    expect(getPricingRows().length).toBeGreaterThan(0);
  });

  it("POST rejects malformed JSON without importing rates", async () => {
    const { POST, getPricingRows } = await loadRoute();

    const response = await POST(
      new Request("http://localhost/api/prices/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not-json"
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "request body must be valid JSON" });
    expect(getPricingRows()).toEqual([]);
  });

  it("POST rejects unsupported sources without importing rates", async () => {
    const { POST, getPricingRows } = await loadRoute();

    const response = await POST(jsonRequest({ source: "bundle" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "source must be remote or bundled" });
    expect(getPricingRows()).toEqual([]);
  });
});
