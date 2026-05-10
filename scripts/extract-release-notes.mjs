#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

function normalizeVersion(version) {
  return version.replace(/^v/i, "").trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractChangelogSection(changelogSource, requestedVersion) {
  const version = normalizeVersion(requestedVersion);
  const headerPattern = new RegExp(
    `^## \\[?${escapeRegExp(version)}\\]?(?:\\s+-\\s+.*)?$`,
    "m"
  );
  const match = changelogSource.match(headerPattern);

  if (!match || match.index === undefined) {
    throw new Error(`No changelog section found for ${version}`);
  }

  const sectionStart = match.index;
  const afterHeader = changelogSource.slice(sectionStart + match[0].length);
  const nextSectionMatch = afterHeader.match(/\n## /);
  const sectionEnd =
    nextSectionMatch?.index === undefined
      ? changelogSource.length
      : sectionStart + match[0].length + nextSectionMatch.index;

  return changelogSource.slice(sectionStart, sectionEnd).trim();
}

function parseArgs(argv) {
  const args = [...argv];
  const version = args.shift();
  const options = {
    changelogPath: "CHANGELOG.md",
    outPath: null
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--changelog") {
      options.changelogPath = args[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--out") {
      options.outPath = args[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!version) {
    throw new Error("Usage: node scripts/extract-release-notes.mjs <version|tag> [--changelog CHANGELOG.md] [--out file]");
  }

  return { version, ...options };
}

function main() {
  const { version, changelogPath, outPath } = parseArgs(process.argv.slice(2));
  const absoluteChangelogPath = path.resolve(process.cwd(), changelogPath);
  const changelogSource = readFileSync(absoluteChangelogPath, "utf8");
  const notes = extractChangelogSection(changelogSource, version);

  if (outPath) {
    writeFileSync(path.resolve(process.cwd(), outPath), `${notes}\n`);
    return;
  }

  process.stdout.write(`${notes}\n`);
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
