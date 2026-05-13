"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, RefreshCw, Save } from "lucide-react";
import type { PricingRow } from "@/src/lib/pricing";
import type { ModelAliasSuggestion } from "@/src/lib/analytics";
import { formatTokens } from "@/src/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MonoText } from "@/components/ui/typography";

type EditablePricingRow = PricingRow & {
  providerName?: string;
};

function numberInputValue(value: number | null) {
  return value == null ? "" : String(value);
}

export function PricingSettings({
  initialRows,
  initialModel,
  returnTo,
  aliasSuggestions = []
}: {
  initialRows: PricingRow[];
  initialModel?: string;
  returnTo?: string;
  aliasSuggestions?: ModelAliasSuggestion[];
}) {
  const [rows, setRows] = useState<EditablePricingRow[]>(initialRows);
  const [filter, setFilter] = useState(initialModel ?? "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [messageHref, setMessageHref] = useState<string | null>(null);

  const focusedSuggestion = useMemo(() => {
    if (!initialModel) return null;
    const normalized = initialModel.toLowerCase();
    return aliasSuggestions.find((suggestion) =>
      suggestion.model.toLowerCase() === normalized ||
      suggestion.suggestedModel?.toLowerCase() === normalized
    ) ?? null;
  }, [aliasSuggestions, initialModel]);

  const visibleRows = useMemo(() => {
    const normalized = filter.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) =>
      [row.providerId, row.providerName ?? row.provider, row.provider, row.model]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [filter, rows]);

  function updateRow(id: string, patch: Partial<EditablePricingRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function addRow() {
    setRows((current) => [
      {
        id: `new-${Date.now()}`,
        providerId: "custom",
        provider: "Custom",
        providerName: "Custom",
        model: "",
        inputTokenPrice: null,
        outputTokenPrice: null,
        cachedInputTokenPrice: null,
        cacheWriteTokenPrice: null,
        currency: "USD",
        effectiveFrom: null
      },
      ...current
    ]);
  }

  function saveRow(row: EditablePricingRow) {
    startTransition(async () => {
      setMessage("");
      setMessageHref(null);
      const response = await fetch("/api/prices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerId: row.providerId,
          providerName: row.providerName ?? row.provider,
          model: row.model,
          inputTokenPrice: row.inputTokenPrice,
          outputTokenPrice: row.outputTokenPrice,
          cachedInputTokenPrice: row.cachedInputTokenPrice,
          cacheWriteTokenPrice: row.cacheWriteTokenPrice,
          currency: row.currency
        })
      });
      if (!response.ok) {
        setMessage("Price save failed.");
        return;
      }
      const result = (await response.json()) as {
        id: string;
        costsRecalculated: number;
        interactionsChecked: number;
        unknownCostInteractions: number;
        modelAliasesUpdated: number;
        resolvedRepairItems: number;
      };
      const latest = (await fetch("/api/prices").then((res) => res.json())) as PricingRow[];
      setRows(latest);
      setMessage(
        `Price saved. ${result.costsRecalculated.toLocaleString()} interactions repriced, ${result.resolvedRepairItems.toLocaleString()} repair items resolved, ${result.unknownCostInteractions.toLocaleString()} unknown-cost interactions remain.`
      );
      setMessageHref(returnTo ?? null);
    });
  }

  function refreshDefaultPrices() {
    startTransition(async () => {
      setMessage("Refreshing public price table...");
      const response = await fetch("/api/prices/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "remote" })
      });
      if (!response.ok) {
        setMessage("Price refresh failed.");
        return;
      }
      const result = (await response.json()) as {
        source: string;
        imported: number;
        updated: number;
        skippedManual: number;
        costsRecalculated: number;
        modelAliasesUpdated: number;
        unknownCostInteractions: number;
        error: string | null;
      };
      const latest = (await fetch("/api/prices").then((res) => res.json())) as PricingRow[];
      setRows(latest);
      setMessage(
        result.error
          ? "Remote refresh failed; bundled prices were used."
          : `Prices refreshed. ${result.imported} added, ${result.updated} updated, ${result.skippedManual} manual rows kept. ${result.costsRecalculated} imported interactions repriced.`
      );
    });
  }

  return (
    <div className="space-y-4">
      {focusedSuggestion || returnTo ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Repair Context</CardTitle>
              <CardDescription>
                Pricing was opened from an unknown-cost workflow. Save a complete price row to recalculate local interactions.
              </CardDescription>
            </div>
            {returnTo ? (
              <Button asChild variant="outline" size="sm">
                <a href={returnTo}>Return to repair item</a>
              </Button>
            ) : null}
          </CardHeader>
          {focusedSuggestion ? (
            <CardContent className="grid gap-3 border-t p-0 sm:grid-cols-3">
              <div className="p-4">
                <div className="text-xs font-medium text-muted-foreground">Observed model</div>
                <div className="mt-1 font-medium">{focusedSuggestion.model}</div>
              </div>
              <div className="border-t p-4 sm:border-l sm:border-t-0">
                <div className="text-xs font-medium text-muted-foreground">Suggested row</div>
                <div className="mt-1 font-medium">{focusedSuggestion.suggestedModel ?? "Add or verify pricing"}</div>
              </div>
              <div className="border-t p-4 sm:border-l sm:border-t-0">
                <div className="text-xs font-medium text-muted-foreground">Evidence</div>
                <div className="mt-1 text-sm">
                  {focusedSuggestion.interactions.toLocaleString()} interactions, {formatTokens(focusedSuggestion.totalTokens)}
                </div>
                <Badge className="mt-2" variant={focusedSuggestion.confidence === "high" ? "success" : focusedSuggestion.confidence === "medium" ? "warning" : "secondary"}>
                  {focusedSuggestion.confidence} confidence
                </Badge>
              </div>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      {aliasSuggestions.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Model Alias Suggestions</CardTitle>
            <CardDescription>
              Local repair hints for unknown-cost rows. Review before copying prices across model names.
            </CardDescription>
          </CardHeader>
          <CardContent className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Observed model</TableHead>
                  <TableHead>Suggested row</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead>Repair</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aliasSuggestions.slice(0, 8).map((suggestion) => (
                  <TableRow key={`${suggestion.model}-${suggestion.sourceFile}`}>
                    <TableCell className="font-medium">{suggestion.model}</TableCell>
                    <TableCell>{suggestion.suggestedModel ?? "Parser review needed"}</TableCell>
                    <TableCell>
                      <Badge variant={suggestion.confidence === "high" ? "success" : suggestion.confidence === "medium" ? "warning" : "secondary"}>
                        {suggestion.confidence}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md text-sm text-muted-foreground">
                      {suggestion.reason} {suggestion.interactions.toLocaleString()} interactions, {formatTokens(suggestion.totalTokens)}.
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <a href={suggestion.repairHref} className="font-medium text-primary underline-offset-4 hover:underline">
                          {suggestion.repairHref.startsWith("/pricing") ? "Open pricing" : "Open parser"}
                        </a>
                        {suggestion.repairHref !== suggestion.parserHref ? (
                          <a href={suggestion.parserHref} className="font-medium text-muted-foreground underline-offset-4 hover:underline">
                            Parser
                          </a>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Model Pricing</CardTitle>
            <CardDescription>
              Prices are per 1M tokens. Seed values use public provider list prices and remain editable.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={refreshDefaultPrices} disabled={isPending}>
              <RefreshCw className="h-4 w-4" />
              Refresh prices
            </Button>
            <Button variant="outline" onClick={addRow}>
              <Plus className="h-4 w-4" />
              Add model
            </Button>
          </div>
        </CardHeader>
        <CardContent className="table-scroll">
          <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,22rem)_auto] sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="pricing-filter">Find model or provider</Label>
              <Input
                id="pricing-filter"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="claude-sonnet, gpt-4.1, openai"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {visibleRows.length.toLocaleString()} of {rows.length.toLocaleString()} price rows.
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider ID</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Input / 1M</TableHead>
                <TableHead>Output / 1M</TableHead>
                <TableHead>Cache read / 1M</TableHead>
                <TableHead>Cache write / 1M</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Input
                      className="w-28"
                      value={row.providerId}
                      onChange={(event) => updateRow(row.id, { providerId: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-28"
                      value={row.providerName ?? row.provider}
                      onChange={(event) => updateRow(row.id, { providerName: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-52"
                      value={row.model}
                      onChange={(event) => updateRow(row.id, { model: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-24"
                      inputMode="decimal"
                      value={numberInputValue(row.inputTokenPrice)}
                      onChange={(event) => updateRow(row.id, { inputTokenPrice: event.target.value === "" ? null : Number(event.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-24"
                      inputMode="decimal"
                      value={numberInputValue(row.outputTokenPrice)}
                      onChange={(event) => updateRow(row.id, { outputTokenPrice: event.target.value === "" ? null : Number(event.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-24"
                      inputMode="decimal"
                      value={numberInputValue(row.cachedInputTokenPrice)}
                      onChange={(event) => updateRow(row.id, { cachedInputTokenPrice: event.target.value === "" ? null : Number(event.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-24"
                      inputMode="decimal"
                      value={numberInputValue(row.cacheWriteTokenPrice)}
                      onChange={(event) => updateRow(row.id, { cacheWriteTokenPrice: event.target.value === "" ? null : Number(event.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-24"
                      value={row.currency}
                      onChange={(event) => updateRow(row.id, { currency: event.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => saveRow(row)} disabled={isPending || !row.model}>
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                    No pricing rows match this filter.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          {message ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{message}</span>
              {messageHref ? (
                <a href={messageHref} className="font-medium text-primary underline-offset-4 hover:underline">
                  Return to repair item
                </a>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost Formula</CardTitle>
          <CardDescription>Costs are computed per interaction and then aggregated.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <Label>Formula</Label>
          <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 whitespace-pre-wrap">
            <MonoText className="break-words">
              input * inputPrice + output * outputPrice + cacheRead * cacheReadPrice + cacheWrite * cacheWritePrice
            </MonoText>
          </pre>
          <p className="max-w-[65ch]">
            Cache read and cache write fall back to input price when a model has no separate cache rate.
            TokenTrace separates exact token counts from estimated counts. Unknown model prices produce unknown costs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
