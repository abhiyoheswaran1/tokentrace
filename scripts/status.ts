import {
  buildClaudeStatusLine,
  claudeStatusLineSetupText,
  getLiveStatusSnapshot,
  renderLiveStatusLine
} from "@/src/lib/live-status";

const args = process.argv.slice(2);

function argValue(name: string) {
  const index = args.indexOf(name);
  if (index < 0) return null;
  return args[index + 1] ?? null;
}

function sourceFileArg() {
  return argValue("--source-file") ?? argValue("--transcript-path");
}

function modeArg() {
  if (args.includes("--compact")) return "compact" as const;
  if (args.includes("--wide")) return "wide" as const;
  return "default" as const;
}

function intervalArg() {
  const value = argValue("--interval");
  if (!value) return 1000;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(250, Math.round(parsed)) : 1000;
}

async function readStdin() {
  let text = "";
  for await (const chunk of process.stdin) {
    text += chunk.toString("utf8");
  }
  return text;
}

async function renderClaudeStatusLine() {
  const text = await readStdin();
  try {
    const input = JSON.parse(text);
    console.log(await buildClaudeStatusLine(input, { mode: modeArg() }));
  } catch {
    console.log("TokenTrace | Claude | status input unavailable");
  }
}

function renderStatus(json: boolean) {
  const status = getLiveStatusSnapshot({ sourceFile: sourceFileArg() });
  if (json) {
    console.log(JSON.stringify(status, null, 2));
  } else {
    console.log(renderLiveStatusLine(status, { mode: modeArg() }));
  }
}

async function watchStatus() {
  const interval = intervalArg();
  let previousLength = 0;
  const write = () => {
    const line = renderLiveStatusLine(getLiveStatusSnapshot({ sourceFile: sourceFileArg() }), { mode: modeArg() });
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

if (args[0] === "statusline" && args[1] === "claude") {
  await renderClaudeStatusLine();
} else if (args[0] === "setup" && args[1] === "claude") {
  console.log(claudeStatusLineSetupText());
} else if (args[0] === "watch") {
  await watchStatus();
} else {
  renderStatus(args.includes("--json"));
}
