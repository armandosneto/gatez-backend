import * as dotenv from "dotenv";

dotenv.config();

import { app } from "./app";
import { copyFileSync, mkdirSync, existsSync } from "fs";

const port = 15001;
const databaseHome = "./src/database";
const defaultDatabaseHome = "./src/defaultDatabase";
const databaseName = "shapez_gates_db.sqlite";

if (!existsSync(databaseHome)) {
  console.log("Database directory was not present. Creating");
  mkdirSync(databaseHome);
}

if (!existsSync(`${databaseHome}/${databaseName}`)) {
  console.log("Database file was not present. Coping the default one to the directory");
  copyFileSync(`${defaultDatabaseHome}/${databaseName}`, `${databaseHome}/${databaseName}`);
}

app.listen(port, () => console.log(`Server is running on port ${port} on env ${process.env.NODE_ENV}!`));
