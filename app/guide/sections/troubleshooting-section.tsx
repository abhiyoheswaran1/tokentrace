import { Database, LockKeyhole } from "lucide-react";
import { emptyStatePlaybook, pageMap } from "@/app/guide/guide-content";
import { SectionTitle } from "@/app/guide/section-title";

export type GuideWorkflow = {
  problem: string;
  path: string;
  action: string;
};

export function TroubleshootingSection({ workflows }: { workflows: GuideWorkflow[] }) {
  return (
    <section className="rounded-lg border bg-card">
      <SectionTitle id="troubleshooting" kicker="Troubleshooting" title="Repair the smallest thing that blocks trust">
        Use the symptom to choose a page, then follow the evidence path instead of guessing from a summary total.
      </SectionTitle>
      <div className="grid gap-0 lg:grid-cols-2">
        <div className="p-4">
          <h3 className="text-sm font-semibold leading-tight">Common workflows</h3>
          <div className="mt-3 divide-y border-y">
            {workflows.map((item) => (
              <div key={item.problem} className="grid gap-2 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <div className="text-sm font-medium text-foreground">{item.problem}</div>
                <div className="text-sm leading-6 text-muted-foreground">
                  <span className="font-medium text-foreground">{item.path}:</span> {item.action}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t p-4 lg:border-l lg:border-t-0">
          <h3 className="text-sm font-semibold leading-tight">Empty and error states</h3>
          <div className="mt-3 divide-y border-y">
            {emptyStatePlaybook.map(([state, action]) => (
              <div key={state} className="grid gap-2 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <div className="text-sm font-medium text-foreground">{state}</div>
                <div className="text-sm leading-6 text-muted-foreground">{action}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid border-t lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
        <div className="p-4">
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold leading-tight">Privacy and storage</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            TokenTrace scans local CLI artifacts and stores normalized analytics in the local database shown in Settings.
            Raw prompts and message bodies stay out of normal views.
          </p>
        </div>
        <div className="border-t p-4 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold leading-tight">Page map</h3>
          </div>
          <div className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {pageMap.map(([name, detail]) => (
              <div key={name} className="text-sm leading-6">
                <span className="font-medium text-foreground">{name}:</span>{" "}
                <span className="text-muted-foreground">{detail}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
