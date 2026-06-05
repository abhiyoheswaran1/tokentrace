import { Badge } from "@/components/ui/badge";
import { FieldLabel } from "@/components/ui/typography";

export type SetupStatusItem = {
  label: string;
  value: string;
  detail: string;
  ok: boolean;
};

function statusTone(ok: boolean) {
  return ok ? "text-primary" : "text-amber-700";
}

export function SetupStatusSection({ items, warningCount }: { items: SetupStatusItem[]; warningCount: number }) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-sm font-semibold leading-tight">Setup status</h2>
          <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted-foreground">
            Live local health for the next action: latest scan, imported records, unknown cost, and model-rate coverage.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          No telemetry
        </Badge>
      </div>
      <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="min-w-0 p-4">
            <FieldLabel>{item.label}</FieldLabel>
            <div className={`mt-2 text-sm font-semibold leading-tight tabular-nums ${statusTone(item.ok)}`}>
              {item.value}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>
      {warningCount > 0 ? (
        <div className="border-t px-4 py-3 text-sm leading-6 text-amber-800">
          Scan Health has {warningCount.toLocaleString()} warning or error notes to review before trusting the latest scan.
        </div>
      ) : null}
    </section>
  );
}
