"use client";

import { useState, useTransition } from "react";
import { Plus, Save } from "lucide-react";
import type { PricingRow } from "@/src/lib/pricing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type EditablePricingRow = PricingRow & {
  providerName?: string;
};

function numberInputValue(value: number | null) {
  return value == null ? "" : String(value);
}

export function PricingSettings({ initialRows }: { initialRows: PricingRow[] }) {
  const [rows, setRows] = useState<EditablePricingRow[]>(initialRows);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function updateRow(index: number, patch: Partial<EditablePricingRow>) {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row))
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
        currency: "USD",
        effectiveFrom: null
      },
      ...current
    ]);
  }

  function saveRow(row: EditablePricingRow) {
    startTransition(async () => {
      setMessage("");
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
          currency: row.currency
        })
      });
      if (!response.ok) {
        setMessage("Price save failed.");
        return;
      }
      const latest = (await fetch("/api/prices").then((res) => res.json())) as PricingRow[];
      setRows(latest);
      setMessage("Price saved.");
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Model Pricing</CardTitle>
            <CardDescription>
              Prices are per 1M tokens. Seed values are editable placeholders.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={addRow}>
            <Plus className="h-4 w-4" />
            Add model
          </Button>
        </CardHeader>
        <CardContent className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider ID</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Input / 1M</TableHead>
                <TableHead>Output / 1M</TableHead>
                <TableHead>Cached input / 1M</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Input value={row.providerId} onChange={(event) => updateRow(index, { providerId: event.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Input value={row.providerName ?? row.provider} onChange={(event) => updateRow(index, { providerName: event.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Input value={row.model} onChange={(event) => updateRow(index, { model: event.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Input
                      inputMode="decimal"
                      value={numberInputValue(row.inputTokenPrice)}
                      onChange={(event) => updateRow(index, { inputTokenPrice: event.target.value === "" ? null : Number(event.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      inputMode="decimal"
                      value={numberInputValue(row.outputTokenPrice)}
                      onChange={(event) => updateRow(index, { outputTokenPrice: event.target.value === "" ? null : Number(event.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      inputMode="decimal"
                      value={numberInputValue(row.cachedInputTokenPrice)}
                      onChange={(event) => updateRow(index, { cachedInputTokenPrice: event.target.value === "" ? null : Number(event.target.value) })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input value={row.currency} onChange={(event) => updateRow(index, { currency: event.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => saveRow(row)} disabled={isPending || !row.model}>
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {message ? <div className="mt-3 text-sm text-muted-foreground">{message}</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost Formula</CardTitle>
          <CardDescription>Costs are computed per interaction and then aggregated.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <Label>Formula</Label>
          <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs text-foreground">
            input * inputPrice + output * outputPrice + cacheRead * cachedInputPrice + cacheWrite * inputPrice
          </div>
          <p>
            TokenScope separates exact token counts from estimated counts. Unknown model prices produce unknown costs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
