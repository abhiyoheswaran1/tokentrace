import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { evaluateRequestGuard } from "@/src/lib/request-guard";

// Guard every API route. The dashboard is unauthenticated, so this perimeter
// check (loopback Host allowlist + same-origin write enforcement) is what keeps
// a malicious web page or a DNS-rebinding attacker from reading local AI usage
// data, previewing arbitrary files, or wiping the database from the user's
// browser. See src/lib/request-guard.ts for the rationale.
export const config = {
  matcher: "/api/:path*"
};

export function middleware(request: NextRequest) {
  const verdict = evaluateRequestGuard(
    {
      method: request.method,
      host: request.headers.get("host"),
      origin: request.headers.get("origin"),
      secFetchSite: request.headers.get("sec-fetch-site")
    },
    { TOKENTRACE_ALLOW_REMOTE: process.env.TOKENTRACE_ALLOW_REMOTE }
  );

  if (!verdict.ok) {
    return NextResponse.json({ error: verdict.error }, { status: verdict.status });
  }

  return NextResponse.next();
}
