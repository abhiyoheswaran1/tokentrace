#!/usr/bin/env node
import { createCliContext } from "../src/cli/context.js";
import { runCliCommand } from "../src/cli/commands.js";

const context = createCliContext({ binMetaUrl: import.meta.url });

runCliCommand(context).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
