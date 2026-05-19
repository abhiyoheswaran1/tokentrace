import {
  asArray,
  asObject,
  firstString,
  readFileText,
  readTextSample,
  safeJsonParse
} from "./helpers";
import { buildSessionsFromRecords } from "./generic-records";
import type { AdapterParseResult, FileCandidate, IngestionAdapter } from "../types";

function conversationsFrom(value: unknown) {
  const root = asObject(value);
  if (!root) return [];
  return [
    ...asArray(root.conversations),
    ...asArray(root.chats),
    ...asArray(root.composerData),
    ...asArray(root.composers)
  ].filter((item): item is Record<string, unknown> => Boolean(asObject(item)));
}

function messagesFrom(conversation: Record<string, unknown>) {
  return [
    ...asArray(conversation.messages),
    ...asArray(conversation.bubbles),
    ...asArray(conversation.turns)
  ].filter((item): item is Record<string, unknown> => Boolean(asObject(item)));
}

function flattenCursorRecords(file: FileCandidate, parsed: unknown) {
  return conversationsFrom(parsed).flatMap((conversation, conversationIndex) => {
    const sessionId =
      firstString(conversation.id, conversation.session_id, conversation.conversationId) ??
      `cursor-session-${conversationIndex}`;
    const workspacePath = firstString(
      conversation.workspacePath,
      conversation.workspace_path,
      conversation.cwd,
      conversation.projectPath
    );
    const title = firstString(conversation.title, conversation.name, conversation.summary);

    return messagesFrom(conversation).map((message, messageIndex) => ({
      ...message,
      id: firstString(message.id, message.messageId) ?? `${sessionId}-${messageIndex}`,
      session_id: sessionId,
      conversation_id: sessionId,
      cwd: workspacePath,
      title,
      timestamp: message.createdAt ?? message.created_at ?? message.timestamp ?? file.modifiedTime?.toISOString(),
      model: message.modelName ?? message.model_name ?? message.model,
      content: message.text ?? message.content
    }));
  });
}

export const cursorChatAdapter: IngestionAdapter = {
  id: "cursor-chat-export",
  displayName: "Cursor Chat Export",
  version: 1,
  async detect(file: FileCandidate) {
    if (!/cursor|composer|chat/i.test(file.path) || !/\.json$/i.test(file.path)) {
      return { detected: false, confidence: 0 };
    }
    const parsed = safeJsonParse(await readTextSample(file.path));
    const conversations = conversationsFrom(parsed);
    const messageCount = conversations.reduce((count, conversation) => count + messagesFrom(conversation).length, 0);
    return messageCount > 0
      ? {
          detected: true,
          confidence: 0.94,
          reason: "Cursor-style chat/composer export with conversations and messages."
        }
      : { detected: false, confidence: 0 };
  },
  async parse(file: FileCandidate, context): Promise<AdapterParseResult> {
    const parsed = safeJsonParse(await readFileText(file.path));
    const records = flattenCursorRecords(file, parsed);
    if (!records.length) {
      return {
        sessions: [],
        warnings: [],
        errors: ["No Cursor conversation messages found."]
      };
    }
    return {
      sessions: buildSessionsFromRecords({
        file,
        records,
        provider: { id: "cursor", name: "Cursor", type: "ai-editor" },
        tool: { id: "cursor", name: "Cursor" },
        storeRawMessageContent: context.storeRawMessageContent
      }),
      warnings: [],
      errors: []
    };
  }
};
