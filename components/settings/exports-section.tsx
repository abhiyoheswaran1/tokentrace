import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ExportsSection() {
  return (
    <Card id="local-exports" className="scroll-mt-28">
      <CardHeader>
        <CardTitle>Local Exports</CardTitle>
        <CardDescription>
          Privacy-safe operating artifacts for reports, evidence, and agent handoff. Raw prompt text is excluded by default.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 border-y p-4 md:grid-cols-3">
        {[
          { label: "Weekly report", href: "/api/reports?type=weekly-usage&format=markdown" },
          { label: "Source coverage", href: "/api/reports?type=source-coverage&format=markdown" },
          { label: "Operating metadata", href: "/api/operating-metadata" }
        ].map((item) => (
          <Button key={item.href} asChild variant="outline">
            <a href={item.href}>
              <Download className="h-4 w-4" />
              {item.label}
            </a>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
