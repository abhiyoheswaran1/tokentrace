export type Confidence = "high" | "medium" | "low";

export type ToolEvidence = {
  label: string;
  command?: string[];
  tool?: string;
};

export type ToolEnvelope = {
  summary: string;
  confidence: Confidence;
  nextActions: string[];
  warnings: string[];
  evidence: ToolEvidence[];
  requiresHumanConfirmation: boolean;
  data: unknown;
};

export const protocolVersion = "2025-06-18";
export const registryName = "io.github.abhiyoheswaran1/tokentrace";
