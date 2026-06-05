import { CheckCircle2, CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FieldLabel, MonoText } from "@/components/ui/typography";
import { statusLineTerms } from "@/app/guide/guide-content";
import { CommandBlock } from "@/app/guide/command-block";
import { SectionTitle } from "@/app/guide/section-title";

export function StatusLineSection() {
  return (
    <section className="rounded-lg border bg-card">
      <SectionTitle id="status-line" kicker="Claude Code status line" title="Read live numbers without mixing up context and processed usage">
        The status line is for live coding. The dashboard is for scanned historical evidence.
      </SectionTitle>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4 p-4">
          <div>
            <FieldLabel>Setup command</FieldLabel>
            <div className="mt-2">
              <CommandBlock>tokentrace statusline setup claude</CommandBlock>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Paste the printed statusLine block into <MonoText>~/.claude/settings.json</MonoText>. Claude then runs{" "}
              <MonoText>tokentrace statusline claude</MonoText>.
            </p>
          </div>
          <div>
            <FieldLabel>Example output</FieldLabel>
            <div className="mt-2 overflow-x-auto whitespace-nowrap rounded-md border bg-muted/40 p-3">
              <MonoText>TokenTrace | Opus | ctx 12% | cost $8.77 | processed 11.69M tokens | cache 11.64M | priced</MonoText>
            </div>
          </div>
          <div className="table-scroll">
            <Table className="min-w-2xl">
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Meaning</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusLineTerms.map((item) => (
                  <TableRow key={item.label}>
                    <TableCell>
                      <Badge variant="secondary">{item.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm leading-6 text-muted-foreground">{item.meaning}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="border-t p-4 lg:border-l lg:border-t-0">
          <h3 className="text-sm font-semibold leading-tight">How to read high numbers</h3>
          <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
              <p>
                Use <span className="font-medium text-foreground">ctx</span> for current context-window pressure.
              </p>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
              <p>
                Use <span className="font-medium text-foreground">processed</span> and{" "}
                <span className="font-medium text-foreground">cache</span> to explain cost and transcript activity.
              </p>
            </div>
            <div className="flex gap-3">
              <CircleAlert className="mt-1 h-4 w-4 shrink-0 text-amber-700" />
              <p>If cost looks surprising, compare status-line cost with imported dashboard sessions after your next scan.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
