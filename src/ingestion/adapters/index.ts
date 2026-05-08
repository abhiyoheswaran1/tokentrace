import { claudeCodeAdapter } from "./claude-code";
import { codexCliAdapter } from "./codex-cli";
import { genericJsonAdapter } from "./generic-json";
import { genericJsonlAdapter } from "./generic-jsonl";
import { genericLogAdapter } from "./generic-log";

export const adapters = [
  claudeCodeAdapter,
  codexCliAdapter,
  genericJsonlAdapter,
  genericJsonAdapter,
  genericLogAdapter
];

export type AdapterId = (typeof adapters)[number]["id"];
