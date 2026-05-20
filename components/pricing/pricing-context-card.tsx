import { Plus } from "lucide-react";
import type { ModelAliasSuggestion } from "@/src/lib/analytics";
import { formatTokens } from "@/src/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PricingContextCard({
  focusedSuggestion,
  initialModel,
  returnTo,
  onAddFocusedRow
}: {
  focusedSuggestion: ModelAliasSuggestion | null;
  initialModel?: string;
  returnTo?: string;
  onAddFocusedRow: () => void;
}) {
  if (!focusedSuggestion && !returnTo) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>Repair Context</CardTitle>
          <CardDescription>
            Model Rates was opened from unknown-cost repair. Add or update one complete rate row, then return to verify what changed.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {initialModel ? (
            <Button variant="outline" size="sm" onClick={onAddFocusedRow}>
              <Plus className="h-4 w-4" />
              Add row for this model
            </Button>
          ) : null}
          {returnTo ? (
            <Button asChild variant="outline" size="sm">
              <a href={returnTo}>Open repair</a>
            </Button>
          ) : null}
        </div>
      </CardHeader>
      {focusedSuggestion ? (
        <CardContent className="grid gap-3 border-t p-0 sm:grid-cols-3">
          <div className="p-4">
            <div className="text-xs font-medium text-muted-foreground">Observed model</div>
            <div className="mt-1 font-medium">{focusedSuggestion.model}</div>
          </div>
          <div className="border-t p-4 sm:border-l sm:border-t-0">
            <div className="text-xs font-medium text-muted-foreground">Suggested row</div>
            <div className="mt-1 font-medium">{focusedSuggestion.suggestedModel ?? "Add or verify model rate"}</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Save the model rate that should price this observed local model name.
            </p>
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
  );
}
