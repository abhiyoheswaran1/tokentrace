import { describe, expect, it } from "vitest";
import packageJson from "@/package.json";
import { formatAppVersion, getAppVersion } from "@/src/lib/app-version";

describe("app version metadata", () => {
  it("reads the running version from package metadata", () => {
    expect(getAppVersion()).toBe(packageJson.version);
  });

  it("formats the version for compact UI surfaces", () => {
    expect(formatAppVersion("0.4.0")).toBe("v0.4.0");
  });
});
