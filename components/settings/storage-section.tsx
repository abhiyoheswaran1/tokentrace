import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataValue, FieldLabel, MonoText } from "@/components/ui/typography";
import { formatAppVersion } from "@/src/lib/app-version";

export function StorageSection({
  databasePath,
  appVersion,
  storeRaw,
  setStoreRaw
}: {
  databasePath: string;
  appVersion: string;
  storeRaw: boolean;
  setStoreRaw: (value: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Local Storage</CardTitle>
        <CardDescription>SQLite database location and raw-content controls.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Database path</label>
          <pre className="overflow-x-auto rounded-md bg-muted/40 p-3">
            <MonoText>{databasePath}</MonoText>
          </pre>
        </div>
        <div className="grid border-y sm:grid-cols-2 sm:divide-x">
          <div className="p-3">
            <FieldLabel>TokenTrace version</FieldLabel>
            <DataValue className="mt-1">{formatAppVersion(appVersion)}</DataValue>
          </div>
          <div className="p-3">
            <FieldLabel>Release channel</FieldLabel>
            <DataValue className="mt-1">Local npm package</DataValue>
          </div>
        </div>
        <label className="flex items-center gap-3 rounded-md border bg-card p-3 text-sm">
          <input
            type="checkbox"
            checked={storeRaw}
            onChange={(event) => setStoreRaw(event.target.checked)}
          />
          Store raw message content
          <Badge variant={storeRaw ? "warning" : "success"}>
            {storeRaw ? "On" : "Default off"}
          </Badge>
        </label>
      </CardContent>
    </Card>
  );
}
