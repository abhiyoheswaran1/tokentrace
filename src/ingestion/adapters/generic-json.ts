import path from "node:path";
import { nonUsageFileReason } from "@/src/ingestion/path-classifier";
import { IngestionAdapter } from "../types";
import { buildSessionsFromRecords } from "./generic-records";
import { asArray, asObject, readFileText, readTextSample, safeJsonParse } from "./helpers";

function collectRecords(value: unknown): Record<string, unknown>[] {
  const object = asObject(value);
  if (Array.isArray(value)) {
    return value.map(asObject).filter((item): item is Record<string, unknown> => Boolean(item));
  }
  if (!object) return [];

  const sessions = asArray(object.sessions);
  if (sessions.length) {
    return sessions.flatMap((session, sessionIndex) => {
      const sessionObject = asObject(session);
      if (!sessionObject) return [];
      const messages = [
        ...asArray(sessionObject.messages),
        ...asArray(sessionObject.interactions),
        ...asArray(sessionObject.events)
      ];
      if (!messages.length) return [sessionObject];
      return messages
        .map(asObject)
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .map((message, messageIndex) => ({
          ...message,
          session_id:
            sessionObject.session_id ??
            sessionObject.sessionId ??
            sessionObject.id ??
            `session-${sessionIndex}`,
          cwd: message.cwd ?? sessionObject.cwd ?? sessionObject.project_path,
          title: message.title ?? sessionObject.title,
          id: message.id ?? `${sessionIndex}-${messageIndex}`
        }));
    });
  }

  const records = [
    ...asArray(object.messages),
    ...asArray(object.interactions),
    ...asArray(object.events),
    ...asArray(object.records)
  ];

  if (records.length) {
    return records.map(asObject).filter((item): item is Record<string, unknown> => Boolean(item));
  }

  return [object];
}

export const genericJsonAdapter: IngestionAdapter = {
  id: "generic-json",
  displayName: "Generic JSON",

  async detect(file) {
    if (path.extname(file.path).toLowerCase() !== ".json") {
      return { detected: false, confidence: 0 };
    }

    if (nonUsageFileReason(file.path)) {
      return { detected: false, confidence: 0 };
    }

    const sample = await readTextSample(file.path);
    const parsed = safeJsonParse(sample);
    return parsed
      ? { detected: true, confidence: 0.65, reason: "JSON extension and valid JSON sample" }
      : { detected: true, confidence: 0.35, reason: "JSON extension" };
  },

  async parse(file, context) {
    const warnings: string[] = [];
    const errors: string[] = [];
    const parsed = safeJsonParse(await readFileText(file.path));
    const records = collectRecords(parsed);

    if (!records.length) {
      errors.push("No usable JSON records were found.");
    }

    return {
      sessions: buildSessionsFromRecords({
        file,
        records,
        provider: { id: "generic", name: "Generic", type: "local-log" },
        tool: { id: "generic-json", name: "Generic JSON" },
        storeRawMessageContent: context.storeRawMessageContent
      }),
      warnings,
      errors
    };
  }
};
