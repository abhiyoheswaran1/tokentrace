import { agentDiscoveryResponse } from "@/src/lib/agent-discovery-api";

export const dynamic = "force-dynamic";

export async function GET() {
  return agentDiscoveryResponse();
}
