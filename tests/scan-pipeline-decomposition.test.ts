import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("scan pipeline decomposition", () => {
  it("keeps runScan focused on orchestration by importing file, adapter, and result helpers", () => {
    const scan = read("src/ingestion/scan.ts");

    expect(scan).toContain('from "./scan-files"');
    expect(scan).toContain('from "./scan-adapters"');
    expect(scan).toContain('from "./scan-results"');
    expect(scan).toContain("insertScanFile");
    expect(scan).toContain("selectAdapter");
    expect(scan).toContain("buildRunScanResult");
  });

  it("moves scan-file recording, adapter selection, and result finalization into focused modules", () => {
    expect(read("src/ingestion/scan-files.ts")).toContain("export function insertScanFile");
    expect(read("src/ingestion/scan-files.ts")).toContain("export function hasImportedFile");
    expect(read("src/ingestion/scan-adapters.ts")).toContain("export async function selectAdapter");
    expect(read("src/ingestion/scan-adapters.ts")).toContain("export async function hashFile");
    expect(read("src/ingestion/scan-results.ts")).toContain("export function purgeStaleNonUsageSessions");
    expect(read("src/ingestion/scan-results.ts")).toContain("export function buildRunScanResult");
  });
});
