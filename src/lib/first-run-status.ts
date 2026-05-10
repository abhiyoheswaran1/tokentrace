export type FirstRunCheck = {
  id: string;
  label: string;
  state: "pass" | "warn" | "pending";
  detail: string;
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
  const checks: FirstRunCheck[] = [
    {
      id: "pricing",
      label: "Pricing loaded",
      state: pricedModelCount > 0 ? "pass" : "warn",
      detail: pricedModelCount > 0
        ? `${pricedModelCount.toLocaleString()} priced models are available.`
        : "Seed or refresh pricing before trusting cost totals."
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
      description: "TokenTrace needs at least one local CLI usage folder before it can scan.",
      tone: "warning",
      primaryAction: { label: "Configure scan roots", href: "/settings" },
      checks
    };
  }

  if (!latestScan) {
    return {
      title: "Run the first local scan",
      description: "TokenTrace has pricing and roots ready, but no scan history yet.",
      tone: "default",
      primaryAction: { label: "Open scan settings", href: "/settings" },
      checks
    };
  }

  if (interactions === 0) {
    return {
      title: "Latest scan imported no usage",
      description: latestScan.zeroImportExplanation ?? "The latest scan did not import usage interactions.",
      tone: "warning",
      primaryAction: { label: "Inspect discovered files", href: "/discovery" },
      checks
    };
  }

  if (unknownCostInteractions > 0) {
    return {
      title: "Usage imported with cost repairs",
      description: "TokenTrace found local CLI usage. Some interactions still need model, token, or pricing repair.",
      tone: "warning",
      primaryAction: { label: "Review unknown costs", href: "/pricing" },
      checks
    };
  }

  return {
    title: "Usage imported and ready",
    description: "TokenTrace has local CLI usage, pricing, and scan history ready for daily review.",
    tone: "success",
    primaryAction: { label: "Inspect sessions", href: "/sessions" },
    checks
  };
}
