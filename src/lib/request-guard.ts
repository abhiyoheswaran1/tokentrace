/**
 * Perimeter guard for the local dashboard's HTTP surface.
 *
 * The dashboard is unauthenticated by design (local-first, single user), so it
 * relies entirely on *who can reach it* and *who is allowed to drive it*:
 *
 *  - Host allowlist: rejects requests whose `Host` header is not a loopback
 *    name. This defeats DNS-rebinding attacks, where a malicious page rebinds
 *    its own domain to 127.0.0.1 to turn cross-origin reads into "same-origin"
 *    ones. A rebound request still carries the attacker's `Host`.
 *  - Cross-site write protection: rejects state-changing requests that a
 *    browser reports as cross-site (or that carry a non-loopback `Origin`).
 *    This defeats CSRF, where a malicious page silently POSTs to the dashboard.
 *
 * Non-browser clients (CLI, curl) send neither `Origin` nor `Sec-Fetch-*` and
 * are allowed through — the threat model is a browser being weaponised by a
 * third-party site, not the user's own tooling.
 *
 * This module is intentionally dependency-free so it can run in the Next.js
 * middleware (edge) runtime and be unit-tested in isolation.
 */

export type RequestGuardInput = {
  method: string;
  host: string | null | undefined;
  origin?: string | null;
  secFetchSite?: string | null;
};

export type RequestGuardEnv = {
  TOKENTRACE_ALLOW_REMOTE?: string;
};

export type RequestGuardResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Extract the lowercased hostname from a `Host`/authority value, dropping any port. */
function hostnameOf(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "";
  // Bracketed IPv6 literal, optionally with a port: [::1]:3030
  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    return end === -1 ? trimmed : trimmed.slice(0, end + 1);
  }
  // Bare IPv6 (multiple colons) has no port suffix we can strip safely.
  if (trimmed.split(":").length > 2) return trimmed;
  const colon = trimmed.indexOf(":");
  const host = colon === -1 ? trimmed : trimmed.slice(0, colon);
  // Treat the FQDN trailing-dot form ("localhost.") as the bare name. This only
  // ever loosens matching toward the canonical name, never across it.
  return host.endsWith(".") ? host.slice(0, -1) : host;
}

function isLoopbackAuthority(value: string | null | undefined): boolean {
  if (!value) return false;
  return LOOPBACK_HOSTNAMES.has(hostnameOf(value));
}

function originIsLoopback(origin: string | null | undefined): boolean {
  if (!origin) return false;
  try {
    return LOOPBACK_HOSTNAMES.has(new URL(origin).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function evaluateRequestGuard(
  input: RequestGuardInput,
  env: RequestGuardEnv = {}
): RequestGuardResult {
  const allowRemote = env.TOKENTRACE_ALLOW_REMOTE === "1";

  if (!allowRemote && !isLoopbackAuthority(input.host)) {
    return {
      ok: false,
      status: 421,
      error:
        "Request Host is not a recognised local address. TokenTrace only serves loopback hosts unless TOKENTRACE_ALLOW_REMOTE=1."
    };
  }

  const method = input.method.toUpperCase();
  if (SAFE_METHODS.has(method)) {
    return { ok: true };
  }

  if (allowRemote) {
    return { ok: true };
  }

  const secFetchSite = input.secFetchSite?.toLowerCase();
  if (secFetchSite) {
    if (secFetchSite === "same-origin" || secFetchSite === "none") {
      return { ok: true };
    }
    return {
      ok: false,
      status: 403,
      error: "Cross-site request blocked. TokenTrace only accepts same-origin writes."
    };
  }

  // No Sec-Fetch-Site (older browser or non-browser client): fall back to Origin.
  if (input.origin && !originIsLoopback(input.origin)) {
    return {
      ok: false,
      status: 403,
      error: "Cross-origin request blocked. TokenTrace only accepts same-origin writes."
    };
  }

  return { ok: true };
}
