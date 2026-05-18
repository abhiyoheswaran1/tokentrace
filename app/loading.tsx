import * as React from "react";

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`rounded-md bg-muted ${className}`} />;
}

function SkeletonCard({ wide = false }: { wide?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <SkeletonLine className="h-4 w-32" />
      <SkeletonLine className="mt-3 h-3 w-64 max-w-full" />
      <div className={wide ? "mt-5 grid gap-3 sm:grid-cols-3" : "mt-5 space-y-3"}>
        <SkeletonLine className="h-10 w-full" />
        <SkeletonLine className="h-10 w-full" />
        <SkeletonLine className="h-10 w-full" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div>
        <div className="text-2xl font-semibold tracking-normal text-foreground">Loading local data</div>
        <p className="mt-1 max-w-[65ch] text-sm leading-6 text-muted-foreground">
          Reading the local database and preparing the next view.
        </p>
      </div>
      <div className="animate-pulse space-y-4">
        <SkeletonCard wide />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
