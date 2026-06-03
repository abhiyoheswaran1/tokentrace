import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getAppSettings } from "@/src/db/settings";
import { adapters } from "@/src/ingestion/adapters";
import type { FileCandidate, NormalizedInteraction } from "@/src/ingestion/types";
import { PathAccessError, pathAccessStatus, resolveReadablePath } from "@/src/lib/path-access";

export const dynamic = "force-dynamic";

type PreviewBody = {
  path?: unknown;
  parserId?: unknown;
};

export async function POST(request: Request) {
  let body: PreviewBody;
  try {
    body = (await request.json()) as PreviewBody;
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const requestedPath = typeof body.path === "string" ? body.path.trim() : "";
  const parserId = typeof body.parserId === "string" ? body.parserId.trim() : "";

  if (!requestedPath) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }
  if (!parserId) {
    return NextResponse.json({ error: "parserId is required" }, { status: 400 });
  }

  const adapter = adapters.find((candidate) => candidate.id === parserId);
  if (!adapter) {
    return NextResponse.json(
      { error: `parser ${parserId} is not registered` },
      { status: 404 }
    );
  }

  let filePath: string;
  try {
    filePath = await resolveReadablePath(requestedPath, {
      extraRoots: getAppSettings().customFolders
    });
  } catch (error) {
    if (error instanceof PathAccessError) {
      return NextResponse.json({ error: error.message }, { status: pathAccessStatus(error.code) });
    }
    return NextResponse.json({ error: `file not found: ${requestedPath}` }, { status: 404 });
  }

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return NextResponse.json({ error: `file not found: ${requestedPath}` }, { status: 404 });
  }

  const candidate: FileCandidate = {
    path: filePath,
    sizeBytes: stat.size,
    modifiedTime: stat.mtime
  };

  let parseResult;
  try {
    parseResult = await adapter.parse(candidate, { storeRawMessageContent: false });
  } catch (error) {
    return NextResponse.json(
      {
        error: `parser ${parserId} threw while parsing: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      },
      { status: 422 }
    );
  }

  const allInteractions: NormalizedInteraction[] = parseResult.sessions.flatMap(
    (session) => session.interactions
  );
  const predictedTotalTokens = allInteractions.reduce(
    (sum, interaction) => sum + (interaction.totalTokens ?? 0),
    0
  );

  return NextResponse.json({
    parserId,
    path: filePath,
    sessions: parseResult.sessions.map((session) => ({
      externalId: session.externalId,
      provider: session.provider,
      tool: session.tool,
      interactionCount: session.interactions.length,
      totalTokens: session.interactions.reduce(
        (sum, interaction) => sum + (interaction.totalTokens ?? 0),
        0
      )
    })),
    predictedInteractions: allInteractions.length,
    predictedTotalTokens,
    warnings: parseResult.warnings,
    errors: parseResult.errors
  });
}
