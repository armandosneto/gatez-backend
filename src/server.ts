import * as dotenv from "dotenv";

dotenv.config({ quiet: true });
process.env.NODE_ENV ??= "dev";

import { app } from "./app";
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { databaseHome, databaseName, defaultDatabaseHome } from "./prisma/databaseUrl";

const port = +(process.env.PORT ?? 15001);

if (!existsSync(databaseHome)) {
  console.log("Database directory was not present. Creating");
  mkdirSync(databaseHome);
}

if (!existsSync(`${databaseHome}/${databaseName}`)) {
  console.log("Database file was not present. Coping the default one to the directory");
  copyFileSync(`${defaultDatabaseHome}/${databaseName}`, `${databaseHome}/${databaseName}`);
}

app.listen(port, () => console.log(`Server is running on port ${port} on env ${process.env.NODE_ENV}!`));
