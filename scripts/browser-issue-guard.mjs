#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const baseUrl = process.env.BROWSER_GUARD_BASE_URL ?? process.env.E2E_BASE_URL ?? "http://localhost:3000";
const routes = ["/", "/repair", "/pricing", "/sessions", "/settings"];
const tempDir = fs.mkdtempSync(path.join(process.cwd(), ".browser-guard-"));
const specPath = path.join(tempDir, "browser-issue-guard.spec.mjs");
const configPath = path.join(tempDir, "playwright.config.mjs");
const playwrightBin = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "playwright.cmd" : "playwright"
);

const spec = `
import { test, expect } from "@playwright/test";

const baseUrl = process.env.BROWSER_GUARD_BASE_URL ?? "http://localhost:3000";
const routes = ${JSON.stringify(routes)};

function routeUrl(route) {
  return new URL(route, baseUrl).toString();
}

function installIssueCollectors(page) {
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  return { consoleErrors, pageErrors };
}

async function assertNoRuntimeIssues(page, route, issues) {
  // console errors
  if (issues.consoleErrors.length) {
    throw new Error(route + " console errors: " + issues.consoleErrors.slice(0, 5).join(" | "));
  }

  // page errors
  if (issues.pageErrors.length) {
    throw new Error(route + " page errors: " + issues.pageErrors.slice(0, 5).join(" | "));
  }

  // dev overlay
  const overlayText = await page.locator("nextjs-portal, [data-nextjs-dialog-overlay], [data-nextjs-build-error], [data-nextjs-toast]").evaluateAll((nodes) =>
    nodes.map((node) => node.textContent || "").join(" ")
  );
  const bodyText = await page.locator("body").innerText().catch(() => "");
  if (/\\\\b\\\\d+ Issue\\\\b|Unhandled Runtime Error|Build Error|Hydration failed/i.test(overlayText + " " + bodyText)) {
    throw new Error(route + " dev overlay issue detected");
  }
}

async function assertChartsNotBlank(page, route) {
  // blank charts
  const chartIssues = await page.locator("canvas, svg.recharts-surface").evaluateAll((nodes) => {
    return nodes.flatMap((node, index) => {
      const rect = node.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return [];
      if (node instanceof HTMLCanvasElement) {
        const context = node.getContext("2d");
        if (!context) return ["canvas " + index + " has no 2d context"];
        const width = Math.min(node.width, 32);
        const height = Math.min(node.height, 32);
        if (width <= 0 || height <= 0) return ["canvas " + index + " has no drawable pixels"];
        const data = context.getImageData(0, 0, width, height).data;
        for (let offset = 0; offset < data.length; offset += 4) {
          if (data[offset + 3] > 0 && (data[offset] !== 0 || data[offset + 1] !== 0 || data[offset + 2] !== 0)) return [];
        }
        return ["canvas " + index + " appears blank"];
      }
      const marks = node.querySelectorAll("path, rect, circle, line, polyline, polygon, text");
      return marks.length ? [] : ["svg chart " + index + " has no marks"];
    });
  });
  if (chartIssues.length) throw new Error(route + " blank charts: " + chartIssues.join(" | "));
}

async function assertNoMobileOverflow(page, route) {
  // mobile overflow
  const overflow = await page.evaluate(() => {
    const documentWidth = document.documentElement.scrollWidth;
    const viewportWidth = document.documentElement.clientWidth;
    if (documentWidth <= viewportWidth + 8) return null;
    const offenders = Array.from(document.querySelectorAll("body *"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > viewportWidth + 8 || rect.right > viewportWidth + 8;
      })
      .slice(0, 8)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className: String(element.className || "").slice(0, 120),
          width: Math.round(rect.width),
          right: Math.round(rect.right)
        };
      });
    return { documentWidth, viewportWidth, offenders };
  });
  if (overflow) {
    throw new Error(route + " mobile overflow: " + JSON.stringify(overflow));
  }
}

for (const route of routes) {
  test(route + " desktop issue guard", async ({ page }) => {
    const issues = installIssueCollectors(page);
    const response = await page.goto(routeUrl(route), { waitUntil: "domcontentloaded" });
    expect(response?.ok(), route + " should load").toBeTruthy();
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
    await expect(page.locator("body")).toBeVisible();
    await assertNoRuntimeIssues(page, route, issues);
    await assertChartsNotBlank(page, route);
  });

  test(route + " mobile overflow guard", async ({ page }) => {
    const issues = installIssueCollectors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(routeUrl(route), { waitUntil: "domcontentloaded" });
    expect(response?.ok(), route + " should load on mobile").toBeTruthy();
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
    await assertNoRuntimeIssues(page, route, issues);
    await assertNoMobileOverflow(page, route);
  });
}
`;

fs.writeFileSync(specPath, spec);
fs.writeFileSync(
  configPath,
  `export default {
  testDir: ${JSON.stringify(tempDir)},
  testMatch: "browser-issue-guard.spec.mjs",
  timeout: 30000,
  use: {
    headless: true
  }
};
`
);

const result = spawnSync(
  playwrightBin,
  ["test", "--config", configPath, "--reporter=line"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BROWSER_GUARD_BASE_URL: baseUrl
    },
    stdio: "inherit"
  }
);

fs.rmSync(tempDir, { recursive: true, force: true });
process.exit(result.status ?? 1);
