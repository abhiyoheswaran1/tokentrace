import { parseStatusArgs, statusUsage, type StatusCliOptions } from "@/src/lib/status-cli";

const args = process.argv.slice(2);
let options: StatusCliOptions;

export {};

async function readStdin() {
  let text = "";
  for await (const chunk of process.stdin) {
    text += chunk.toString("utf8");
  }
  return text;
}

try {
  options = parseStatusArgs(args);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid status arguments.");
  console.error(statusUsage());
  process.exit(1);
}

if (options.help) {
  console.log(statusUsage());
  process.exit(0);
}

async function renderClaudeStatusLine(statusOptions: Extract<StatusCliOptions, { command: "statusline" }>) {
  const { buildClaudeStatusLine } = await import("@/src/lib/claude-statusline");
  const text = await readStdin();
  try {
    const input = JSON.parse(text);
    console.log(await buildClaudeStatusLine(input, { mode: statusOptions.mode }));
  } catch {
    console.log("TokenTrace | Claude | status input unavailable");
  }
}

async function renderStatus(statusOptions: Extract<StatusCliOptions, { command: "status" }>) {
  const { getLiveStatusSnapshot, renderLiveStatusLine } = await import("@/src/lib/live-status");
  const status = getLiveStatusSnapshot({ sourceFile: statusOptions.sourceFile });
  if (statusOptions.json) {
    console.log(JSON.stringify(status, null, 2));
  } else {
    console.log(renderLiveStatusLine(status, { mode: statusOptions.mode }));
  }
}

async function watchStatus(statusOptions: Extract<StatusCliOptions, { command: "watch" }>) {
  const { getLiveStatusSnapshot, renderLiveStatusLine } = await import("@/src/lib/live-status");
  const interval = statusOptions.interval;
  let previousLength = 0;
  const write = () => {
    const line = renderLiveStatusLine(getLiveStatusSnapshot({ sourceFile: statusOptions.sourceFile }), {
      mode: statusOptions.mode
    });
    const padded = line.padEnd(previousLength, " ");
    previousLength = line.length;
    process.stdout.write(`\r${padded}`);
  };

  write();
  const timer = setInterval(write, interval);
  const stop = () => {
    clearInterval(timer);
    process.stdout.write("\n");
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

if (options.command === "statusline") {
  await renderClaudeStatusLine(options);
} else if (options.command === "setup") {
  const { claudeStatusLineSetupText } = await import("@/src/lib/claude-statusline");
  console.log(claudeStatusLineSetupText());
} else if (options.command === "watch") {
  await watchStatus(options);
} else {
  await renderStatus(options);
}
