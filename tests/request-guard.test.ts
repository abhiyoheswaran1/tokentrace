import { describe, expect, it } from "vitest";
import { evaluateRequestGuard, type RequestGuardResult } from "@/src/lib/request-guard";

const LOOPBACK = "127.0.0.1:3030";

function expectBlocked(result: RequestGuardResult, status: number) {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("expected the request to be blocked");
  expect(result.status).toBe(status);
  expect(result.error).toEqual(expect.any(String));
}

describe("evaluateRequestGuard", () => {
  describe("Host allowlist (DNS-rebinding defense)", () => {
    it("allows loopback hosts for any method", () => {
      for (const host of ["127.0.0.1:3030", "localhost:3030", "[::1]:3030", "::1", "localhost.:3030"]) {
        expect(evaluateRequestGuard({ method: "GET", host }, {})).toEqual({ ok: true });
      }
    });

    it("does not let the trailing-dot strip cross to a non-loopback host", () => {
      expectBlocked(evaluateRequestGuard({ method: "GET", host: "evil.example.com.:3030" }, {}), 421);
    });

    it("rejects a rebound attacker host even on GET", () => {
      expectBlocked(evaluateRequestGuard({ method: "GET", host: "evil.example.com:3030" }, {}), 421);
    });

    it("rejects a missing Host header", () => {
      expectBlocked(evaluateRequestGuard({ method: "GET", host: "" }, {}), 421);
    });

    it("honours TOKENTRACE_ALLOW_REMOTE for non-loopback hosts", () => {
      expect(
        evaluateRequestGuard(
          { method: "GET", host: "192.168.1.20:3030" },
          { TOKENTRACE_ALLOW_REMOTE: "1" }
        )
      ).toEqual({ ok: true });
    });
  });

  describe("CSRF / cross-site defense for state-changing methods", () => {
    it("allows same-origin browser writes", () => {
      expect(
        evaluateRequestGuard(
          {
            method: "POST",
            host: LOOPBACK,
            secFetchSite: "same-origin",
            origin: "http://127.0.0.1:3030"
          },
          {}
        )
      ).toEqual({ ok: true });
    });

    it("allows non-browser writes with no Origin / Sec-Fetch-Site (CLI, curl)", () => {
      expect(evaluateRequestGuard({ method: "POST", host: LOOPBACK }, {})).toEqual({
        ok: true
      });
    });

    it("blocks cross-site browser writes via Sec-Fetch-Site", () => {
      expectBlocked(
        evaluateRequestGuard(
          {
            method: "POST",
            host: LOOPBACK,
            secFetchSite: "cross-site",
            origin: "https://evil.example.com"
          },
          {}
        ),
        403
      );
    });

    it("blocks cross-origin writes inferred from a non-loopback Origin", () => {
      expectBlocked(
        evaluateRequestGuard(
          {
            method: "POST",
            host: LOOPBACK,
            origin: "https://evil.example.com"
          },
          {}
        ),
        403
      );
    });

    it("does not apply CSRF checks to safe methods", () => {
      for (const method of ["GET", "HEAD", "OPTIONS"]) {
        expect(
          evaluateRequestGuard(
            {
              method,
              host: LOOPBACK,
              secFetchSite: "cross-site",
              origin: "https://evil.example.com"
            },
            {}
          )
        ).toEqual({ ok: true });
      }
    });

    it("treats lowercase/odd method casing safely", () => {
      expectBlocked(
        evaluateRequestGuard({ method: "post", host: LOOPBACK, secFetchSite: "cross-site" }, {}),
        403
      );
    });
  });
});
