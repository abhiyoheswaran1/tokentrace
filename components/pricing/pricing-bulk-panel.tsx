import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function PricingBulkPanel({
  bulkText,
  isPending,
  onBulkTextChange,
  onImportCsvRates
}: {
  bulkText: string;
  isPending: boolean;
  onBulkTextChange: (value: string) => void;
  onImportCsvRates: () => void;
}) {
  return (
    <div className="mb-4 rounded-md border bg-muted/20 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Label htmlFor="pricing-csv">CSV import/export</Label>
        <span className="text-xs text-muted-foreground">
          providerId, providerName, model, token prices, currency
        </span>
      </div>
      <Textarea
        id="pricing-csv"
        className="mt-2 min-h-40 font-mono text-xs"
        value={bulkText}
        onChange={(event) => onBulkTextChange(event.target.value)}
        placeholder="providerId,providerName,model,inputTokenPrice,outputTokenPrice,cachedInputTokenPrice,cacheWriteTokenPrice,currency"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={onImportCsvRates} disabled={isPending}>
          <Upload className="h-4 w-4" />
          Import CSV rates
        </Button>
        <Button
          variant="outline"
          onClick={() => onBulkTextChange("providerId,providerName,model,inputTokenPrice,outputTokenPrice,cachedInputTokenPrice,cacheWriteTokenPrice,currency\ncustom,Custom,model-name,0,0,,,USD")}
        >
          Insert template
        </Button>
      </div>
    </div>
  );
}
