"use client";

import { useMemo, useState, useTransition } from "react";
import type { ModelAliasSuggestion } from "@/src/lib/analytics";
import type { PricingRow } from "@/src/lib/pricing";
import {
  type EditablePricingRow,
  findDuplicatePricingRows,
  parsePricingRowsCsv,
  pricingRefreshResultCopy,
  pricingSaveResultCopy,
  serializePricingRowsCsv,
  validatePricingRow
} from "@/components/pricing/pricing-workflow";

function pricingPayload(row: EditablePricingRow) {
  return {
    providerId: row.providerId.trim(),
    providerName: (row.providerName ?? row.provider).trim(),
    model: row.model.trim(),
    inputTokenPrice: row.inputTokenPrice,
    outputTokenPrice: row.outputTokenPrice,
    cachedInputTokenPrice: row.cachedInputTokenPrice,
    cacheWriteTokenPrice: row.cacheWriteTokenPrice,
    currency: row.currency.trim().toUpperCase() || "USD"
  };
}

async function readResponseError(response: Response) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error ? `: ${body.error}` : ".";
}

export function usePricingSettingsController({
  initialRows,
  initialModel,
  returnTo,
  aliasSuggestions
}: {
  initialRows: PricingRow[];
  initialModel?: string;
  returnTo?: string;
  aliasSuggestions: ModelAliasSuggestion[];
}) {
  const [rows, setRows] = useState<EditablePricingRow[]>(initialRows);
  const [filter, setFilter] = useState(initialModel ?? "");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");
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

  const validationByRowId = useMemo(
    () => new Map(rows.map((row) => [row.id, validatePricingRow(row)])),
    [rows]
  );
  const duplicateRows = useMemo(() => findDuplicatePricingRows(rows), [rows]);
  const duplicateRowIds = useMemo(
    () => new Set(duplicateRows.flatMap((duplicate) => duplicate.rowIds)),
    [duplicateRows]
  );

  function updateRow(id: string, patch: Partial<EditablePricingRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  function addRow(seed: Partial<EditablePricingRow> = {}) {
    const nextRow: EditablePricingRow = {
      id: `new-${Date.now()}`,
      providerId: seed.providerId ?? "custom",
      provider: seed.provider ?? "Custom",
      providerName: seed.providerName ?? seed.provider ?? "Custom",
      model: seed.model ?? "",
      inputTokenPrice: seed.inputTokenPrice ?? null,
      outputTokenPrice: seed.outputTokenPrice ?? null,
      cachedInputTokenPrice: seed.cachedInputTokenPrice ?? null,
      cacheWriteTokenPrice: seed.cacheWriteTokenPrice ?? null,
      currency: seed.currency ?? "USD",
      effectiveFrom: null
    };
    setRows((current) => [nextRow, ...current]);
    if (nextRow.model) setFilter(nextRow.model);
  }

  function addFocusedRow() {
    addRow({
      providerId: "custom",
      provider: "Custom",
      providerName: "Custom",
      model: focusedSuggestion?.suggestedModel ?? focusedSuggestion?.model ?? initialModel ?? ""
    });
  }

  function saveRow(row: EditablePricingRow) {
    const validation = validatePricingRow(row);
    if (!validation.valid) {
      setMessage(`Fix this model rate first: ${validation.errors[0]}`);
      setMessageHref(null);
      return;
    }

    startTransition(async () => {
      setMessage("");
      setMessageHref(null);
      const response = await fetch("/api/prices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(pricingPayload(row))
      });
      if (!response.ok) {
        setMessage(`Price save failed${await readResponseError(response)}`);
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
      setMessage(pricingSaveResultCopy(result));
      setMessageHref(returnTo ?? (result.resolvedRepairItems > 0 ? "/repair" : null));
    });
  }

  function refreshDefaultPrices() {
    startTransition(async () => {
      setMessage("Refreshing public price table...");
      setMessageHref(null);
      const response = await fetch("/api/prices/refresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "remote" })
      });
      if (!response.ok) {
        setMessage(`Price refresh failed${await readResponseError(response)}`);
        return;
      }
      const result = await response.json();
      const latest = (await fetch("/api/prices").then((res) => res.json())) as PricingRow[];
      setRows(latest);
      setMessage(pricingRefreshResultCopy(result));
    });
  }

  function exportVisibleCsv() {
    setBulkOpen(true);
    setBulkText(serializePricingRowsCsv(visibleRows));
    setMessage("Visible model rates loaded into the CSV workspace.");
    setMessageHref(null);
  }

  function importCsvRates() {
    const parsed = parsePricingRowsCsv(bulkText);
    if (parsed.errors.length) {
      setMessage(`CSV import needs attention. ${parsed.errors.slice(0, 2).join(" ")}`);
      setMessageHref(null);
      return;
    }
    if (parsed.rows.length === 0) {
      setMessage("CSV import needs at least one model-rate row.");
      setMessageHref(null);
      return;
    }

    startTransition(async () => {
      setMessage(`Importing ${parsed.rows.length.toLocaleString()} CSV rates...`);
      setMessageHref(null);
      let imported = 0;
      let firstError: string | null = null;
      for (const row of parsed.rows) {
        const response = await fetch("/api/prices", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(pricingPayload(row))
        });
        if (!response.ok) {
          firstError = `${row.providerId} / ${row.model}${await readResponseError(response)}`;
          break;
        }
        imported += 1;
      }
      const latest = (await fetch("/api/prices").then((res) => res.json())) as PricingRow[];
      setRows(latest);
      setMessage(
        firstError
          ? `CSV import stopped after ${imported.toLocaleString()} rows. ${firstError}`
          : `Imported ${imported.toLocaleString()} CSV model-rate rows. Reopen Repair or Scan Health to confirm unknown-cost coverage changed.`
      );
      setMessageHref(returnTo ?? "/repair");
    });
  }

  return {
    rows,
    visibleRows,
    filter,
    setFilter,
    bulkOpen,
    setBulkOpen,
    bulkText,
    setBulkText,
    isPending,
    message,
    messageHref,
    focusedSuggestion,
    validationByRowId,
    duplicateRows,
    duplicateRowIds,
    updateRow,
    addRow,
    addFocusedRow,
    saveRow,
    refreshDefaultPrices,
    exportVisibleCsv,
    importCsvRates
  };
}
