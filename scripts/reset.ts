import { getDatabasePath } from "@/src/db/client";
import { resetDatabase } from "@/src/db/reset";

resetDatabase();
console.log(`TokenTrace database reset at ${getDatabasePath()}`);
