import { SessionExplorer } from "@/components/session-explorer";
import { PageHeader } from "@/components/ui/typography";
import { getAnalyticsData } from "@/src/lib/analytics";

export const dynamic = "force-dynamic";

export default async function SessionsPage({
  searchParams
}: {
  searchParams?: Promise<{
    project?: string;
    tool?: string;
    model?: string;
    source?: string;
    cost?: "all" | "priced" | "unknown";
    cache?: string;
  }>;
}) {
  const params = await searchParams;
  const data = getAnalyticsData();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Session Explorer"
        description="Search and filter imported sessions by tool, model, project, cost, and estimation status."
      />
      <SessionExplorer
        sessions={data.sessions}
        initialProject={params?.project}
        initialTool={params?.tool}
        initialModel={params?.model}
        initialSource={params?.source}
        initialCost={params?.cost}
        initialCache={params?.cache === "1"}
      />
    </div>
  );
}
