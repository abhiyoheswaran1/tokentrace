import { getDatabasePath } from "@/src/db/client";
import { resetDatabase } from "@/src/db/reset";

resetDatabase();
console.log(`TokenScope database reset at ${getDatabasePath()}`);
