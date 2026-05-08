import { getDatabasePath, sqlite } from "@/src/db/client";
import { applyMigrations } from "@/src/db/migrate-core";

applyMigrations(sqlite);
console.log(`TokenTrace database migrated at ${getDatabasePath()}`);
