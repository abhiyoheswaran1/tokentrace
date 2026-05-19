import { claudeCodeAdapter } from "./claude-code";
import { codexCliAdapter } from "./codex-cli";
import { cursorChatAdapter } from "./cursor-chat";
import { genericJsonAdapter } from "./generic-json";
import { genericJsonlAdapter } from "./generic-jsonl";
import { genericLogAdapter } from "./generic-log";
import { sqliteHistoryAdapter } from "./sqlite-history";
import { structuredUsageLogAdapter } from "./structured-usage-log";

export const adapters = [
  claudeCodeAdapter,
  codexCliAdapter,
  structuredUsageLogAdapter,
  cursorChatAdapter,
  sqliteHistoryAdapter,
  genericJsonlAdapter,
  genericJsonAdapter,
  genericLogAdapter
];

export type AdapterId = (typeof adapters)[number]["id"];
