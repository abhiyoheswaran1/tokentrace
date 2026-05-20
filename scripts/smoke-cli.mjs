#!/usr/bin/env node

import process from "node:process";
import { cleanupSmokeContext, createSmokeContext } from "./smoke-cli/context.mjs";
import { smokeCliData, smokeCliDiscovery } from "./smoke-cli/commands.mjs";
import { smokeWatch } from "./smoke-cli/runtime.mjs";
import { smokeServe } from "./smoke-cli/serve.mjs";

const context = await createSmokeContext();

try {
  await smokeCliDiscovery(context);
  await smokeCliData(context);
  await smokeWatch(context);
  await smokeServe(context);
  console.log("TokenTrace CLI smoke passed");
} finally {
  await cleanupSmokeContext(context);
}

process.exit(0);
