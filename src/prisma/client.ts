import { PrismaClient } from "@prisma/client";

const log_sql = process.env.LOG_SQL;

function clientFactory(logSQL: string): PrismaClient {
  if (logSQL !== "true") {
    return new PrismaClient();
  }

  const client = new PrismaClient({
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
