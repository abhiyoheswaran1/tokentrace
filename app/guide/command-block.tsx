import type { ReactNode } from "react";
import { MonoText } from "@/components/ui/typography";

export function CommandBlock({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-muted/40 p-3">
      <MonoText>{children}</MonoText>
    </div>
  );
}
