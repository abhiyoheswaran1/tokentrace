import { Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
        <Database className="h-8 w-8 text-muted-foreground" />
        <div className="font-medium">{title}</div>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
