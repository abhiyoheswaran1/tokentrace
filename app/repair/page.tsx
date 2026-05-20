import Link from "next/link";
import { Search, Settings2 } from "lucide-react";
import { PeriodFilter } from "@/components/period-filter";
import { FocusedRepairPanel, RepairFlowSteps, RepairGuidancePanel } from "@/components/repair/repair-guidance";
import { RepairItemsTable } from "@/components/repair/repair-items-table";
import { RepairSummaryCard } from "@/components/repair/repair-summary";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/typography";
import { getRepairPageData, type RepairPageSearchParams } from "@/app/repair/repair-page-data";
import { mergeHrefParams } from "@/src/lib/date-range";

export const dynamic = "force-dynamic";

type RepairPageProps = {
  searchParams?: RepairPageSearchParams;
};

export default async function RepairPage({ searchParams }: RepairPageProps) {
  const { range, rangeLinkParams, focusKey, workbench, visibleRepairKeys, hasGroups, focusedGroup } =
    await getRepairPageData(searchParams);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unknown Cost Repair"
        description="Grouped local evidence for interactions that could not be priced."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={mergeHrefParams("/pricing", focusKey ? { returnTo: mergeHrefParams(`/repair?key=${encodeURIComponent(focusKey)}`, rangeLinkParams) } : {})}>
                <Settings2 className="h-4 w-4" />
                Model Rates
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={mergeHrefParams("/parser-debug", rangeLinkParams)}>
                <Search className="h-4 w-4" />
                Parsers
              </Link>
            </Button>
          </div>
        }
      />

      <PeriodFilter range={range} basePath="/repair" />
      <RepairFlowSteps />
      <RepairGuidancePanel workbench={workbench} rangeLinkParams={rangeLinkParams} />
      {focusKey ? <FocusedRepairPanel group={focusedGroup} focusKey={focusKey} rangeLinkParams={rangeLinkParams} /> : null}
      <RepairSummaryCard summary={workbench.summary} />
      <RepairItemsTable
        workbench={workbench}
        hasGroups={hasGroups}
        focusKey={focusKey}
        visibleRepairKeys={visibleRepairKeys}
        rangeLinkParams={rangeLinkParams}
      />
    </div>
  );
}
