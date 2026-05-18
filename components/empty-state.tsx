import type * as React from "react";
import Link from "next/link";
import { ArrowRight, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  actions = [],
  children
}: {
  title: string;
  description: string;
  actions?: Array<{
    label: string;
    href: string;
    variant?: "default" | "outline";
  }>;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
        <Database className="h-8 w-8 text-muted-foreground" />
        <div className="space-y-2">
          <div className="font-medium">{title}</div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {children ? <div className="flex flex-wrap justify-center gap-2">{children}</div> : null}
        {actions.length ? (
          <div className="flex flex-wrap justify-center gap-2">
            {actions.map((action) => (
              <Button key={action.href} asChild size="sm" variant={action.variant ?? "default"}>
                <Link href={action.href}>
                  {action.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
