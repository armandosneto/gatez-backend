# Gatez back-end

REST API for [Gatez](https://github.com/RafRunner/Gatez), a fork of shapez.io that turns the puzzle DLC into a game about logic gates and digital circuits.

The game works offline with only the official levels (from a bundled snapshot). This server adds:

-   user accounts (name + password, JWT auth);
-   the official level list, unlocked in order as the player progresses;
-   uploading, playing, searching, liking, rating and reporting community puzzles;
-   per-puzzle statistics (completions, average time, computed difficulty) and trophies;
-   community translations of puzzle titles/descriptions, with moderation;
-   moderation tools (roles, bans, hiding puzzles), API-only for now.

## Stack

Node.js + TypeScript, Express 5, Prisma 7 with SQLite (through the `better-sqlite3` driver adapter), `jsonwebtoken` + `bcryptjs` for auth, `express-validator` for input validation, `tsx` for development.

## Quick start

Requirements: Node.js 20.19+ (tested on 22) and Yarn 1 (`npm install -g yarn`).

```bash
yarn                 # install dependencies and generate the Prisma client (src/generated/)
echo 'JWT_KEY="change-me"' > .env
yarn dev             # http://localhost:15001, restarts on file changes
```

The default port is 15001 (configurable with `PORT`). On the first run, if `src/database/shapez_gates_db.sqlite` doesn't exist, the server copies `src/defaultDatabase/shapez_gates_db.sqlite` there. That default database has no users and contains the **26 official levels** (in English, with pt-BR translations), from "Welcome" to "JK Flip Flop".

To start with an empty database instead, run `yarn prisma migrate dev`.

The game expects the server at `http://localhost:15001` (see the front-end [docs/DEVELOPMENT.md](https://github.com/RafRunner/Gatez/blob/master/docs/DEVELOPMENT.md)).

### Environment variables (`.env`)

| Variable          | Required | Default | Description                                                      |
| ----------------- | -------- | ------- | ---------------------------------------------------------------- |
| `JWT_KEY`         | yes      | —       | Secret used to sign the JWTs.                                    |
| `NODE_ENV`        | no       | `dev`   | Only printed on startup; there is no production mode yet.        |
| `DATABASE_URL`    | no       | `file:<project>/src/database/shapez_gates_db.sqlite` | SQLite file to use. The default-database copy on first run only applies to the default path. |
| `LOG_SQL`         | no       | `false` | `true` logs every SQL query Prisma runs, with timing.            |
| `REPORTS_TO_HIDE` | no       | `10`    | Number of open or legit reports that hides a puzzle automatically. |
| `REPORTS_TO_BAN`  | no       | `5`     | Legit reports against a user's puzzles that trigger an automatic 100-day ban. |
| `JWT_EXPIRES_IN`  | no       | `30d`   | Token lifetime ([`ms`](https://github.com/vercel/ms) format, e.g. `12h`, `7d`). |
| `PORT`            | no       | `15001` | HTTP port. |
| `RATE_LIMIT_LOGIN` | no      | `20`    | Login attempts per IP every 15 minutes. |
| `RATE_LIMIT_SIGN_UP` | no    | `10`    | Accounts created per IP per hour. |
| `TRUST_PROXY`     | no       | —       | Number of reverse proxies in front of the server, so rate limiting sees the real client IP. |

### Scripts

| Command                   | What it does                                    |
| ------------------------- | ----------------------------------------------- |
| `yarn dev`                | Prepares the database (copies the default one if missing, applies pending migrations) and runs `src/server.ts` with `tsx watch` |
| `yarn db:prepare`         | Only the database preparation step              |
| `yarn build`              | Generates the Prisma client and compiles to `dist/` |
| `yarn start`              | Runs the compiled server                        |
| `yarn test`               | Runs the test suite (Vitest + Supertest) on a temporary copy of the default database |
| `yarn prisma studio`      | Opens a browser UI for the database             |
| `yarn prisma migrate dev` | Applies/creates migrations                      |

## Project layout

```
prisma.config.ts         Prisma CLI config (schema, migrations, database URL)
prisma/
  schema.prisma          data model (see docs/DATA_MODEL.md)
  migrations/            migration history
src/
  server.ts              entry point: loads .env, prepares the database file, listens on :15001
  app.ts                 Express app: json, helmet, cors, locale middleware, routes, error handler
  Routes/                routers per area (login, user, puzzles, moderation)
  Controllers/           read the request, call services, shape the response
  Services/              business logic and Prisma queries
  middlewares/           auth (JWT), role check, pagination, locale, validation errors
  Models/                shared TypeScript types (UserRole, pagination, puzzle DTOs)
  Errors/                AppError + ErrorType enum (error codes the front-end translates)
  utils/                 difficulty/trophy formulas, time helpers
  prisma/                Prisma client + database URL
  generated/prisma/      generated Prisma client (git-ignored, created by `prisma generate`)
  defaultDatabase/       SQLite file with the official levels, copied on first run
tests/                   API tests; each run uses a fresh copy of the default database
  database/              the live database (git-ignored)
```

Request flow: `Route → (ensureAuthenticated → ensureHasRole → express-validator → checkForErrors → paginated) → Controller → Service → Prisma`. Any thrown `AppError` is turned into `{ status, message, error }` by the handler in `app.ts`; anything else becomes a 500.

## Documentation

-   [docs/API.md](docs/API.md) — every endpoint, payload and error convention
-   [docs/DATA_MODEL.md](docs/DATA_MODEL.md) — tables, relationships and how the official levels are stored
-   [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) — bugs and security gaps found in review

## Roadmap

-   A Dockerfile;
-   E-mail and password recovery;
-   Validate submitted solutions on the server (puzzles themselves are already validated);
-   Profanity checks on submitted text;
-   Pagination on puzzle lists (currently capped at 500);
-   A moderation UI;
-   Deploy.

## Authors

Rafael Santana and Armando Soares e Silva Neto.

## License

MIT — see [LICENSE](LICENSE).
