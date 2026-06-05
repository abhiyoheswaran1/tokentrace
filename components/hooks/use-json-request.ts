"use client";

import { useCallback, useState, useTransition } from "react";

function errorMessageFrom(body: unknown, fallbackError: string) {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return fallbackError;
}

/**
 * Shared client-side JSON request state: one pending flag, one error slot,
 * and a `send` that parses the response body and surfaces `body.error`
 * (or the caller's fallback) on failure. Replaces the per-component
 * fetch + setSaving + setError + try/catch/finally boilerplate.
 */
export function useJsonRequest(fallbackError: string) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    function send<T = unknown>(
      input: RequestInfo | URL,
      init: RequestInit | undefined,
      onSuccess?: (body: T) => void
    ) {
      startTransition(async () => {
        setError(null);
        try {
          const response = await fetch(input, init);
          const body: unknown = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(errorMessageFrom(body, fallbackError));
          }
          onSuccess?.(body as T);
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : fallbackError);
        }
      });
    },
    [fallbackError]
  );

  return { isPending, error, setError, send };
}
