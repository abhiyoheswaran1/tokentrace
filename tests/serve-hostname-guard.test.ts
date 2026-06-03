import { describe, expect, it } from "vitest";
import { assertHostnameAllowed, isLoopbackHostname } from "@/src/cli/serve.js";

describe("serve hostname guard", () => {
  it("recognises loopback hostnames", () => {
    for (const host of ["127.0.0.1", "localhost", "::1", "[::1]", "LOCALHOST"]) {
      expect(isLoopbackHostname(host)).toBe(true);
    }
  });

  it("treats bind-all and LAN addresses as non-loopback", () => {
    for (const host of ["0.0.0.0", "192.168.1.10", "10.0.0.5", "::", "myhost.local"]) {
      expect(isLoopbackHostname(host)).toBe(false);
    }
  });

  it("allows loopback binds without any override", () => {
    expect(() => assertHostnameAllowed("127.0.0.1", {})).not.toThrow();
    expect(() => assertHostnameAllowed("localhost", {})).not.toThrow();
  });

  it("refuses non-loopback binds by default and explains the risk", () => {
    expect(() => assertHostnameAllowed("0.0.0.0", {})).toThrow(/non-loopback/i);
    expect(() => assertHostnameAllowed("0.0.0.0", {})).toThrow(/TOKENTRACE_ALLOW_REMOTE/);
  });

  it("permits non-loopback binds only when explicitly opted in", () => {
    expect(() => assertHostnameAllowed("0.0.0.0", { TOKENTRACE_ALLOW_REMOTE: "1" })).not.toThrow();
    expect(() => assertHostnameAllowed("192.168.1.10", { TOKENTRACE_ALLOW_REMOTE: "1" })).not.toThrow();
  });
});
