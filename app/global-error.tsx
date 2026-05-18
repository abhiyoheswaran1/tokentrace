"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center bg-background px-6 py-12 text-foreground">
          <div className="space-y-4">
            <div className="text-sm font-medium text-muted-foreground">TokenTrace error</div>
            <h1 className="text-2xl font-semibold leading-tight tracking-normal">Something went wrong</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              The local dashboard could not render this view. Try again, then open Scan Health if the issue repeats.
            </p>
            {error.digest ? (
              <p className="font-mono text-xs text-muted-foreground">Digest: {error.digest}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={reset}>
                Try again
              </Button>
              <Button asChild variant="outline">
                <Link href="/diagnostics">Open Scan Health</Link>
              </Button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
