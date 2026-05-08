import { getDatabasePath } from "@/src/db/client";
import { seedDatabase } from "@/src/db/seed";

seedDatabase();
console.log(`TokenScope seed data written to ${getDatabasePath()}`);
