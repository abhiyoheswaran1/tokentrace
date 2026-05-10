import { describe, expect, it } from "vitest";
import { getSupportMatrix, summarizeSupportMatrix } from "@/src/lib/support-matrix";

describe("support matrix", () => {
  it("marks primary CLI sources as stable or best-effort and non-CLI sources as unsupported", () => {
    const matrix = getSupportMatrix();

    expect(matrix).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "claude-code", level: "stable" }),
        expect.objectContaining({ id: "codex-cli", level: "best-effort" }),
        expect.objectContaining({ id: "known-support-files", level: "ignored" }),
        expect.objectContaining({ id: "desktop-apps", level: "unsupported" }),
        expect.objectContaining({ id: "network-capture", level: "unsupported" })
      ])
    );
  });

  it("summarizes support levels for Doctor and docs surfaces", () => {
    const summary = summarizeSupportMatrix(getSupportMatrix());

    expect(summary.stable).toBeGreaterThan(0);
    expect(summary.bestEffort).toBeGreaterThan(0);
    expect(summary.ignored).toBeGreaterThan(0);
    expect(summary.unsupported).toBeGreaterThan(0);
  });
});
