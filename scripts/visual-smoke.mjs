import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.E2E_BASE_URL;

if (!baseUrl) {
  console.error("E2E_BASE_URL is required, for example E2E_BASE_URL=http://127.0.0.1:3030 npm run visual:smoke");
  process.exit(1);
}

const outputDir = path.join(process.cwd(), "docs", "assets", "visual-smoke");
mkdirSync(outputDir, { recursive: true });

const targets = [
  ["overview", "/"],
  ["evidence-unknown-cost", "/evidence?metric=unknown-cost"],
  ["repair", "/repair"],
  ["pricing", "/pricing"]
];

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const [name, route] of targets) {
    const url = new URL(route, baseUrl).toString();
    const output = path.join(outputDir, `${name}.png`);
    console.log(`Navigating to ${url}`);
    const response = await page.goto(url, { waitUntil: "domcontentloaded" });
    if (!response?.ok()) {
      throw new Error(`Visual smoke route failed: ${url} returned ${response?.status() ?? "no response"}`);
    }
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
    await page.locator("body").waitFor({ state: "visible", timeout: 5000 });
    console.log(`Capturing screenshot into ${output}`);
    await page.screenshot({ path: output, fullPage: true, caret: "initial" });
  }
} finally {
  await browser.close();
}

console.log(`Visual smoke screenshots written to ${outputDir}`);
