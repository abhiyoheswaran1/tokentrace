type ChartSkeletonProps = {
  heightClass?: string;
  label?: string;
};

export function ChartSkeleton({ heightClass = "h-64", label = "Loading chart…" }: ChartSkeletonProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 text-xs text-muted-foreground ${heightClass}`}
      role="status"
      aria-live="polite"
    >
      {label}
    </div>
  );
}
