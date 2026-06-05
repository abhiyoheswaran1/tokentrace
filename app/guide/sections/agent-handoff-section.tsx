import { Bot, FileJson, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FieldLabel, MonoText } from "@/components/ui/typography";
import type { RoadmapStatus } from "@/src/lib/roadmap-status";
import { agentSteps, mcpAgentEntries, roadmapSteps } from "@/app/guide/guide-content";
import { CommandBlock } from "@/app/guide/command-block";
import { SectionTitle } from "@/app/guide/section-title";

export function AgentHandoffSection({ roadmapStatus }: { roadmapStatus: RoadmapStatus }) {
  return (
    <section className="rounded-lg border bg-card">
      <SectionTitle id="agent-handoff" kicker="Agent handoff" title="Give coding agents a stable entry point">
        Agents should discover capabilities first, scan only when needed, then cite evidence before summarizing usage.
      </SectionTitle>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.82fr)_minmax(18rem,0.55fr)]">
        <div className="p-4">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold leading-tight">Agent discovery</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            <MonoText>tokentrace agent --json</MonoText> returns workflows, privacy rules, guardrails, and safe JSON commands.
            The alias <MonoText>tokentrace capabilities --json</MonoText> returns the same versioned contract.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CommandBlock>tokentrace agent --json</CommandBlock>
            <CommandBlock>tokentrace capabilities --json</CommandBlock>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Package readers can inspect <MonoText>TOKENTRACE_AGENT.md</MonoText>, <MonoText>llms.txt</MonoText>, and{" "}
            <MonoText>docs/agent-discovery.schema.json</MonoText>. A running dashboard exposes <MonoText>/api/agent</MonoText>{" "}
            and <MonoText>/api/capabilities</MonoText>.
          </p>
        </div>
        <div className="border-t p-4 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold leading-tight">Release readiness</h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Current package version is {roadmapStatus.packageVersion}. The current roadmap focuses on accuracy, evidence,
            repair workflow, import profiles, and package-trust checks.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <FieldLabel>Implemented cards</FieldLabel>
              <div className="mt-1 font-semibold">{roadmapStatus.cards.length.toLocaleString()} cards</div>
            </div>
            <div>
              <FieldLabel>Release status</FieldLabel>
              <div className="mt-1 font-semibold">releaseAllowed: {String(roadmapStatus.release.releaseAllowed)}</div>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Run <MonoText>npm run release:check</MonoText> only when the maintainer asks for release preparation.
          </p>
        </div>
      </div>
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <LockKeyhole className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold leading-tight">MCP for agents</h3>
        </div>
        <p className="mt-2 max-w-[72ch] text-sm leading-6 text-muted-foreground">
          MCP clients should connect locally, call <MonoText>get_agent_guide</MonoText> first, and use evidence before reporting
          token, cost, model, or session numbers. The full copy-paste workflow lives in <MonoText>docs/agent-adoption.md</MonoText>.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {mcpAgentEntries.map(([label, value, detail]) => (
            <div key={label} className="rounded-md border bg-muted/30 p-3">
              <FieldLabel>{label}</FieldLabel>
              <div className="mt-2 min-h-10 wrap-break-word text-sm font-medium leading-5">
                <MonoText>{value}</MonoText>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t p-4">
        <h3 className="text-sm font-semibold leading-tight">Agent quickstart</h3>
        <div className="table-scroll mt-3">
          <Table className="min-w-184">
            <TableHeader>
              <TableRow>
                <TableHead>Step</TableHead>
                <TableHead>Command</TableHead>
                <TableHead>Mutates local state</TableHead>
                <TableHead>Purpose</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentSteps.map(([step, command, mutates, purpose]) => (
                <TableRow key={step}>
                  <TableCell className="font-medium">{step}</TableCell>
                  <TableCell>
                    <MonoText>{command}</MonoText>
                  </TableCell>
                  <TableCell>
                    <Badge variant={mutates === "Yes" ? "warning" : "secondary"}>{mutates}</Badge>
                  </TableCell>
                  <TableCell className="text-sm leading-6 text-muted-foreground">{purpose}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="border-t p-4">
        <h3 className="text-sm font-semibold leading-tight">Roadmap surfaces</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Use <MonoText>tokentrace roadmap --json</MonoText> or <MonoText>/api/roadmap</MonoText> for implementation status and release gates.
        </p>
        <div className="table-scroll mt-3">
          <Table className="min-w-176">
            <TableHeader>
              <TableRow>
                <TableHead>Surface</TableHead>
                <TableHead>Command or path</TableHead>
                <TableHead>What it returns</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roadmapSteps.map(([surface, command, purpose]) => (
                <TableRow key={surface}>
                  <TableCell className="font-medium">{surface}</TableCell>
                  <TableCell>
                    <MonoText>{command}</MonoText>
                  </TableCell>
                  <TableCell className="text-sm leading-6 text-muted-foreground">{purpose}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}
