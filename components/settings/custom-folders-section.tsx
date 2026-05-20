import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MonoText } from "@/components/ui/typography";

export function CustomFoldersSection({
  customFolders,
  newFolder,
  setNewFolder,
  addFolder,
  removeFolder
}: {
  customFolders: string[];
  newFolder: string;
  setNewFolder: (value: string) => void;
  addFolder: () => void;
  removeFolder: (folder: string) => void;
}) {
  return (
    <Card id="custom-folders" className="scroll-mt-28">
      <CardHeader>
        <CardTitle>Custom Folders</CardTitle>
        <CardDescription>Add folders outside the default Claude, Codex, OpenAI, and project paths.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={newFolder}
            onChange={(event) => setNewFolder(event.target.value)}
            placeholder="~/Library/Logs/my-ai-cli"
          />
          <Button type="button" variant="outline" onClick={addFolder}>
            <FolderPlus className="h-4 w-4" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {customFolders.length ? (
            customFolders.map((folder) => (
              <div key={folder} className="flex items-center justify-between gap-3 border-y py-2">
                <MonoText className="min-w-0 truncate text-muted-foreground">{folder}</MonoText>
                <Button type="button" size="sm" variant="ghost" onClick={() => removeFolder(folder)}>
                  Remove
                </Button>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No custom folders configured.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
