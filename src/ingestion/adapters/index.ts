import { claudeCodeAdapter } from "./claude-code";
import { codexCliAdapter } from "./codex-cli";
import { genericJsonAdapter } from "./generic-json";
import { genericJsonlAdapter } from "./generic-jsonl";
import { genericLogAdapter } from "./generic-log";
import { sqliteHistoryAdapter } from "./sqlite-history";

export const adapters = [
  claudeCodeAdapter,
  codexCliAdapter,
  sqliteHistoryAdapter,
  genericJsonlAdapter,
  genericJsonAdapter,
  genericLogAdapter
];

export type AdapterId = (typeof adapters)[number]["id"];
