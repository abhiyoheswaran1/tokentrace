export type FileCandidate = {
  path: string;
  modifiedTime: Date | null;
  sizeBytes: number;
  hash?: string;
};

export type IgnoredFileCandidate = FileCandidate & {
  ignoreReason: string;
};

export type DetectionResult = {
  detected: boolean;
  confidence: number;
  reason?: string;
};

export type NormalizedToolCall = {
  externalId?: string;
  name: string;
  status?: string | null;
  durationMs?: number | null;
  rawMetadata?: Record<string, unknown>;
};

export type NormalizedInteraction = {
  externalId?: string;
  timestamp?: Date | null;
  role: "user" | "assistant" | "system" | "tool" | "unknown";
  modelName?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cacheReadTokens?: number | null;
  cacheWriteTokens?: number | null;
  reasoningTokens?: number | null;
  totalTokens?: number | null;
  estimatedTokens?: boolean;
  tokenConfidence?:
    | "exact"
    | "tokenizer estimate"
    | "simple estimate"
    | "high-confidence estimate"
    | "low-confidence estimate"
    | "unknown";
  costUsd?: number | null;
  costEstimated?: boolean;
  latencyMs?: number | null;
  rawText?: string | null;
  rawTextPreview?: string | null;
  rawMetadata?: Record<string, unknown>;
  toolCalls?: NormalizedToolCall[];
};

export type NormalizedSession = {
  externalId?: string;
  provider: {
    id: string;
    name: string;
    type: string;
  };
  tool: {
    id: string;
    name: string;
  };
  projectPath?: string | null;
  projectName?: string | null;
  startedAt?: Date | null;
  endedAt?: Date | null;
  title?: string | null;
  sourceFile: string;
  rawMetadata?: Record<string, unknown>;
  interactions: NormalizedInteraction[];
};

export type AdapterParseResult = {
  sessions: NormalizedSession[];
  warnings: string[];
  errors: string[];
};

export type ParseContext = {
  storeRawMessageContent: boolean;
};

export interface IngestionAdapter {
  id: string;
  displayName: string;
  version?: number;
  detect(file: FileCandidate): Promise<DetectionResult>;
  parse(file: FileCandidate, context: ParseContext): Promise<AdapterParseResult>;
}
