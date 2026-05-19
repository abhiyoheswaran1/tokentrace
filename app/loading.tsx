import * as React from "react";
import Link from "next/link";

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
          Reading the local database and preparing the next view. No telemetry is sent while this view loads.
        </p>
      </div>
      <div className="grid gap-3 rounded-lg border bg-card p-3 text-sm md:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">What is happening</div>
          <p className="mt-1 leading-6 text-muted-foreground">
            Local database only. TokenTrace is loading scan, evidence, and model-rate records already stored on this machine.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">Next step</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <Link href="/evidence?metric=processed-tokens" className="font-medium text-primary underline-offset-4 hover:underline">
              View evidence
            </Link>
            <Link href="/diagnostics" className="font-medium text-primary underline-offset-4 hover:underline">
              Open Scan Health
            </Link>
          </div>
        </div>
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
