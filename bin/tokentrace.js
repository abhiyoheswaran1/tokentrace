#!/usr/bin/env node

async function loadRunCli() {
  try {
    // Published installs always ship the compiled CLI (prepack runs build:runtime).
    const { runCli } = await import("../dist/cli/main.mjs");
    return runCli;
  } catch {
    // Dev checkout without dist: load the TypeScript sources through tsx.
    const { register } = await import("tsx/esm/api");
    register();
    const { runCli } = await import("../src/cli/main.ts");
    return runCli;
  }
}

loadRunCli()
  .then((runCli) => runCli(import.meta.url))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
