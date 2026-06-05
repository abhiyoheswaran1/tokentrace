import type { ReactNode } from "react";
import { FieldLabel } from "@/components/ui/typography";

export function SectionTitle({
  id,
  kicker,
  title,
  children
}: {
  id: string;
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-6 border-b p-4">
      <FieldLabel>{kicker}</FieldLabel>
      <h2 className="mt-2 text-lg font-semibold leading-tight">{title}</h2>
      <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted-foreground">{children}</p>
    </div>
  );
}
