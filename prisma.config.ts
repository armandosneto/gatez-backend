import "dotenv/config";
import { defineConfig } from "prisma/config";
import { databaseUrl } from "./src/prisma/databaseUrl";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
