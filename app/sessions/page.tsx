import { SessionExplorer } from "@/components/session-explorer";
import { PageHeader } from "@/components/ui/typography";
import { getAnalyticsData } from "@/src/lib/analytics";

export const dynamic = "force-dynamic";

export default async function SessionsPage({
  searchParams
}: {
  searchParams?: Promise<{ project?: string }>;
}) {
  const params = await searchParams;
  const data = getAnalyticsData();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Session Explorer"
        description="Search and filter imported sessions by tool, model, project, cost, and estimation status."
      />
      <SessionExplorer sessions={data.sessions} initialProject={params?.project} />
    </div>
  );
}
