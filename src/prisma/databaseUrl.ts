import path from "path";

export const databaseHome = "./src/database";
export const defaultDatabaseHome = "./src/defaultDatabase";
export const databaseName = "shapez_gates_db.sqlite";

// Relative paths are resolved from the project root (where yarn scripts run)
export const databaseUrl =
  process.env.DATABASE_URL ?? `file:${path.resolve(databaseHome, databaseName)}`;
