"use client";

import { useState } from "react";
import { useJsonRequest } from "@/components/hooks/use-json-request";

/**
 * Shared async status for the Settings panel: one pending flag and one
 * status line covering preview, save, scan, and clear requests. Request
 * failures (body error or the fallback) take precedence over the local
 * progress/success message.
 */
export function useSettingsStatus() {
  const { isPending, error, send } = useJsonRequest("Settings request failed.");
  const [statusMessage, setStatusMessage] = useState("");

  return {
    isPending,
    message: error ?? statusMessage,
    setStatusMessage,
    send
  };
}

export type SettingsStatus = ReturnType<typeof useSettingsStatus>;
