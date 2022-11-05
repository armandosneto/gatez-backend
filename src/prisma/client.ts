import { PrismaClient } from "@prisma/client";

const env = process.env.NODE_ENV;

const client = new PrismaClient({
  log:
    env === "dev"
      ? [
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
        ]
      : [],
});

if (env === "dev") {
  client.$on("query", (e) => {
    console.log("Query: " + e.query);
    console.log("Params: " + e.params);
    console.log("Duration: " + e.duration + "ms");
  });
}

export { client };
