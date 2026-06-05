/**
 * Shared form-value helpers for the Settings domain hooks: optional positive
 * numeric limits and slug-style ids derived from user-entered names.
 */
export function parseLimitInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function slugifyId(prefix: string, value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${prefix}-${slug || fallback}`;
}
