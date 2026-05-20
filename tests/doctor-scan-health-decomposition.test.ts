import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Doctor and Scan Health decomposition", () => {
  it("keeps report builders backed by pure recommendation and health-rule modules", () => {
    const doctor = read("src/lib/doctor.ts");
    const scanHealth = read("src/lib/scan-health.ts");

    expect(doctor.trimEnd().split("\n").length).toBeLessThan(260);
    expect(scanHealth.trimEnd().split("\n").length).toBeLessThan(260);
    expect(doctor).toContain("@/src/lib/doctor-recommendations");
    expect(scanHealth).toContain("@/src/lib/scan-health-rules");

    const doctorRules = read("src/lib/doctor-recommendations.ts");
    expect(doctorRules).toContain("export function zeroImportExplanation");
    expect(doctorRules).toContain("export function buildDoctorRecommendations");
    expect(doctorRules).toContain("export function countStatus");

    const scanRules = read("src/lib/scan-health-rules.ts");
    expect(scanRules).toContain("export function buildScanFreshness");
    expect(scanRules).toContain("export function buildScanHealthStatus");
    expect(scanRules).toContain("export function buildScanHealthActions");
    expect(scanRules).toContain("export function groupScanNotes");
  });
});
