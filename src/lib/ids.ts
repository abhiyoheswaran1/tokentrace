import crypto from "node:crypto";

export function stableId(prefix: string, parts: Array<string | number | null | undefined>) {
  const hash = crypto
    .createHash("sha1")
    .update(parts.map((part) => String(part ?? "")).join("\u001f"))
    .digest("hex")
    .slice(0, 24);
  return `${prefix}_${hash}`;
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function hashContent(content: Buffer | string) {
  return crypto.createHash("sha256").update(content).digest("hex");
}
