import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageHeader } from "@/components/ui/typography";

describe("PageHeader", () => {
  it("keeps heading copy inside the mobile content width", () => {
    const html = renderToStaticMarkup(
      <PageHeader
        title="Overview"
        description="Local token, cost, model, and session analytics across AI CLI tools."
      />
    );

    expect(html).toContain("w-full max-w-full");
    expect(html).toContain("max-w-full");
    expect(html).toContain("break-words");
  });
});
