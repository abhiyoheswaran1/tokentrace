import { sqlite } from "@/src/db/client";

export type AgentActionSurface = "cli" | "mcp";
export type AgentActionOutcome = "ok" | "error";

export type RecordAgentActionInput = {
  surface: AgentActionSurface;
  command: string;
  outcome: AgentActionOutcome;
  summary: string;
  payload?: Record<string, unknown>;
};

export type AgentAction = {
  id: number;
  ts: string;
  surface: AgentActionSurface;
  command: string;
  outcome: AgentActionOutcome;
  summary: string;
  payload: Record<string, unknown>;
};

type Row = {
  id: number;
  ts: number;
  surface: string;
  command: string;
  outcome: string;
  summary: string;
  payload: string;
};

const DEFAULT_MAX_ENTRIES = 500;
// Token-like strings: "sk-" / "Bearer " followed by 20+ id-safe chars.
const TOKEN_PATTERN = /(?:sk-|Bearer\s+|Bearer:\s*)[A-Za-z0-9_-]{20,}/g;

function logMax(): number {
  const raw = process.env.TOKENTRACE_AGENT_ACTION_LOG_MAX;
  if (!raw) return DEFAULT_MAX_ENTRIES;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_ENTRIES;
}

function redact(value: string): string {
  return value.replace(TOKEN_PATTERN, "[REDACTED]");
}

function redactPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      result[key] = redact(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = redactPayload(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function toRow(row: Row): AgentAction {
  let payload: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(row.payload);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      payload = parsed;
    }
  } catch {
    payload = {};
  }
  return {
    id: row.id,
    ts: new Date(row.ts).toISOString(),
    surface: row.surface as AgentActionSurface,
    command: row.command,
    outcome: row.outcome as AgentActionOutcome,
    summary: row.summary,
    payload
  };
}

export function recordAgentAction(input: RecordAgentActionInput): AgentAction {
  const max = logMax();
  const payload = input.payload ? redactPayload(input.payload) : {};
  const summary = redact(input.summary ?? "");
  const ts = Date.now();

  const result = sqlite
    .prepare(
      `INSERT INTO agent_actions (ts, surface, command, outcome, summary, payload)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(ts, input.surface, input.command, input.outcome, summary, JSON.stringify(payload));

  sqlite
    .prepare(
      `DELETE FROM agent_actions
       WHERE id IN (
         SELECT id FROM agent_actions
         ORDER BY ts DESC, id DESC
         LIMIT -1 OFFSET ?
       )`
    )
    .run(max);

  return {
    id: Number(result.lastInsertRowid),
    ts: new Date(ts).toISOString(),
    surface: input.surface,
    command: input.command,
    outcome: input.outcome,
    summary,
    payload
  };
}

export function safeRecordAgentAction(input: RecordAgentActionInput): void {
  try {
    recordAgentAction(input);
  } catch {
    // Best-effort: never let logging break the caller.
  }
}

export function listAgentActions(options: { limit?: number } = {}): AgentAction[] {
  const limit = options.limit && options.limit > 0 ? options.limit : 500;
  const rows = sqlite
    .prepare(
      `SELECT id, ts, surface, command, outcome, summary, payload
       FROM agent_actions
       ORDER BY ts DESC, id DESC
       LIMIT ?`
    )
    .all(limit) as Row[];
  return rows.map(toRow);
}
