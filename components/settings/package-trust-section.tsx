import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataValue, FieldLabel } from "@/components/ui/typography";

export function PackageTrustSection() {
  return (
    <Card id="package-trust" className="scroll-mt-28">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Package Trust
        </CardTitle>
        <CardDescription>
          Runtime and release guarantees for the installed TokenTrace package.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid border-y md:grid-cols-3 md:divide-x">
        {[
          {
            label: "Install scripts",
            value: "None",
            detail: "The TokenTrace package has no preinstall, install, or postinstall lifecycle scripts."
          },
          {
            label: "Network behavior",
            value: "Local first",
            detail: "No telemetry. Optional model-rate refresh downloads only public provider rates."
          },
          {
            label: "Release proof",
            value: "Tag based",
            detail: "npm releases publish through GitHub Trusted Publishing."
          }
        ].map((item) => (
          <div key={item.label} className="p-3">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>{item.label}</FieldLabel>
              <Badge variant="success">checked</Badge>
            </div>
            <DataValue className="mt-1" size="md">{item.value}</DataValue>
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
