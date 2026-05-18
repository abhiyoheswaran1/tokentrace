import fs from "node:fs";
import path from "node:path";
import { buildAgentDiscoveryManifest } from "@/src/lib/agent-discovery";

function usage() {
  return `Usage:
  tokentrace agent --json
  tokentrace capabilities --json

Options:
  --json       Print the machine-readable agent discovery manifest
  -h, --help   Print agent discovery help`;
}

function packageVersion() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    return typeof packageJson.version === "string" ? packageJson.version : undefined;
  } catch {
    return undefined;
  }
}

function fail(message: string): never {
  console.error(message);
  console.error(usage());
  process.exit(1);
}

let json = false;
let help = false;

for (const arg of process.argv.slice(2)) {
  if (arg === "--json") {
    json = true;
  } else if (arg === "--help" || arg === "-h") {
    help = true;
  } else if (arg.startsWith("-")) {
    fail(`Unknown option: ${arg}`);
  } else {
    fail(`Unknown argument: ${arg}`);
  }
}

if (help || !json) {
  console.log(usage());
  process.exit(0);
}

console.log(JSON.stringify(buildAgentDiscoveryManifest({ version: packageVersion() }), null, 2));
