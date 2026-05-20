import { AlertTriangle, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EditablePricingRow, PricingDuplicate, PricingValidation } from "./pricing-workflow";
import { validatePricingRow } from "./pricing-workflow";

function numberInputValue(value: number | null) {
  return value == null ? "" : String(value);
}

function parsePriceInput(value: string) {
  return value === "" ? null : Number(value);
}

export function ModelRatesTable({
  visibleRows,
  totalRows,
  filter,
  duplicateRows,
  duplicateRowIds,
  validationByRowId,
  isPending,
  onFilterChange,
  onUpdateRow,
  onSaveRow
}: {
  visibleRows: EditablePricingRow[];
  totalRows: number;
  filter: string;
  duplicateRows: PricingDuplicate[];
  duplicateRowIds: Set<string>;
  validationByRowId: Map<string, PricingValidation>;
  isPending: boolean;
  onFilterChange: (value: string) => void;
  onUpdateRow: (id: string, patch: Partial<EditablePricingRow>) => void;
  onSaveRow: (row: EditablePricingRow) => void;
}) {
  return (
    <>
      <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,22rem)_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="pricing-filter">Find model or provider</Label>
          <Input
            id="pricing-filter"
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
            placeholder="claude-sonnet, gpt-4.1, openai"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {visibleRows.length.toLocaleString()} of {totalRows.toLocaleString()} price rows.
        </div>
      </div>

      {duplicateRows.length ? (
        <div className="mb-4 flex gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            Duplicate model-rate rows found: {duplicateRows.map((duplicate) => duplicate.label).join(", ")}.
            Save one canonical provider/model row or adjust the duplicate before relying on repricing.
          </div>
        </div>
      ) : null}

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
          {visibleRows.map((row) => {
            const validation = validationByRowId.get(row.id) ?? validatePricingRow(row);
            const duplicate = duplicateRowIds.has(row.id);
            return (
              <TableRow key={row.id}>
                <TableCell>
                  <Input
                    className="w-28"
                    value={row.providerId}
                    onChange={(event) => onUpdateRow(row.id, { providerId: event.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className="w-28"
                    value={row.providerName ?? row.provider}
                    onChange={(event) => onUpdateRow(row.id, { providerName: event.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className="w-52"
                    value={row.model}
                    onChange={(event) => onUpdateRow(row.id, { model: event.target.value })}
                  />
                  {duplicate ? (
                    <Badge className="mt-2" variant="warning">duplicate rate</Badge>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Input
                    className="w-24"
                    inputMode="decimal"
                    value={numberInputValue(row.inputTokenPrice)}
                    onChange={(event) => onUpdateRow(row.id, { inputTokenPrice: parsePriceInput(event.target.value) })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className="w-24"
                    inputMode="decimal"
                    value={numberInputValue(row.outputTokenPrice)}
                    onChange={(event) => onUpdateRow(row.id, { outputTokenPrice: parsePriceInput(event.target.value) })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className="w-24"
                    inputMode="decimal"
                    value={numberInputValue(row.cachedInputTokenPrice)}
                    onChange={(event) => onUpdateRow(row.id, { cachedInputTokenPrice: parsePriceInput(event.target.value) })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className="w-24"
                    inputMode="decimal"
                    value={numberInputValue(row.cacheWriteTokenPrice)}
                    onChange={(event) => onUpdateRow(row.id, { cacheWriteTokenPrice: parsePriceInput(event.target.value) })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className="w-24"
                    value={row.currency}
                    onChange={(event) => onUpdateRow(row.id, { currency: event.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => onSaveRow(row)} disabled={isPending || !validation.valid}>
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  {validation.errors.length ? (
                    <p className="mt-2 max-w-48 text-xs leading-5 text-destructive">{validation.errors[0]}</p>
                  ) : duplicate ? (
                    <p className="mt-2 max-w-48 text-xs leading-5 text-amber-700">Duplicate provider/model. Save the canonical row or rename this one.</p>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })}
          {visibleRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                No model-rate rows match this filter.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </>
  );
}
