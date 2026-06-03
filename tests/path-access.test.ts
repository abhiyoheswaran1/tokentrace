import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PathAccessError, resolveReadablePath } from "@/src/lib/path-access";

const tempDirs: string[] = [];

async function tempDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-path-access-"));
  tempDirs.push(dir);
  // realpath so comparisons survive macOS /var -> /private/var symlinking.
  return fs.realpath(dir);
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("resolveReadablePath", () => {
  it("resolves a file inside the OS temp dir (an allowed root)", async () => {
    const dir = await tempDir();
    const file = path.join(dir, "usage.jsonl");
    await fs.writeFile(file, "{}\n");

    const resolved = await resolveReadablePath(file);
    expect(resolved).toBe(await fs.realpath(file));
  });

  it("resolves a file inside an explicitly configured extra root", async () => {
    const dir = await tempDir();
    const sub = path.join(dir, "nested");
    await fs.mkdir(sub);
    const file = path.join(sub, "log.json");
    await fs.writeFile(file, "{}");

    const resolved = await resolveReadablePath(file, { extraRoots: [dir] });
    expect(resolved).toBe(await fs.realpath(file));
  });

  it("rejects a relative path", async () => {
    await expect(resolveReadablePath("relative/path.json")).rejects.toMatchObject({
      code: "invalid"
    });
  });

  it("rejects an empty path", async () => {
    await expect(resolveReadablePath("   ")).rejects.toBeInstanceOf(PathAccessError);
  });

  it("reports not_found for a non-existent absolute path inside a root", async () => {
    const dir = await tempDir();
    await expect(resolveReadablePath(path.join(dir, "missing.json"))).rejects.toMatchObject({
      code: "not_found"
    });
  });

  it("forbids reading a system file outside all allowed roots", async () => {
    // /etc/hosts exists on macOS/Linux and is outside home/temp/configured roots.
    await expect(resolveReadablePath("/etc/hosts")).rejects.toMatchObject({
      code: "forbidden"
    });
  });

  it("blocks a symlink that escapes the allowed roots", async () => {
    const dir = await tempDir();
    const link = path.join(dir, "escape.json");
    try {
      await fs.symlink("/etc/hosts", link);
    } catch {
      return; // environment without symlink permission; nothing to assert
    }
    await expect(resolveReadablePath(link)).rejects.toMatchObject({ code: "forbidden" });
  });
});
