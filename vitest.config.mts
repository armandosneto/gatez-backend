import path from "path";
import { defineConfig } from "vitest/config";

const testDatabase = path.resolve("tests/.tmp/test_db.sqlite");

export default defineConfig({
  test: {
    globalSetup: "./tests/globalSetup.ts",
    // All test files share one database copy, so run them one at a time
    fileParallelism: false,
    env: {
      DATABASE_URL: `file:${testDatabase}`,
      TEST_DATABASE_PATH: testDatabase,
      JWT_KEY: "test-secret",
      REPORTS_TO_BAN: "2",
      REPORTS_TO_HIDE: "3",
      RATE_LIMIT_LOGIN: "10000",
      RATE_LIMIT_SIGN_UP: "10000",
    },
  },
});
