// Run before `prisma migrate deploy` (see package.json), so a fresh install starts from the
// default database instead of an empty one created by the migration.
import "dotenv/config";
import { prepareDatabase } from "../prisma/prepareDatabase";

prepareDatabase();
