# Known issues

## Fixed (November 2026)

Fixed in the commit after the code review:

-   The pending-translations list filtered `approved: true`, so it was always empty. It now filters `approved: false`.
-   `GET /v1/moderation/ban` returned 500 because it filtered on a non-existent `lifted` field.
-   The `REPORTS_TO_BAN` env var wasn't read (the code read `REPORTS_TO_HIDE`).
-   Auto-ban counted reports **made by** a user instead of legit reports **against their puzzles**. It also ran before the report was saved and didn't await the ban.
-   `changeRole` didn't await the user lookup (500 instead of 404).
-   `msToDays`/`daystoMs` used 24 minutes as one day.
-   `totalPages` over-counted when `total` was a multiple of `pageSize`.
-   `GET /moderation/reports` validated `puzzleId` as a UUID and passed it as a string; omitting `reviewed` showed only unreviewed reports. Now `reviewed` is optional and omitting it returns all reports.
-   `POST /complete` returned 500 if the puzzle hadn't been downloaded first.
-   `GET /moderation/translations` had no role check (now moderator).
-   A missing translation returned `PuzzleNotFound` (now `TranslationNotFound`).
-   JWTs never expired (now `JWT_EXPIRES_IN`, default 30 days).
-   The port was hard-coded (now `PORT`).

## Open: security and production readiness

-   No rate limiting on `/v1/login` or `/v1/user` (brute force / spam accounts).
-   E-mail is not collected (`email = name`), so there is no password recovery.
-   `POST /submit` trusts the client: puzzle `data`, `minimumComponents`, etc. aren't validated, and the only size limit is Express' default 100 kB body.
-   Submitted text (titles, descriptions, translations) isn't checked for profanity. The front-end renders descriptions as HTML, so the client must escape them; see the front-end KNOWN_ISSUES.
-   Most routes have little input validation (see the TODO in `src/Routes/routes.ts`).
-   SQLite is fine for a single instance. Moving to PostgreSQL only needs a change to the Prisma `datasource`, but the raw SQL in `_findLastFinishedOfficialPuzzle` should be re-tested.
-   No automated tests.

## Dependencies

Upgraded in November 2026 to Express 5, Prisma 7 (driver adapter `better-sqlite3`, dates kept as unix-ms to stay compatible with existing databases), helmet 8, jsonwebtoken 9, bcryptjs 3, express-validator 7 and `tsx`. Requires Node.js 20.19+.
