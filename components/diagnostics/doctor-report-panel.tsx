import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataValue, FieldLabel, MonoText } from "@/components/ui/typography";
import type { DoctorReport } from "@/src/lib/doctor";

export function DoctorReportPanel({ report }: { report: DoctorReport }) {
  const statusRows = [
    ["Imported", report.fileStatus.imported],
    ["With errors", report.fileStatus.importedWithErrors],
    ["Duplicates", report.fileStatus.duplicates],
    ["Ignored", report.fileStatus.ignored],
    ["Unsupported", report.fileStatus.unsupported],
    ["Failed", report.fileStatus.failed]
  ];
  const fixCommands = [
    "tokentrace scan",
    "tokentrace doctor --json",
    "tokentrace pricing refresh",
    "tokentrace status --json"
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan Health report</CardTitle>
        <CardDescription>
          The same local Scan Health data returned by `tokentrace doctor --json`.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid border-y sm:grid-cols-2 sm:divide-x xl:grid-cols-4">
          <div className="p-3">
            <FieldLabel>Readable roots</FieldLabel>
            <DataValue className="mt-1" size="md">{report.roots.count.toLocaleString()}</DataValue>
          </div>
          <div className="p-3">
            <FieldLabel>Latest files</FieldLabel>
            <DataValue className="mt-1" size="md">{report.latestScan.filesScanned.toLocaleString()}</DataValue>
          </div>
          <div className="p-3">
            <FieldLabel>Imported records</FieldLabel>
            <DataValue className="mt-1" size="md">{report.latestScan.recordsImported.toLocaleString()}</DataValue>
          </div>
          <div className="p-3">
            <FieldLabel>Unknown cost</FieldLabel>
            <DataValue className="mt-1" size="md">{report.pricing.unknown.toLocaleString()}</DataValue>
          </div>
        </div>

        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-sm font-semibold">Scan freshness</div>
          <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {report.scanFreshness.description}
          </div>
        </div>

        {report.latestScan.zeroImportExplanation ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            {report.latestScan.zeroImportExplanation}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <div className="mb-3 text-sm font-semibold">File handling</div>
            <div className="grid border-y sm:grid-cols-6 sm:divide-x xl:grid-cols-2">
              {statusRows.map(([label, value]) => (
                <div key={label} className="p-2">
                  <FieldLabel>{label}</FieldLabel>
                  <DataValue className="mt-1">{Number(value).toLocaleString()}</DataValue>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="mb-3 text-sm font-semibold">Copyable fixes</div>
            <div className="grid border-y">
              {fixCommands.map((command) => (
                <div key={command} className="border-b px-3 py-2 last:border-b-0">
                  <MonoText>{command}</MonoText>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold">Recommended fixes</div>
          <div className="grid gap-2 lg:grid-cols-2">
            {report.recommendations.slice(0, 6).map((item) => (
              <Link key={item.id} href={item.href ?? "/diagnostics"} className="border-t p-3 transition-colors hover:bg-muted/40">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold">{item.title}</div>
                  <Badge variant={item.severity === "high" ? "destructive" : item.severity === "medium" ? "warning" : "secondary"}>
                    {item.severity}
                  </Badge>
                </div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</div>
                <div className="mt-2 text-xs font-medium text-emerald-800">{item.action}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold">Supported file types</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {report.supportMatrix.summary.stable.toLocaleString()} stable,{" "}
              {report.supportMatrix.summary.bestEffort.toLocaleString()} best-effort,{" "}
              {report.supportMatrix.summary.ignored.toLocaleString()} ignored,{" "}
              {report.supportMatrix.summary.unsupported.toLocaleString()} unsupported.
            </div>
          </div>
          <div className="grid divide-y border-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            {report.supportMatrix.items.map((item) => (
              <div key={item.id} className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold">{item.label}</div>
                  <Badge variant={item.level === "stable" ? "success" : item.level === "unsupported" ? "destructive" : item.level === "best-effort" ? "warning" : "secondary"}>
                    {item.level}
                  </Badge>
                </div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
