import { copyFileSync, existsSync, mkdirSync } from "fs";
import { databaseHome, databaseName, defaultDatabaseHome } from "./databaseUrl";

/**
 * Creates the live database from the default one (with the official levels) if it doesn't exist yet.
 * Only applies to the default database location; a custom DATABASE_URL is left alone.
 */
export function prepareDatabase(): void {
  if (process.env.DATABASE_URL) {
    return;
  }

  if (!existsSync(databaseHome)) {
    console.log("Database directory was not present. Creating");
    mkdirSync(databaseHome);
  }

  if (!existsSync(`${databaseHome}/${databaseName}`)) {
    console.log("Database file was not present. Copying the default one to the directory");
    copyFileSync(`${defaultDatabaseHome}/${databaseName}`, `${databaseHome}/${databaseName}`);
  }
}
