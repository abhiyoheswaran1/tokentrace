import type { ModelAliasSuggestion } from "@/src/lib/analytics";
import { formatTokens } from "@/src/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EditablePricingRow } from "./pricing-workflow";

export function ModelAliasSuggestionsTable({
  aliasSuggestions,
  onAddRow
}: {
  aliasSuggestions: ModelAliasSuggestion[];
  onAddRow: (seed?: Partial<EditablePricingRow>) => void;
}) {
  if (!aliasSuggestions.length) return null;

  return (
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
                      {suggestion.repairHref.startsWith("/pricing") ? "Set model rate" : "Review parser"}
                    </a>
                    <button
                      type="button"
                      className="font-medium text-muted-foreground underline-offset-4 hover:underline"
                      onClick={() => onAddRow({ model: suggestion.suggestedModel ?? suggestion.model })}
                    >
                      Add row
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
