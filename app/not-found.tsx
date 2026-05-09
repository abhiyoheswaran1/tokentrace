import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <div className="space-y-4">
        <div className="text-sm font-medium text-muted-foreground">404</div>
        <h1 className="text-2xl font-semibold leading-tight tracking-normal text-foreground">Page not found</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          This local TokenTrace route is not available. Return to Overview or use the sidebar navigation.
        </p>
        <Button asChild>
          <Link href="/">Back to Overview</Link>
        </Button>
      </div>
    </main>
  );
}
