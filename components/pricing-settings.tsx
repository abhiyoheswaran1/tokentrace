"use client";

import { Download, Plus, RefreshCw, Upload } from "lucide-react";
import type { PricingRow } from "@/src/lib/pricing";
import type { ModelAliasSuggestion } from "@/src/lib/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MonoText } from "@/components/ui/typography";
import { ModelAliasSuggestionsTable } from "@/components/pricing/model-alias-suggestions-table";
import { ModelRatesTable } from "@/components/pricing/model-rates-table";
import { PricingBulkPanel } from "@/components/pricing/pricing-bulk-panel";
import { PricingContextCard } from "@/components/pricing/pricing-context-card";
import { usePricingSettingsController } from "@/components/pricing/use-pricing-settings-controller";

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
  const controller = usePricingSettingsController({
    initialRows,
    initialModel,
    returnTo,
    aliasSuggestions
  });

  return (
    <div className="space-y-4">
      <PricingContextCard
        focusedSuggestion={controller.focusedSuggestion}
        initialModel={initialModel}
        returnTo={returnTo}
        onAddFocusedRow={controller.addFocusedRow}
      />
      <ModelAliasSuggestionsTable aliasSuggestions={aliasSuggestions} onAddRow={controller.addRow} />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Model Rates</CardTitle>
            <CardDescription>
              Prices are per 1M tokens. Seed values use public provider list prices and remain editable.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => controller.setBulkOpen((open) => !open)}>
              <Upload className="h-4 w-4" />
              CSV import/export
            </Button>
            <Button variant="outline" onClick={controller.exportVisibleCsv}>
              <Download className="h-4 w-4" />
              Export visible CSV
            </Button>
            <Button variant="outline" onClick={controller.refreshDefaultPrices} disabled={controller.isPending}>
              <RefreshCw className="h-4 w-4" />
              Refresh prices
            </Button>
            <Button variant="outline" onClick={() => controller.addRow()}>
              <Plus className="h-4 w-4" />
              Add model
            </Button>
          </div>
        </CardHeader>
        <CardContent className="table-scroll">
          {controller.bulkOpen ? (
            <PricingBulkPanel
              bulkText={controller.bulkText}
              isPending={controller.isPending}
              onBulkTextChange={controller.setBulkText}
              onImportCsvRates={controller.importCsvRates}
            />
          ) : null}
          <ModelRatesTable
            visibleRows={controller.visibleRows}
            totalRows={controller.rows.length}
            filter={controller.filter}
            duplicateRows={controller.duplicateRows}
            duplicateRowIds={controller.duplicateRowIds}
            validationByRowId={controller.validationByRowId}
            isPending={controller.isPending}
            onFilterChange={controller.setFilter}
            onUpdateRow={controller.updateRow}
            onSaveRow={controller.saveRow}
          />
          {controller.message ? (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{controller.message}</span>
              {controller.messageHref ? (
                <a href={controller.messageHref} className="font-medium text-primary underline-offset-4 hover:underline">
                  Open repair
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
            <MonoText className="wrap-break-word">
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
