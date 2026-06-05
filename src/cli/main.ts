import { createCliContext } from "./context.js";
import { runCliCommand } from "./commands.js";

export async function runCli(binMetaUrl: string): Promise<void> {
  try {
    const context = createCliContext({ binMetaUrl });
    await runCliCommand(context);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
