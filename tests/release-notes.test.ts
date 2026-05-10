import { describe, expect, it } from "vitest";
import { extractChangelogSection } from "@/scripts/extract-release-notes.mjs";

const changelog = `# Changelog

## Unreleased

### Added

- Work in progress.

## [0.5.0] - 2026-05-10

### Added

- Package trust workflow.
- Usage intelligence.

### Fixed

- Scanner readability.

## [0.4.0] - 2026-05-09

### Added

- Previous release.
`;

describe("release notes extraction", () => {
  it("extracts the complete version changelog section", () => {
    const notes = extractChangelogSection(changelog, "0.5.0");

    expect(notes).toContain("## [0.5.0] - 2026-05-10");
    expect(notes).toContain("- Package trust workflow.");
    expect(notes).toContain("### Fixed");
    expect(notes).not.toContain("## [0.4.0]");
    expect(notes).not.toContain("## Unreleased");
  });

  it("accepts version tags with a leading v", () => {
    const notes = extractChangelogSection(changelog, "v0.5.0");

    expect(notes).toContain("## [0.5.0] - 2026-05-10");
  });

  it("fails loudly when release notes are missing", () => {
    expect(() => extractChangelogSection(changelog, "0.6.0")).toThrow(
      "No changelog section found for 0.6.0"
    );
  });
});
