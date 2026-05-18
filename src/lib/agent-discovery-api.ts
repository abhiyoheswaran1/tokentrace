import { NextResponse } from "next/server";
import { getAppVersion } from "@/src/lib/app-version";
import { buildAgentDiscoveryManifest } from "@/src/lib/agent-discovery";

export function agentDiscoveryResponse() {
  return NextResponse.json(buildAgentDiscoveryManifest({ version: getAppVersion() }), {
    headers: {
      "cache-control": "no-store"
    }
  });
}
