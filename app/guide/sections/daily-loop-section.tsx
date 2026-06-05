import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { dailyLoop } from "@/app/guide/guide-content";
import { SectionTitle } from "@/app/guide/section-title";

export function DailyLoopSection() {
  return (
    <section className="rounded-lg border bg-card">
      <SectionTitle id="daily-loop" kicker="Daily loop" title="Use one route per question">
        Start broad, then move to evidence only when a number needs explanation or repair.
      </SectionTitle>
      <div className="divide-y">
        {dailyLoop.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="grid gap-3 p-4 md:grid-cols-[2rem_minmax(0,1fr)_auto] md:items-start">
              <Icon className="mt-0.5 h-5 w-5 text-primary" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold leading-tight">{item.title}</h3>
                  <Badge variant="secondary">{item.page}</Badge>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </div>
              <Link href={item.href} className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline">
                Open
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
