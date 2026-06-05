"use client";

import { useState } from "react";
import { parseLimitInput, slugifyId } from "@/components/settings/form-values";
import type { ScopedGuardrail, SettingsPayload } from "@/components/settings/types";

/**
 * Owns the Local Usage Guardrails section state: monthly limits, scoped
 * guardrails, and the new-guardrail draft fields.
 */
export function useGuardrailsSection(initialGuardrails: SettingsPayload["usageGuardrails"]) {
  const [monthlyCostLimitUsd, setMonthlyCostLimitUsd] = useState(
    initialGuardrails.monthlyCostLimitUsd?.toString() ?? ""
  );
  const [monthlyTokenLimit, setMonthlyTokenLimit] = useState(
    initialGuardrails.monthlyTokenLimit?.toString() ?? ""
  );
  const [scopedGuardrails, setScopedGuardrails] = useState<ScopedGuardrail[]>(initialGuardrails.scoped ?? []);
  const [newGuardrailScope, setNewGuardrailScope] = useState<ScopedGuardrail["scope"]>("project");
  const [newGuardrailName, setNewGuardrailName] = useState("");
  const [newGuardrailCost, setNewGuardrailCost] = useState("");
  const [newGuardrailTokens, setNewGuardrailTokens] = useState("");
  const [newGuardrailThreshold, setNewGuardrailThreshold] = useState("0.8");

  function addScopedGuardrail() {
    const name = newGuardrailName.trim();
    if (!name) return;
    const id = slugifyId(newGuardrailScope, name, "guardrail");
    const next: ScopedGuardrail = {
      id,
      scope: newGuardrailScope,
      name,
      monthlyCostLimitUsd: parseLimitInput(newGuardrailCost),
      monthlyTokenLimit: parseLimitInput(newGuardrailTokens),
      warningThreshold: parseLimitInput(newGuardrailThreshold) ?? 0.8
    };
    setScopedGuardrails((current) => [next, ...current.filter((item) => item.id !== id)]);
    setNewGuardrailName("");
    setNewGuardrailCost("");
    setNewGuardrailTokens("");
    setNewGuardrailThreshold("0.8");
  }

  function removeScopedGuardrail(id: string) {
    setScopedGuardrails((current) => current.filter((item) => item.id !== id));
  }

  function payload(): SettingsPayload["usageGuardrails"] {
    return {
      monthlyCostLimitUsd: parseLimitInput(monthlyCostLimitUsd),
      monthlyTokenLimit: parseLimitInput(monthlyTokenLimit),
      scoped: scopedGuardrails
    };
  }

  return {
    monthlyCostLimitUsd,
    setMonthlyCostLimitUsd,
    monthlyTokenLimit,
    setMonthlyTokenLimit,
    scopedGuardrails,
    newGuardrailScope,
    setNewGuardrailScope,
    newGuardrailName,
    setNewGuardrailName,
    newGuardrailCost,
    setNewGuardrailCost,
    newGuardrailTokens,
    setNewGuardrailTokens,
    newGuardrailThreshold,
    setNewGuardrailThreshold,
    addScopedGuardrail,
    removeScopedGuardrail,
    payload
  };
}

export type GuardrailsSectionController = ReturnType<typeof useGuardrailsSection>;
