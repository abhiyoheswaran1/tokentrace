import type { UnknownCostRepairCause } from "@/src/lib/repair-actions";
import type { UnknownCostRepairWorkbenchGroup } from "@/src/lib/unknown-cost-repair/types";

export type RepairKeyParts = Pick<UnknownCostRepairWorkbenchGroup, "cause" | "provider" | "tool" | "model" | "sourceFile">;

export function withQuery(path: string, params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function repairItemHref(key: string) {
  return withQuery("/repair", { key });
}

export function parseCauseFromKey(key: string) {
  const [cause] = key.split(":");
  return cause ?? "";
}

export function parseModelFromKey(key: string) {
  return key.split(":").at(-1) ?? "";
}

function causeKey(cause: string) {
  return cause.replace(/\s+/g, "-");
}

function encodeKeyPart(value: string) {
  return encodeURIComponent(value);
}

function decodeKeyPart(value: string) {
  return decodeURIComponent(value);
}

export function repairKey(row: RepairKeyParts) {
  return `repair:v1:${[
    row.cause,
    row.provider,
    row.tool,
    row.model,
    row.sourceFile
  ].map(encodeKeyPart).join(":")}`;
}

function legacyKeyPart(value: string) {
  return value.replaceAll(":", "_").trim() || "unknown";
}

function legacyToolKeyPart(value: string) {
  return legacyKeyPart(value).toLowerCase().replace(/\s+/g, "-");
}

export function legacyRepairKey(row: RepairKeyParts) {
  return [
    causeKey(row.cause),
    legacyKeyPart(row.provider),
    legacyToolKeyPart(row.tool),
    legacyKeyPart(row.model),
    row.sourceFile
  ].join(":");
}

export function parseRepairKey(key: string): RepairKeyParts | null {
  if (!key.startsWith("repair:v1:")) return null;
  let parts: string[];
  try {
    parts = key.slice("repair:v1:".length).split(":").map(decodeKeyPart);
  } catch {
    return null;
  }
  if (parts.length !== 5) return null;
  const [cause, provider, tool, model, sourceFile] = parts;
  if (
    cause === undefined ||
    provider === undefined ||
    tool === undefined ||
    model === undefined ||
    sourceFile === undefined
  ) {
    return null;
  }
  return {
    cause: cause as UnknownCostRepairCause,
    provider,
    tool,
    model,
    sourceFile
  };
}
