export type FirstRunCheck = {
  id: string;
  label: string;
  state: "pass" | "warn" | "pending";
  detail: string;
};

export type FirstRunStep = FirstRunCheck & {
  href: string;
  action: string;
};

export type FirstRunStatus = {
  title: string;
  description: string;
  tone: "default" | "warning" | "success";
  primaryAction: {
    label: string;
    href: string;
  };
  checks: FirstRunCheck[];
  setupSteps: FirstRunStep[];
};

export function buildFirstRunStatus({
  rootCount,
  pricedModelCount,
  latestScan,
  interactions,
  unknownCostInteractions
}: {
  rootCount: number;
  pricedModelCount: number;
  latestScan: {
    filesScanned: number;
    recordsImported: number;
    zeroImportExplanation: string | null;
  } | null;
  interactions: number;
  unknownCostInteractions: number;
}): FirstRunStatus {
  const setupSteps: FirstRunStep[] = [
    {
      id: "roots",
      label: "Find local CLI roots",
      state: rootCount > 0 ? "pass" : "warn",
      detail: rootCount > 0
        ? `${rootCount.toLocaleString()} readable roots are available.`
        : "Add Claude Code, Codex, OpenAI, project, or custom usage folders.",
      href: "/settings#custom-folders",
      action: "Configure roots"
    },
    {
      id: "pricing",
      label: "Seed model rates",
      state: pricedModelCount > 0 ? "pass" : "warn",
      detail: pricedModelCount > 0
        ? `${pricedModelCount.toLocaleString()} rated models are available before cost review.`
        : "Seed bundled rates or add a model rate before trusting cost totals.",
      href: "/pricing",
      action: "Open Model Rates"
    },
    {
      id: "scan",
      label: "Run a local scan",
      state: latestScan && latestScan.filesScanned > 0 ? "pass" : latestScan ? "warn" : "pending",
      detail: latestScan
        ? `${latestScan.filesScanned.toLocaleString()} files checked, ${latestScan.recordsImported.toLocaleString()} records imported.`
        : "Scan once after using Claude Code, Codex, or another supported CLI.",
      href: "/settings#scan-controls",
      action: "Scan now"
    },
    {
      id: "health",
      label: "Open Scan Health",
      state: interactions > 0 && unknownCostInteractions === 0 ? "pass" : latestScan ? "warn" : "pending",
      detail: interactions > 0
        ? unknownCostInteractions > 0
          ? `${unknownCostInteractions.toLocaleString()} imported interactions still need cost repair.`
          : "Imported usage has usable model-rate coverage."
        : "Scan Health explains ignored files, parser warnings, and model-rate coverage.",
      href: "/diagnostics",
      action: "Open Scan Health"
    },
    {
      id: "daily-review",
      label: "Open daily review",
      state: interactions > 0 && unknownCostInteractions === 0 ? "pass" : unknownCostInteractions > 0 ? "warn" : "pending",
      detail: interactions > 0
        ? unknownCostInteractions > 0
          ? "Repair unknown costs before treating spend totals as complete."
          : "Today, Sessions, Evidence, and Projects are ready for review."
        : "Daily review starts after the first imported usage interactions.",
      href: unknownCostInteractions > 0 ? "/repair" : "/",
      action: unknownCostInteractions > 0 ? "Open repair" : "Open Today"
    }
  ];

  const checks: FirstRunCheck[] = [
    {
      id: "pricing",
      label: "Model rates loaded",
      state: pricedModelCount > 0 ? "pass" : "warn",
      detail: pricedModelCount > 0
        ? `${pricedModelCount.toLocaleString()} rated models are available.`
        : "Seed or refresh model rates before trusting cost totals."
    },
    {
      id: "roots",
      label: "CLI roots found",
      state: rootCount > 0 ? "pass" : "warn",
      detail: rootCount > 0
        ? `${rootCount.toLocaleString()} readable CLI roots are available.`
        : "No readable Claude, Codex, OpenAI, project, or custom roots were found."
    },
    {
      id: "files",
      label: "Files discovered",
      state: latestScan && latestScan.filesScanned > 0 ? "pass" : latestScan ? "warn" : "pending",
      detail: latestScan
        ? `${latestScan.filesScanned.toLocaleString()} files checked in the latest scan.`
        : "Run a scan to discover local CLI usage files."
    },
    {
      id: "records",
      label: "Records imported",
      state: interactions > 0 ? "pass" : latestScan ? "warn" : "pending",
      detail: interactions > 0
        ? `${interactions.toLocaleString()} interactions are available for analysis.`
        : "No usage interactions have been imported yet."
    },
    {
      id: "cost",
      label: "Cost coverage",
      state: interactions === 0 ? "pending" : unknownCostInteractions > 0 ? "warn" : "pass",
      detail: interactions === 0
        ? "Cost coverage appears after records are imported."
        : unknownCostInteractions > 0
          ? `${unknownCostInteractions.toLocaleString()} interactions still need cost repair.`
          : "Imported interactions have usable cost coverage."
    }
  ];

  if (rootCount === 0) {
    return {
      title: "Add a readable CLI folder",
      description: "TokenTrace stays local-first: set folders on this machine, seed model rates, then scan. No telemetry is sent.",
      tone: "warning",
      primaryAction: { label: "Configure scan roots", href: "/settings#custom-folders" },
      checks,
      setupSteps
    };
  }

  if (pricedModelCount === 0) {
    return {
      title: "Seed local model rates",
      description: "Add bundled or custom model rates before treating local cost totals as complete. No telemetry is sent.",
      tone: "warning",
      primaryAction: { label: "Open Model Rates", href: "/pricing" },
      checks,
      setupSteps
    };
  }

  if (!latestScan) {
    return {
      title: "Run the first local scan",
      description: "TokenTrace has local folders and model rates ready, but no scan history yet.",
      tone: "default",
      primaryAction: { label: "Open scan settings", href: "/settings#scan-controls" },
      checks,
      setupSteps
    };
  }

  if (interactions === 0) {
    return {
      title: "Latest scan imported no usage",
      description: latestScan.zeroImportExplanation ?? "The latest scan did not import usage interactions.",
      tone: "warning",
      primaryAction: { label: "Inspect discovered files", href: "/discovery" },
      checks,
      setupSteps
    };
  }

  if (unknownCostInteractions > 0) {
    return {
      title: "Usage imported with cost repairs",
      description: "TokenTrace found local CLI usage. Some interactions still need model, token, or model-rate repair.",
      tone: "warning",
      primaryAction: { label: "Open repair", href: "/repair" },
      checks,
      setupSteps
    };
  }

  return {
    title: "Usage imported and ready",
      description: "TokenTrace has local CLI usage, model rates, and scan history ready for Today.",
    tone: "success",
    primaryAction: { label: "Inspect sessions", href: "/sessions" },
    checks,
    setupSteps
  };
}
