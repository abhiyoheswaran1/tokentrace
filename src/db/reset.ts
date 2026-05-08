import { sqlite } from "./client";
import { seedDatabase } from "./seed";

export function resetDatabase() {
  sqlite.exec(`
    DELETE FROM tool_calls;
    DELETE FROM interactions;
    DELETE FROM sessions;
    DELETE FROM projects;
    DELETE FROM scan_files;
    DELETE FROM scan_runs;
  `);
  seedDatabase();
}
