export type InferredProvider = {
  id: string;
  name: string;
};

const knownProviders: InferredProvider[] = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "google", name: "Google" },
  { id: "xai", name: "xAI" },
  { id: "deepseek", name: "DeepSeek" },
  { id: "mistral", name: "Mistral AI" },
  { id: "cohere", name: "Cohere" }
];

export function inferProviderFromModel(modelName: string | null | undefined): InferredProvider | null {
  const model = modelName?.trim().toLowerCase();
  if (!model) return null;

  if (/^(gpt(?:[-0-9]|$)|o[0-9](?:-|$)|codex(?:-|$)|chatgpt(?:-|$))/.test(model)) {
    return knownProviders[0];
  }
  if (/^(claude|anthropic)\b/.test(model)) return knownProviders[1];
  if (/^(gemini|learnlm)\b/.test(model)) return knownProviders[2];
  if (/^(grok|xai)\b/.test(model)) return knownProviders[3];
  if (/^deepseek\b/.test(model)) return knownProviders[4];
  if (/^(mistral|ministral|magistral|codestral|devstral|pixtral|voxtral)\b/.test(model)) {
    return knownProviders[5];
  }
  if (/^(command|aya|cohere)\b/.test(model)) return knownProviders[6];

  return null;
}
