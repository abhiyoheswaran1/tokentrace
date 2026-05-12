import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RootLayout from "@/app/layout";

describe("RootLayout", () => {
  it("constrains mobile page width so wide child controls scroll internally", () => {
    const html = renderToStaticMarkup(<RootLayout><div /></RootLayout>);

    expect(html).toContain("overflow-x-hidden");
    expect(html).toContain("max-w-[100vw]");
  });
});
