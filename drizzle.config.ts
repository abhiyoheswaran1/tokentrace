import type { Config } from "drizzle-kit";

function sqliteUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl?.startsWith("file:")) return databaseUrl.slice("file:".length);
  return process.env.TOKENTRACE_DB ?? ".tokentrace/tokentrace.db";
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: sqliteUrl()
  }
} satisfies Config;
