import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/typography";

export type EvidenceContextAction = {
  label: string;
  detail: string;
  href: string;
};

export function EvidenceContextPanel({ actions }: { actions: EvidenceContextAction[] }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-[72ch]">
          <FieldLabel>Evidence path</FieldLabel>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Evidence is a contextual drill-down from Today, Sessions, Fix Data, and exported packs. If you opened this page directly, start with processed tokens, then pivot by metric or follow the next action that matches what looks incomplete.
          </p>
        </div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group rounded-md border bg-card p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                {action.label}
                <ArrowRight className="h-3.5 w-3.5 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{action.detail}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
