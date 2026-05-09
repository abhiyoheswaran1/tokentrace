import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HelpTooltip } from "@/components/ui/help-tooltip";

describe("HelpTooltip", () => {
  it("renders an accessible focusable tooltip trigger and tooltip body", () => {
    const html = renderToStaticMarkup(
      <HelpTooltip id="processed-tokens-help" label="Processed tokens" description="Includes cache tokens." />
    );

    expect(html).toContain("type=\"button\"");
    expect(html).toContain("aria-label=\"Processed tokens details\"");
    expect(html).toContain("aria-describedby=\"processed-tokens-help\"");
    expect(html).toContain("role=\"tooltip\"");
    expect(html).toContain("bg-card");
    expect(html).toContain("shadow-md");
    expect(html).toContain("Includes cache tokens.");
  });
});
