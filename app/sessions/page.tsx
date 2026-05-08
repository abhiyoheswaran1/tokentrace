import { SessionExplorer } from "@/components/session-explorer";
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
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Session Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Search and filter imported sessions by tool, model, project, cost, and estimation status.
        </p>
      </div>
      <SessionExplorer sessions={data.sessions} initialProject={params?.project} />
    </div>
  );
}
