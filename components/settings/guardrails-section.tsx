import { Gauge, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ScopedGuardrail } from "@/components/settings/types";

export function GuardrailsSection({
  monthlyCostLimitUsd,
  setMonthlyCostLimitUsd,
  monthlyTokenLimit,
  setMonthlyTokenLimit,
  scopedGuardrails,
  newGuardrailScope,
  setNewGuardrailScope,
  newGuardrailName,
  setNewGuardrailName,
  newGuardrailCost,
  setNewGuardrailCost,
  newGuardrailTokens,
  setNewGuardrailTokens,
  newGuardrailThreshold,
  setNewGuardrailThreshold,
  addScopedGuardrail,
  removeScopedGuardrail
}: {
  monthlyCostLimitUsd: string;
  setMonthlyCostLimitUsd: (value: string) => void;
  monthlyTokenLimit: string;
  setMonthlyTokenLimit: (value: string) => void;
  scopedGuardrails: ScopedGuardrail[];
  newGuardrailScope: ScopedGuardrail["scope"];
  setNewGuardrailScope: (value: ScopedGuardrail["scope"]) => void;
  newGuardrailName: string;
  setNewGuardrailName: (value: string) => void;
  newGuardrailCost: string;
  setNewGuardrailCost: (value: string) => void;
  newGuardrailTokens: string;
  setNewGuardrailTokens: (value: string) => void;
  newGuardrailThreshold: string;
  setNewGuardrailThreshold: (value: string) => void;
  addScopedGuardrail: () => void;
  removeScopedGuardrail: (id: string) => void;
}) {
  return (
    <>
      <Card id="usage-guardrails" className="scroll-mt-28">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Local Usage Guardrails
          </CardTitle>
          <CardDescription>
            Optional month-to-date limits for local cost and token awareness.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 border-y p-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="monthly-cost-limit">Monthly cost limit</Label>
            <Input
              id="monthly-cost-limit"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={monthlyCostLimitUsd}
              onChange={(event) => setMonthlyCostLimitUsd(event.target.value)}
              placeholder="250"
            />
            <p className="text-xs text-muted-foreground">USD limit for imported CLI usage this calendar month.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly-token-limit">Monthly token limit</Label>
            <Input
              id="monthly-token-limit"
              type="number"
              min="0"
              step="1000"
              inputMode="numeric"
              value={monthlyTokenLimit}
              onChange={(event) => setMonthlyTokenLimit(event.target.value)}
              placeholder="10000000"
            />
            <p className="text-xs text-muted-foreground">Leave either field blank to disable that guardrail.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scoped Guardrails</CardTitle>
          <CardDescription>
            Optional project, model, or tool limits with custom warning thresholds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 lg:grid-cols-[9rem_minmax(0,1fr)_8rem_8rem_7rem_auto]">
            <select
              className="h-9 rounded-md border bg-card px-3 text-sm"
              value={newGuardrailScope}
              onChange={(event) => setNewGuardrailScope(event.target.value as ScopedGuardrail["scope"])}
              aria-label="Guardrail scope"
            >
              <option value="project">Project</option>
              <option value="model">Model</option>
              <option value="tool">Tool</option>
            </select>
            <Input value={newGuardrailName} onChange={(event) => setNewGuardrailName(event.target.value)} placeholder="TokenTrace or gpt-5.4" />
            <Input value={newGuardrailCost} onChange={(event) => setNewGuardrailCost(event.target.value)} inputMode="decimal" placeholder="$ limit" />
            <Input value={newGuardrailTokens} onChange={(event) => setNewGuardrailTokens(event.target.value)} inputMode="numeric" placeholder="tokens" />
            <Input value={newGuardrailThreshold} onChange={(event) => setNewGuardrailThreshold(event.target.value)} inputMode="decimal" placeholder="0.8" />
            <Button type="button" variant="outline" onClick={addScopedGuardrail}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {scopedGuardrails.length ? (
              scopedGuardrails.map((guardrail) => (
                <div key={guardrail.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{guardrail.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {guardrail.scope} / cost {guardrail.monthlyCostLimitUsd ?? "off"} / tokens {guardrail.monthlyTokenLimit ?? "off"} / warn {(guardrail.warningThreshold * 100).toFixed(0)}%
                      </div>
                    </div>
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeScopedGuardrail(guardrail.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No scoped guardrails configured.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
