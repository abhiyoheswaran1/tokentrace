import { randomUUID } from "node:crypto";
import { prepareCached } from "@/src/db/prepared";

export type ModelAliasRule = "exact-model" | "family-fragment" | "parser-source";

export type ModelAliasInput = {
  providerId: string;
  observedModel: string;
  pricedModelId: string;
  confidence: number;
  rule: ModelAliasRule;
  notes?: string | null;
};

export type ModelAlias = {
  id: string;
  providerId: string;
  observedModel: string;
  pricedModelId: string;
  confidence: number;
  rule: ModelAliasRule;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
};

export type ModelAliasView = ModelAlias & {
  pricedModelName: string;
  providerName: string;
};

function row(input: Record<string, unknown>): ModelAlias {
  return {
    id: String(input.id),
    providerId: String(input.provider_id),
    observedModel: String(input.observed_model),
    pricedModelId: String(input.priced_model_id),
    confidence: Number(input.confidence ?? 0),
    rule: String(input.rule) as ModelAliasRule,
    notes: input.notes == null ? null : String(input.notes),
    createdAt: Number(input.created_at ?? 0),
    updatedAt: Number(input.updated_at ?? 0)
  };
}

function viewRow(input: Record<string, unknown>): ModelAliasView {
  return {
    ...row(input),
    pricedModelName: String(input.priced_model_name ?? ""),
    providerName: String(input.provider_name ?? "")
  };
}

function pricedModelExists(pricedModelId: string): boolean {
  const result = prepareCached("SELECT 1 FROM models WHERE id = ? LIMIT 1").get(pricedModelId);
  return Boolean(result);
}

export function upsertAlias(input: ModelAliasInput): ModelAlias {
  if (!pricedModelExists(input.pricedModelId)) {
    throw new Error(`Cannot create alias: priced model ${input.pricedModelId} does not exist.`);
  }

  const now = Date.now();
  const existing = prepareCached(
    "SELECT * FROM model_aliases WHERE provider_id = ? AND observed_model = ?"
  ).get(input.providerId, input.observedModel) as Record<string, unknown> | undefined;

  if (existing) {
    prepareCached(
      `UPDATE model_aliases
       SET priced_model_id = ?, confidence = ?, rule = ?, notes = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      input.pricedModelId,
      input.confidence,
      input.rule,
      input.notes ?? null,
      now,
      String(existing.id)
    );
    return row({
      ...existing,
      priced_model_id: input.pricedModelId,
      confidence: input.confidence,
      rule: input.rule,
      notes: input.notes ?? null,
      updated_at: now
    });
  }

  const id = `alias-${randomUUID()}`;
  prepareCached(
    `INSERT INTO model_aliases
       (id, provider_id, observed_model, priced_model_id, confidence, rule, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.providerId,
    input.observedModel,
    input.pricedModelId,
    input.confidence,
    input.rule,
    input.notes ?? null,
    now,
    now
  );

  return row({
    id,
    provider_id: input.providerId,
    observed_model: input.observedModel,
    priced_model_id: input.pricedModelId,
    confidence: input.confidence,
    rule: input.rule,
    notes: input.notes ?? null,
    created_at: now,
    updated_at: now
  });
}

export function listAliases(): ModelAliasView[] {
  const rows = prepareCached(
    `SELECT
       a.*,
       m.name AS priced_model_name,
       COALESCE(p.name, a.provider_id) AS provider_name
     FROM model_aliases a
     JOIN models m ON m.id = a.priced_model_id
     LEFT JOIN providers p ON p.id = a.provider_id
     ORDER BY a.updated_at DESC`
  ).all() as Array<Record<string, unknown>>;
  return rows.map(viewRow);
}

export function getAlias(providerId: string, observedModel: string): ModelAliasView | null {
  const found = prepareCached(
    `SELECT
       a.*,
       m.name AS priced_model_name,
       COALESCE(p.name, a.provider_id) AS provider_name
     FROM model_aliases a
     JOIN models m ON m.id = a.priced_model_id
     LEFT JOIN providers p ON p.id = a.provider_id
     WHERE a.provider_id = ? AND a.observed_model = ?
     LIMIT 1`
  ).get(providerId, observedModel) as Record<string, unknown> | undefined;
  return found ? viewRow(found) : null;
}

export function deleteAlias(providerId: string, observedModel: string): boolean {
  const result = prepareCached(
    "DELETE FROM model_aliases WHERE provider_id = ? AND observed_model = ?"
  ).run(providerId, observedModel) as { changes: number };
  return result.changes > 0;
}
