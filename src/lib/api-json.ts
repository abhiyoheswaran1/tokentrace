export type JsonObject = Record<string, unknown>;

export type JsonObjectResult =
  | { ok: true; body: JsonObject }
  | { ok: false; error: string };

export async function readJsonObject(request: Request): Promise<JsonObjectResult> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { ok: false, error: "request body must be valid JSON" };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "request body must be a JSON object" };
  }

  return { ok: true, body: body as JsonObject };
}
