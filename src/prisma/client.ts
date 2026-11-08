import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";
import { databaseUrl } from "./databaseUrl";

const log_sql = process.env.LOG_SQL;

function createAdapter() {
  // Prisma <= 6 stored DateTime columns in SQLite as unix epoch milliseconds, keep that format
  return new PrismaBetterSqlite3({ url: databaseUrl.replace(/^file:/, "") }, { timestampFormat: "unixepoch-ms" });
}

function clientFactory(logSQL: string) {
  if (logSQL !== "true") {
    return new PrismaClient({ adapter: createAdapter() });
  }

  const client = new PrismaClient({
    adapter: createAdapter(),
    log: [
      {
        emit: "event",
        level: "query",
      },
      {
        emit: "stdout",
        level: "error",
      },
      {
        emit: "stdout",
        level: "info",
      },
      {
        emit: "stdout",
        level: "warn",
      },
    ],
  });

  client.$on("query", (e) => {
    console.log("\nQuery: " + e.query);
    console.log("Params: " + e.params);
    console.log("Duration: " + e.duration + "ms");
  });

  return client;
}

const client = clientFactory(log_sql ?? "false");

export { client };
