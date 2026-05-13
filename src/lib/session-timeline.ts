import { sqlite } from "@/src/db/client";

export type SessionTimelineEventKind =
  | "interaction"
  | "model-change"
  | "token-spike"
  | "cache"
  | "tool-call"
  | "unknown-cost";

export type SessionTimelineEvent = {
  id: string;
  kind: SessionTimelineEventKind;
  timestamp: number | null;
  title: string;
  detail: string;
  interactionId: string | null;
  role: string | null;
  model: string | null;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  cost: number | null;
  costEstimated: boolean;
  tokenConfidence: string | null;
  rawTextHidden: boolean;
};

export type SessionTimeline = {
  session: {
    id: string;
    title: string | null;
    startedAt: number | null;
    endedAt: number | null;
    sourceFile: string;
    tool: string;
    provider: string;
    project: string;
    projectPath: string | null;
  };
  summary: {
    interactions: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    reasoningTokens: number;
    cost: number | null;
    unknownCostInteractions: number;
    models: string[];
    parser: string | null;
    parserStatus: string | null;
    parserConfidence: number | null;
    parserReason: string | null;
    toolCalls: number;
  };
  events: SessionTimelineEvent[];
};

type SessionRow = SessionTimeline["session"] & {
  parser: string | null;
  parserStatus: string | null;
  parserRawMetadata: string | null;
};

type InteractionRow = {
  id: string;
  timestamp: number | null;
  role: string;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  totalTokens: number;
  cost: number | null;
  costEstimated: 0 | 1;
  estimatedTokens: 0 | 1;
  tokenConfidence: string;
};

type ToolCallRow = {
  id: string;
  interactionId: string;
  name: string;
  status: string | null;
  durationMs: number | null;
};

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringMetadata(value: unknown, key: string) {
  if (!value || typeof value !== "object") return null;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.trim() ? candidate : null;
}

function numberMetadata(value: unknown, key: string) {
  if (!value || typeof value !== "object") return null;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
}

function eventBase(
  kind: SessionTimelineEventKind,
  interaction: InteractionRow,
  title: string,
  detail: string
): SessionTimelineEvent {
  return {
    id: `${kind}-${interaction.id}`,
    kind,
    timestamp: interaction.timestamp,
    title,
    detail,
    interactionId: interaction.id,
    role: interaction.role,
    model: interaction.model,
    totalTokens: number(interaction.totalTokens),
    inputTokens: number(interaction.inputTokens),
    outputTokens: number(interaction.outputTokens),
    cachedTokens: number(interaction.cacheReadTokens) + number(interaction.cacheWriteTokens),
    reasoningTokens: number(interaction.reasoningTokens),
    cost: interaction.cost == null ? null : number(interaction.cost),
    costEstimated: Boolean(interaction.costEstimated),
    tokenConfidence: interaction.tokenConfidence,
    rawTextHidden: true
  };
}

function modelList(interactions: InteractionRow[]) {
  return Array.from(new Set(interactions.map((row) => row.model).filter((model): model is string => Boolean(model))));
}

function spikeThreshold(interactions: InteractionRow[]) {
  if (!interactions.length) return Infinity;
  const average = interactions.reduce((sum, row) => sum + number(row.totalTokens), 0) / interactions.length;
  return Math.max(500, average * 2);
}

