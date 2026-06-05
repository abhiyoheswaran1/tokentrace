export function help(): string {
  return `TokenTrace CLI

Usage:
  tokentrace              Start local dashboard
  tokentrace serve        Start local dashboard
  tokentrace agent --json
                          Print machine-readable agent discovery manifest
  tokentrace capabilities --json
                          Alias for agent discovery manifest
  tokentrace roadmap --json
                          Print release status handoff
  tokentrace mcp          Start the local stdio MCP server
  tokentrace mcp selftest --json
                          Verify the local MCP entrypoint without scanning files
  tokentrace scan         Scan local AI CLI usage logs
  tokentrace doctor --json
                          Inspect scan health and repair recommendations
  tokentrace evidence --json
                          Print metric evidence trail as JSON
  tokentrace digest --json
                          Print current-month local usage digest
  tokentrace report --markdown
                          Print a deterministic local Markdown report
  tokentrace review --json
                          Print post-session review movement as JSON
  tokentrace insights --json
                          Print local recommendations as JSON
  tokentrace repair --json
                          Print unknown-cost repair queue as JSON
  tokentrace status --json
                          Print local usage status as JSON
  tokentrace statusline claude
                          Render a Claude Code status line from stdin
  tokentrace statusline setup claude
                          Print Claude Code statusLine setup JSON
  tokentrace watch --session
                          Watch local usage status in the terminal
  tokentrace pricing refresh
                          Refresh public model prices
  tokentrace run <cmd>    Run a command and record wrapper diagnostics
  tokentrace reset        Reset local database
  tokentrace --version    Print version

Examples:
  tokentrace serve --port 3210 --no-open
  tokentrace scan --json
  tokentrace doctor --json`;
}

export function serveHelp(): string {
  return `TokenTrace dashboard server

Usage:
  tokentrace serve
  tokentrace serve --port 3210
  tokentrace serve --hostname 127.0.0.1 --no-open

Options:
  -p, --port <port>          Use a fixed port. Also reads TOKENTRACE_PORT or PORT.
  -H, --hostname <host>      Bind to a fixed host. Defaults to 127.0.0.1.
      --no-open              Do not open a browser after the server starts.
  -h, --help                 Print serve help

If the fixed port is busy, choose another with --port or omit --port for automatic selection.`;
}
