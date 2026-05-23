type SectionSkeletonProps = {
  heightClass?: string;
  label: string;
};

export function OverviewSectionSkeleton({ heightClass = "h-48", label }: SectionSkeletonProps) {
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

export function OverviewPrimarySkeleton() {
  return (
    <div className="space-y-6">
      <OverviewSectionSkeleton heightClass="h-20" label="Loading usage pulse…" />
      <OverviewSectionSkeleton heightClass="h-36" label="Loading summary cards…" />
      <OverviewSectionSkeleton heightClass="h-72" label="Loading trend chart…" />
    </div>
  );
}

export function OverviewRepairSkeleton() {
  return (
    <div className="space-y-6">
      <OverviewSectionSkeleton heightClass="h-24" label="Loading review status…" />
      <OverviewSectionSkeleton heightClass="h-40" label="Loading repair items…" />
    </div>
  );
}