export function buildSessionTimeline(sessionId: string): SessionTimeline | null {
  const session = sqlite
    .prepare(
      `SELECT
        s.id,
        s.title,
        s.started_at AS startedAt,
        s.ended_at AS endedAt,
        s.source_file AS sourceFile,
        t.name AS tool,
        p.name AS provider,
        COALESCE(pr.name, 'Unassigned') AS project,
        pr.path AS projectPath,
        sf.parser AS parser,
        sf.status AS parserStatus,
        sf.raw_metadata AS parserRawMetadata
       FROM sessions s
       JOIN tools t ON t.id = s.tool_id
       JOIN providers p ON p.id = t.provider_id
       LEFT JOIN projects pr ON pr.id = s.project_id
       LEFT JOIN scan_files sf ON sf.id = (
         SELECT sf2.id
         FROM scan_files sf2
         JOIN scan_runs sr2 ON sr2.id = sf2.scan_run_id
         WHERE sf2.path = s.source_file
         ORDER BY sr2.started_at DESC
         LIMIT 1
       )
       WHERE s.id = ?`
    )
    .get(sessionId) as SessionRow | undefined;

  if (!session) return null;

  const interactions = sqlite
    .prepare(
      `SELECT
        i.id,
        i.timestamp,
        i.role,
        m.name AS model,
        i.input_tokens AS inputTokens,
        i.output_tokens AS outputTokens,
        i.cache_read_tokens AS cacheReadTokens,
        i.cache_write_tokens AS cacheWriteTokens,
        i.reasoning_tokens AS reasoningTokens,
        i.total_tokens AS totalTokens,
        i.cost,
        i.cost_estimated AS costEstimated,
        i.estimated_tokens AS estimatedTokens,
        i.token_confidence AS tokenConfidence
       FROM interactions i
       LEFT JOIN models m ON m.id = i.model_id
       WHERE i.session_id = ?
       ORDER BY COALESCE(i.timestamp, 0) ASC, i.id ASC`
    )
    .all(sessionId) as InteractionRow[];

  const toolCalls = sqlite
    .prepare(
      `SELECT id, interaction_id AS interactionId, name, status, duration_ms AS durationMs
       FROM tool_calls
       WHERE interaction_id IN (${interactions.length ? interactions.map(() => "?").join(",") : "''"})
       ORDER BY name ASC, id ASC`
    )
    .all(...interactions.map((row) => row.id)) as ToolCallRow[];
  const toolCallsByInteraction = new Map<string, ToolCallRow[]>();
  for (const call of toolCalls) {
    const current = toolCallsByInteraction.get(call.interactionId) ?? [];
    current.push(call);
    toolCallsByInteraction.set(call.interactionId, current);
  }

  const threshold = spikeThreshold(interactions);
  const events: SessionTimelineEvent[] = [];
  let previousModel: string | null = null;

  interactions.forEach((interaction, index) => {
    const currentModel = interaction.model ?? null;
    if (index > 0 && currentModel && previousModel && currentModel !== previousModel) {
      events.push(eventBase("model-change", interaction, "Model changed", `${previousModel} -> ${currentModel}`));
    }

    events.push(
      eventBase(
        "interaction",
        interaction,
        `${interaction.role} interaction`,
        `${number(interaction.totalTokens).toLocaleString()} processed tokens`
      )
    );

    if (number(interaction.totalTokens) > threshold) {
      events.push(
        eventBase(
          "token-spike",
          interaction,
          "Token spike",
          `${number(interaction.totalTokens).toLocaleString()} tokens is above this session's spike threshold.`
        )
      );
    }

    const cachedTokens = number(interaction.cacheReadTokens) + number(interaction.cacheWriteTokens);
    if (cachedTokens > 0) {
      events.push(
        eventBase(
          "cache",
          interaction,
          "Cache activity",
          `${number(interaction.cacheReadTokens).toLocaleString()} read, ${number(interaction.cacheWriteTokens).toLocaleString()} write`
        )
      );
    }

    for (const toolCall of toolCallsByInteraction.get(interaction.id) ?? []) {
      const detail = [
        toolCall.status ? `status ${toolCall.status}` : null,
        toolCall.durationMs != null ? `${toolCall.durationMs}ms` : null
      ].filter(Boolean).join(", ");
      events.push(eventBase("tool-call", interaction, toolCall.name, detail || "Tool call recorded"));
    }

    if (interaction.cost == null) {
      events.push(eventBase("unknown-cost", interaction, "Unknown cost", "Model pricing or usable token counts are missing."));
    }

    previousModel = currentModel ?? previousModel;
  });

  const parserMetadata = parseJson<Record<string, unknown>>(session.parserRawMetadata, {});
  const totalCost = interactions.reduce((sum, row) => sum + (row.cost == null ? 0 : number(row.cost)), 0);
  const hasPricedInteraction = interactions.some((row) => row.cost != null);

  return {
    session: {
      id: session.id,
      title: session.title,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      sourceFile: session.sourceFile,
      tool: session.tool,
      provider: session.provider,
      project: session.project,
      projectPath: session.projectPath
    },
    summary: {
      interactions: interactions.length,
      totalTokens: interactions.reduce((sum, row) => sum + number(row.totalTokens), 0),
      inputTokens: interactions.reduce((sum, row) => sum + number(row.inputTokens), 0),
      outputTokens: interactions.reduce((sum, row) => sum + number(row.outputTokens), 0),
      cachedTokens: interactions.reduce(
        (sum, row) => sum + number(row.cacheReadTokens) + number(row.cacheWriteTokens),
        0
      ),
      reasoningTokens: interactions.reduce((sum, row) => sum + number(row.reasoningTokens), 0),
      cost: hasPricedInteraction ? Number(totalCost.toFixed(6)) : null,
      unknownCostInteractions: interactions.filter((row) => row.cost == null).length,
      models: modelList(interactions),
      parser: session.parser,
      parserStatus: session.parserStatus,
      parserConfidence: numberMetadata(parserMetadata, "confidence"),
      parserReason: stringMetadata(parserMetadata, "reason"),
      toolCalls: toolCalls.length
    },
    events
  };
}
