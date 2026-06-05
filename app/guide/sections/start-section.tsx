import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScanNowButton } from "@/components/scan-now-button";
import { SectionTitle } from "@/app/guide/section-title";

export type FirstRunStep = {
  number: string;
  title: string;
  page: string;
  detail: string;
  href: string;
  action: string;
  actionKind?: string;
};

export function StartSection({ steps }: { steps: FirstRunStep[] }) {
  return (
    <section className="rounded-lg border bg-card">
      <SectionTitle id="start" kicker="Start here" title="Get from install to evidence">
        Run a scan, confirm imported records, then open the page that explains the number you care about.
      </SectionTitle>
      <ol className="divide-y">
        {steps.map((step) => (
          <li key={step.title} className="grid gap-3 p-4 md:grid-cols-[2.5rem_minmax(0,1fr)_auto] md:items-start">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-muted/40 text-sm font-semibold tabular-nums text-muted-foreground">
              {step.number}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold leading-tight">{step.title}</h3>
                <Badge variant="secondary">{step.page}</Badge>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.detail}</p>
            </div>
            {step.actionKind === "scan" ? (
              <ScanNowButton variant="outline" size="sm" className="w-fit" />
            ) : (
              <Button asChild variant="outline" size="sm" className="w-fit">
                <Link href={step.href}>
                  {step.action}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
