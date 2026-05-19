import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("route loading state", () => {
  it("shows a visible loading skeleton during server-rendered route transitions", () => {
    const source = read("app/loading.tsx");

    expect(source).toContain("role=\"status\"");
    expect(source).toContain("Loading local data");
    expect(source).toContain("animate-pulse");
    expect(source).toContain("aria-live=\"polite\"");
    expect(source).toContain("rounded-lg border bg-card");
    expect(source).toContain("Local database only");
    expect(source).toContain("No telemetry is sent while this view loads.");
  });
});
