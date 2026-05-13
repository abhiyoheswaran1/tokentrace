export type JsonObject = Record<string, unknown>;

export type JsonObjectResult =
  | { ok: true; body: JsonObject }
  | { ok: false; error: string };

async function readJsonObjectText(request: Request, allowEmpty: boolean): Promise<JsonObjectResult> {
  let text: string;

  try {
    text = await request.text();
  } catch {
    return { ok: false, error: "request body must be valid JSON" };
  }

  if (!text.trim()) {
    return allowEmpty
      ? { ok: true, body: {} }
      : { ok: false, error: "request body must be valid JSON" };
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false, error: "request body must be valid JSON" };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "request body must be a JSON object" };
  }

  return { ok: true, body: body as JsonObject };
}

export function readJsonObject(request: Request): Promise<JsonObjectResult> {
  return readJsonObjectText(request, false);
}

export function readOptionalJsonObject(request: Request): Promise<JsonObjectResult> {
  return readJsonObjectText(request, true);
}

export function jsonBooleanFlag(value: unknown) {
  return value === true;
}
