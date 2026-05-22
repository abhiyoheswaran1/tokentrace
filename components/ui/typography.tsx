import * as React from "react";
import { cn } from "@/src/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full max-w-full flex-col justify-between gap-4 sm:flex-row sm:items-end", className)}>
      <div className="min-w-0 max-w-full">
        <h1 className="text-2xl font-semibold leading-tight tracking-normal text-foreground">{title}</h1>
        <p className="mt-1 max-w-full wrap-break-word text-sm leading-6 text-muted-foreground sm:max-w-[65ch]">{description}</p>
      </div>
      {actions ? <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{actions}</div> : null}
    </div>
  );
}

export function FieldLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-xs font-medium leading-none text-muted-foreground", className)}
      {...props}
    />
  );
}

export function DataValue({
  className,
  size = "sm",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={cn(
        "font-semibold leading-tight tabular-nums text-foreground",
        size === "sm" && "text-sm",
        size === "md" && "text-xl",
        size === "lg" && "text-2xl",
        className
      )}
      {...props}
    />
  );
}

export function MonoText({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("font-mono text-xs leading-relaxed tabular-nums text-foreground", className)}
      {...props}
    />
  );
}
