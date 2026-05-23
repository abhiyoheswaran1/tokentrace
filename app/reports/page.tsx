import { PageHeader } from "@/components/ui/typography";
import { SavedReportsPanel } from "@/components/reports/saved-reports-panel";
import { listSavedReports } from "@/src/lib/saved-reports-store";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const reports = listSavedReports();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Save reusable local report templates and replay them from the CLI."
      />
      <SavedReportsPanel initial={reports} />
    </div>
  );
}
