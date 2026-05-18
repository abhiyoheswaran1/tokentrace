import { getDatabasePath, sqlite } from "@/src/db/client";
import { seedDatabase } from "@/src/db/seed";

const dbPath = getDatabasePath();
const dayMs = 24 * 60 * 60 * 1000;
const latestDay = Date.UTC(2026, 4, 18, 12, 0, 0);

if (process.env.TOKENTRACE_DEMO_SEED !== "1" || !dbPath.includes("tokentrace-screenshots")) {
  throw new Error("Refusing to seed screenshot data unless TOKENTRACE_DEMO_SEED=1 and TOKENTRACE_DB points at a tokentrace-screenshots path.");
}

function json(value: unknown) {
  return JSON.stringify(value);
}

function dateId(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function repairKey(parts: {
  cause: string;
  provider: string;
  tool: string;
  model: string;
  sourceFile: string;
}) {
  return `repair:v1:${[
    parts.cause,
    parts.provider,
    parts.tool,
    parts.model,
    parts.sourceFile
  ].map(encodeURIComponent).join(":")}`;
}

function resetDemoDatabase() {
  sqlite.exec(`
    PRAGMA foreign_keys = OFF;
    DELETE FROM tool_calls;
    DELETE FROM interactions;
    DELETE FROM sessions;
    DELETE FROM projects;
    DELETE FROM scan_files;
    DELETE FROM scan_runs;
    DELETE FROM unknown_cost_reviews;
    DELETE FROM saved_views;
    DELETE FROM settings;
    DELETE FROM models;
    DELETE FROM tools;
    DELETE FROM providers;
    PRAGMA foreign_keys = ON;
  `);
}

function priceFor(modelId: string | null) {
  if (!modelId) return null;
  return sqlite.prepare(`
    SELECT input_token_price AS inputPrice,
      output_token_price AS outputPrice,
      cached_input_token_price AS cachedInputPrice,
      cache_write_token_price AS cacheWritePrice
    FROM models
    WHERE id = ?
  `).get(modelId) as {
    inputPrice: number | null;
    outputPrice: number | null;
    cachedInputPrice: number | null;
    cacheWritePrice: number | null;
  } | undefined ?? null;
}

function estimateCost(tokens: {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}, modelId: string | null) {
  const price = priceFor(modelId);
  if (!price || price.inputPrice == null || price.outputPrice == null) return null;
  return (
    (tokens.input / 1_000_000) * price.inputPrice
    + (tokens.output / 1_000_000) * price.outputPrice
    + (tokens.cacheRead / 1_000_000) * (price.cachedInputPrice ?? price.inputPrice)
    + (tokens.cacheWrite / 1_000_000) * (price.cacheWritePrice ?? price.inputPrice)
  );
}

const insertProject = sqlite.prepare(`
  INSERT INTO projects (id, name, path)
  VALUES (?, ?, ?)
`);

const insertSession = sqlite.prepare(`
  INSERT INTO sessions (id, source_id, tool_id, project_id, started_at, ended_at, title, source_file, raw_metadata)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertInteraction = sqlite.prepare(`
  INSERT INTO interactions (
    id,
    source_id,
    session_id,
    timestamp,
    role,
    model_id,
    input_tokens,
    output_tokens,
    cache_read_tokens,
    cache_write_tokens,
    reasoning_tokens,
    total_tokens,
    estimated_tokens,
    token_confidence,
    cost,
    cost_estimated,
    latency_ms,
    raw_text_preview,
    raw_text,
    raw_metadata
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertToolCall = sqlite.prepare(`
  INSERT INTO tool_calls (id, interaction_id, name, status, duration_ms, raw_metadata)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertModel = sqlite.prepare(`
  INSERT INTO models (
    id,
    provider_id,
    name,
    input_token_price,
    output_token_price,
    cached_input_token_price,
    cache_write_token_price,
    currency,
    effective_from,
    raw_metadata
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertScanRun = sqlite.prepare(`
  INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertScanFile = sqlite.prepare(`
  INSERT INTO scan_files (
    id,
    scan_run_id,
    path,
    modified_time,
    size_bytes,
    file_hash,
    parser,
    status,
    records_imported,
    warnings,
    errors,
    raw_metadata
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertRepairReview = sqlite.prepare(`
  INSERT INTO unknown_cost_reviews (key, source_file, model, cause, status, notes, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

function addInteraction(input: {
  id: string;
  sessionId: string;
  timestamp: number;
  modelId: string | null;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  reasoning: number;
  confidence?: "exact" | "estimated" | "unknown";
  forceUnknownCost?: boolean;
  toolCall?: string;
}) {
  const total = input.input + input.output + input.cacheRead + input.cacheWrite + input.reasoning;
  const cost = input.forceUnknownCost ? null : estimateCost(input, input.modelId);
  insertInteraction.run(
    input.id,
    `demo:${input.id}`,
    input.sessionId,
    input.timestamp,
    "assistant",
    input.modelId,
    input.input,
    input.output,
    input.cacheRead,
    input.cacheWrite,
    input.reasoning,
    total,
    input.confidence === "estimated" ? 1 : 0,
    input.confidence ?? "exact",
    cost,
    input.confidence === "estimated" ? 1 : 0,
    1200 + (input.id.length % 9) * 350,
    null,
    null,
    json({
      fixture: "README screenshot",
      visiblePurpose: "Synthetic public-safe analytics data"
    })
  );

  if (input.toolCall) {
    insertToolCall.run(
      `${input.id}:tool`,
      input.id,
      input.toolCall,
      "success",
      450 + (input.id.length % 5) * 120,
      json({ fixture: "README screenshot" })
    );
  }
}

function addSession(input: {
  id: string;
  toolId: string;
  projectId: string;
  timestamp: number;
  title: string;
  sourceFile: string;
}) {
  insertSession.run(
    input.id,
    `demo:${input.id}`,
    input.toolId,
    input.projectId,
    input.timestamp,
    input.timestamp + 42 * 60 * 1000,
    input.title,
    input.sourceFile,
    json({ fixture: "README screenshot", safePath: true })
  );
}

function activeDay(offset: number) {
  return ![2, 8, 19, 31, 44, 57, 73].includes(offset) && offset % 13 !== 6;
}

resetDemoDatabase();
seedDatabase();

sqlite.transaction(() => {
  insertModel.run(
    "anthropic-demo-research-preview",
    "anthropic",
    "claude-research-preview",
    null,
    null,
    null,
    null,
    "USD",
    Date.UTC(2026, 4, 1),
    json({
      fixture: "README screenshot",
      note: "Intentionally missing rates so the Repair page has public-safe work to show."
    })
  );

  insertProject.run("project-tokentrace", "TokenTrace", "/home/demo/work/tokentrace");
  insertProject.run("project-endpointos", "EndpointOS", "/home/demo/work/endpointos");
  insertProject.run("project-brand-site", "Brand Site", "/home/demo/work/brand-site");

  const scanFiles = new Map<string, { status: string; parser: string; records: number; warnings: string[]; errors: string[]; reason: string }>();
  let importedRecords = 0;

  for (let offset = 89; offset >= 0; offset -= 1) {
    if (!activeDay(offset)) continue;
    const timestamp = latestDay - offset * dayMs;
    const date = dateId(timestamp);
    const sessionCount = offset < 30 ? 2 + (offset % 3 === 0 ? 1 : 0) : 1 + (offset % 5 === 0 ? 1 : 0);

    for (let sessionIndex = 0; sessionIndex < sessionCount; sessionIndex += 1) {
      const projectId = sessionIndex % 3 === 0 ? "project-tokentrace" : sessionIndex % 3 === 1 ? "project-endpointos" : "project-brand-site";
      const toolId = sessionIndex % 2 === 0 ? "claude-code" : "codex-cli";
      const sourceRoot = toolId === "claude-code" ? ".claude" : ".codex";
      const sourceFile = `/home/demo/${sourceRoot}/projects/${projectId}/${date}-${sessionIndex}.jsonl`;
      const sessionId = `session-${date}-${sessionIndex}`;
      const title = sessionIndex % 2 === 0 ? "Implement analytics polish" : "Review local cost evidence";
      addSession({ id: sessionId, toolId, projectId, timestamp: timestamp + sessionIndex * 60 * 60 * 1000, title, sourceFile });

      const spike =
        [4, 13, 24].includes(offset) ? 4_200_000
          : [6, 27].includes(offset) ? 2_400_000
            : offset < 30 ? 1_100_000
              : offset < 60 ? 520_000
                : 260_000;
      const wave = Math.max(0, Math.sin((offset + sessionIndex) / 3) * 700_000);
      const total = Math.round(spike + wave + sessionIndex * 240_000);
      const tokens = {
        input: Math.round(total * 0.12),
        output: Math.round(total * 0.07),
        cacheRead: Math.round(total * 0.69),
        cacheWrite: Math.round(total * 0.09),
        reasoning: Math.round(total * 0.03)
      };
      const modelId = toolId === "claude-code" ? "anthropic-claude-opus-4-7" : "openai-gpt-5-4-mini";
      addInteraction({
        id: `interaction-${date}-${sessionIndex}`,
        sessionId,
        timestamp: timestamp + sessionIndex * 60 * 60 * 1000 + 15 * 60 * 1000,
        modelId,
        ...tokens,
        confidence: sessionIndex % 5 === 0 ? "estimated" : "exact",
        toolCall: sessionIndex % 3 === 0 ? "Edit" : undefined
      });
      importedRecords += 1;
      scanFiles.set(sourceFile, {
        status: "imported",
        parser: toolId === "claude-code" ? "claude-code-jsonl" : "codex-session-jsonl",
        records: 1,
        warnings: [],
        errors: [],
        reason: "Imported usage transcript."
      });
    }
  }

  const repairItems = [
    {
      id: "missing-rate",
      dateOffset: 4,
      toolId: "claude-code",
      projectId: "project-tokentrace",
      sourceFile: "/home/demo/.claude/projects/project-tokentrace/missing-rate.jsonl",
      modelId: "anthropic-demo-research-preview",
      cause: "missing pricing",
      provider: "Anthropic",
      tool: "Claude Code",
      model: "claude-research-preview",
      status: "unresolved",
      note: "Needs a model rate before cost can be trusted.",
      tokens: { input: 180_000, output: 70_000, cacheRead: 1_800_000, cacheWrite: 220_000, reasoning: 50_000 },
      scanStatus: "imported",
      parser: "claude-code-jsonl",
      reason: "Imported usage with a model that has no configured rate."
    },
    {
      id: "missing-model",
      dateOffset: 10,
      toolId: "codex-cli",
      projectId: "project-brand-site",
      sourceFile: "/home/demo/.codex/projects/project-brand-site/missing-model.jsonl",
      modelId: null,
      cause: "missing model",
      provider: "OpenAI",
      tool: "Codex CLI",
      model: "unknown",
      status: "needs-parser-review",
      note: "Parser should recover the model name from source metadata.",
      tokens: { input: 120_000, output: 50_000, cacheRead: 880_000, cacheWrite: 90_000, reasoning: 30_000 },
      scanStatus: "imported_with_errors",
      parser: "codex-session-jsonl",
      reason: "Model field was absent in the source event."
    },
    {
      id: "parser-review",
      dateOffset: 16,
      toolId: "claude-code",
      projectId: "project-endpointos",
      sourceFile: "/home/demo/.claude/projects/project-endpointos/parser-review.jsonl",
      modelId: "anthropic-claude-opus-4-7",
      cause: "parser review",
      provider: "Anthropic",
      tool: "Claude Code",
      model: "claude-opus-4.7",
      status: "unresolved",
      note: "Review parser warning before marking resolved.",
      tokens: { input: 90_000, output: 42_000, cacheRead: 640_000, cacheWrite: 75_000, reasoning: 22_000 },
      scanStatus: "failed",
      parser: "claude-code-jsonl",
      reason: "Partial transcript caused a parser warning."
    }
  ];

  for (const item of repairItems) {
    const timestamp = latestDay - item.dateOffset * dayMs + 14 * 60 * 60 * 1000;
    const sessionId = `repair-${item.id}`;
    addSession({
      id: sessionId,
      toolId: item.toolId,
      projectId: item.projectId,
      timestamp,
      title: "Repair public-safe unknown cost",
      sourceFile: item.sourceFile
    });
    addInteraction({
      id: `interaction-${item.id}`,
      sessionId,
      timestamp: timestamp + 8 * 60 * 1000,
      modelId: item.modelId,
      ...item.tokens,
      confidence: item.modelId ? "exact" : "unknown",
      forceUnknownCost: true,
      toolCall: "Read"
    });
    importedRecords += 1;
    scanFiles.set(item.sourceFile, {
      status: item.scanStatus,
      parser: item.parser,
      records: item.scanStatus === "failed" ? 0 : 1,
      warnings: item.scanStatus === "imported_with_errors" ? ["Model name missing in source event."] : [],
      errors: item.scanStatus === "failed" ? ["Partial transcript could not be fully parsed."] : [],
      reason: item.reason
    });
    insertRepairReview.run(
      repairKey({
        cause: item.cause,
        provider: item.provider,
        tool: item.tool,
        model: item.model,
        sourceFile: item.sourceFile
      }),
      item.sourceFile,
      item.model,
      item.cause,
      item.status,
      item.note,
      latestDay - 2 * dayMs,
      latestDay - dayMs
    );
  }

  const latestScanId = "scan-demo-latest";
  insertScanRun.run(
    "scan-demo-previous",
    latestDay - 7 * dayMs,
    latestDay - 7 * dayMs + 8 * 60 * 1000,
    28,
    Math.max(0, importedRecords - 18),
    json([]),
    json([])
  );
  insertScanRun.run(
    latestScanId,
    latestDay - 45 * 60 * 1000,
    latestDay - 35 * 60 * 1000,
    scanFiles.size + 4,
    importedRecords,
    json(["One parser warning is included for README screenshots."]),
    json([])
  );

  let scanIndex = 0;
  for (const [filePath, info] of scanFiles) {
    insertScanFile.run(
      `scan-file-${scanIndex}`,
      latestScanId,
      filePath,
      latestDay - (scanIndex % 20) * 60 * 60 * 1000,
      10_000 + (scanIndex % 13) * 700,
      `demo-hash-${scanIndex}`,
      info.parser,
      info.status,
      info.records,
      json(info.warnings),
      json(info.errors),
      json({
        parser: { version: "demo-1" },
        reason: info.reason,
        fixture: "README screenshot"
      })
    );
    scanIndex += 1;
  }

  [
    ["/home/demo/.claude/settings.json", "ignored_non_usage", "claude-settings", "Known Claude Code support file, not usage."],
    ["/home/demo/.codex/config.toml", "ignored_non_usage", "codex-config", "Known Codex support file, not usage."],
    ["/home/demo/Downloads/random.log", "skipped_unknown", "none", "Unknown file shape, kept out of usage totals."],
    ["/home/demo/.openai/usage/README.md", "skipped_duplicate", "openai-usage-json", "Duplicate usage source already imported."]
  ].forEach(([filePath, status, parser, reason]) => {
    insertScanFile.run(
      `scan-file-support-${scanIndex}`,
      latestScanId,
      filePath,
      latestDay - scanIndex * 10_000,
      2400,
      `demo-support-hash-${scanIndex}`,
      parser,
      status,
      0,
      json([]),
      json([]),
      json({ parser: { version: "demo-1" }, reason, fixture: "README screenshot" })
    );
    scanIndex += 1;
  });
})();

console.log(`Seeded public-safe TokenTrace screenshot data at ${dbPath}`);
