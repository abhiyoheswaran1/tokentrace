import { getDatabasePath } from "@/src/db/client";
import { seedDatabase } from "@/src/db/seed";

seedDatabase();
console.log(`TokenTrace seed data written to ${getDatabasePath()}`);
