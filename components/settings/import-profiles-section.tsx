import { Eye, FolderPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataValue, FieldLabel } from "@/components/ui/typography";
import type { ImportProfilesSectionController } from "@/components/settings/use-import-profiles-section";

export function ImportProfilesSection({
  profiles,
  isPending
}: {
  profiles: ImportProfilesSectionController;
  isPending: boolean;
}) {
  const {
    importProfiles,
    toggleImportProfile,
    removeImportProfile,
    newProfileLabel,
    setNewProfileLabel,
    newProfileMatchers,
    setNewProfileMatchers,
    addImportProfile,
    previewPath,
    setPreviewPath,
    previewImportProfile,
    previewResult
  } = profiles;

  return (
    <Card id="import-profiles" className="scroll-mt-28">
      <CardHeader>
        <CardTitle>Import Profiles</CardTitle>
        <CardDescription>
          Safe local log conventions for wrappers and team tools. Profiles add file matchers and evidence labels; prompts are still not sent anywhere.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-3">
          {importProfiles.map((profile) => (
            <div key={profile.id} className="rounded-md border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{profile.label}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">{profile.description}</div>
                </div>
                <Badge variant={profile.enabled ? "success" : "secondary"}>
                  {profile.enabled ? "enabled" : "off"}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {profile.matchers.map((matcher) => (
                  <code key={matcher} className="rounded-sm bg-muted px-1.5 py-0.5 text-xs">{matcher}</code>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => toggleImportProfile(profile.id)}>
                  {profile.enabled ? "Disable" : "Enable"}
                </Button>
                {!profile.builtIn ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeImportProfile(profile.id)}>
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-2 border-t pt-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
          <Input
            value={newProfileLabel}
            onChange={(event) => setNewProfileLabel(event.target.value)}
            placeholder="Team wrapper logs"
          />
          <Input
            value={newProfileMatchers}
            onChange={(event) => setNewProfileMatchers(event.target.value)}
            placeholder=".ndjson, usage-log, agent-run"
          />
          <Button type="button" variant="outline" onClick={addImportProfile}>
            <FolderPlus className="h-4 w-4" />
            Add profile
          </Button>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Extension matchers like <code>.ndjson</code> are added to discovery. Text matchers label evidence when the matched file is imported by a compatible parser.
        </p>
        <div className="space-y-3 rounded-md border p-3">
          <div>
            <FieldLabel>Preview a local file</FieldLabel>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Sample a file before saving matchers. Preview output excludes raw prompt and message text.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={previewPath} onChange={(event) => setPreviewPath(event.target.value)} placeholder="~/Library/Logs/team-ai/usage.jsonl" />
            <Button type="button" variant="outline" onClick={previewImportProfile} disabled={isPending}>
              <Eye className="h-4 w-4" />
              Preview
            </Button>
          </div>
          {previewResult ? (
            <div className="grid gap-3 border-t pt-3 text-sm md:grid-cols-4">
              <div>
                <FieldLabel>Detected</FieldLabel>
                <DataValue size="sm">{previewResult.detected ? "Yes" : "No"}</DataValue>
              </div>
              <div>
                <FieldLabel>Adapter</FieldLabel>
                <DataValue size="sm">{previewResult.adapterName ?? "None"}</DataValue>
              </div>
              <div>
                <FieldLabel>Preview records</FieldLabel>
                <DataValue size="sm">{previewResult.preview.sessions} / {previewResult.preview.interactions}</DataValue>
              </div>
              <div>
                <FieldLabel>Matchers</FieldLabel>
                <div className="mt-1 flex flex-wrap gap-1">
                  {previewResult.recommendedMatchers.map((matcher) => (
                    <code key={matcher} className="rounded-sm bg-muted px-1.5 py-0.5 text-xs">{matcher}</code>
                  ))}
                </div>
              </div>
              <div className="md:col-span-4">
                <FieldLabel>Fields</FieldLabel>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {previewResult.fields.slice(0, 14).join(", ") || "No structured fields detected."}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
