import { copyFileSync, mkdirSync, rmSync } from "fs";
import path from "path";

// Every test run starts from a fresh copy of the default database (26 official levels, no users)
export default function setup() {
  const dir = path.resolve("tests/.tmp");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  copyFileSync("src/defaultDatabase/shapez_gates_db.sqlite", path.join(dir, "test_db.sqlite"));

  return () => rmSync(dir, { recursive: true, force: true });
}
