# Known issues

Bugs and risks found while reviewing the code (November 2026). None of them have been fixed yet; each entry points to where the fix belongs.

## Bugs

| # | Where | Problem | Effect |
| - | ----- | ------- | ------ |
| 1 | `PuzzleTranslationService.listPendingTranslations` | Filters `approved: true, reviewedAt: null`. Suggestions waiting for review are created with `approved: false`. | The pending-translations list is always empty for real suggestions. Should be `approved: false`. |
| 2 | `UserBanService.getAllActive` | Filters on `lifted: false`, but the column is `liftedAt`. | `GET /v1/moderation/ban` throws a Prisma validation error (500). Should be `liftedAt: null`. |
| 3 | `PuzzleReportService` (top of file) | `reports_to_ban` reads `process.env.REPORTS_TO_HIDE`. | The ban threshold can't be configured on its own. Should read `REPORTS_TO_BAN`. |
| 4 | `PuzzleReportService.repondToReport` | `_validReportsCount(reportedUser.id)` counts reports **made by** the user (`userId` is the reporter), not reports against the user's puzzles. The count also runs before the current report is saved as legit, and `banUser` is not awaited. | Auto-ban hits the wrong person, one report late, and a failure inside `banUser` (e.g. already banned) becomes an unhandled rejection. |
| 5 | `UserService.changeRole` | `const user = this.get(userId)` is missing `await`. | The "user not found" check never triggers; Prisma throws a 500 instead of a 404. |
| 6 | `utils/timeUtil.ts` | `msToDays`/`daystoMs` use `24 * 60 * 1000` (24 minutes), not `24 * 60 * 60 * 1000`. | The ban message overstates the remaining days by 60×. |
| 7 | `Models/Pagination.createPaginationResult` | `totalPages = floor(total / pageSize) + 1`. | Reports one extra page when `total` is a multiple of `pageSize`. Should be `Math.ceil(total / pageSize)`. |
| 8 | `Routes/moderation.ts` — `GET /reports` | `puzzleId` is validated with `isUUID()`, but puzzle ids are integers, and it is passed to Prisma as a string. When `reviewed` is omitted, the service filters `reviewedAt: null` (only unreviewed). | Filtering reports by puzzle is impossible; "all reports" can't be listed. |
| 9 | `PuzzleService.completePuzzle` | Assumes a `PuzzleCompleteData` row exists (created by `download`) and uses `!`. | Calling `complete` without `download` returns a 500 instead of a clear error. |
| 10 | `Routes/moderation.ts` — `GET /translations` | No `ensureHasRole`. | Any logged-in user can list pending translations (low impact, but likely unintended). |
| 11 | `PuzzleTranslationService.review` | "Not found" error says "Puzzle does not exist!" with `PuzzleNotFound`. | Misleading error for a missing translation. |

## Security / production readiness

-   JWTs never expire and there is no refresh or logout. Add `expiresIn` to `sign()`.
-   No rate limiting on `/v1/login` or `/v1/user` (brute force / spam accounts).
-   E-mail is not collected (`email = name`), so there is no password recovery.
-   `POST /submit` trusts the client: puzzle `data`, `minimumComponents`, etc. are not validated, and there is no size limit beyond Express' default 100 kB body.
-   Submitted text (titles, descriptions, translations) isn't checked for profanity, and the front-end renders descriptions as HTML (`<br>` is used in official puzzles) — check that user content is escaped before rendering.
-   The port (`15001`) is hard-coded in `src/server.ts`; there is no `PORT` env var.
-   SQLite is fine for a single instance; moving to PostgreSQL would only require changing the Prisma `datasource` (the raw SQL in `_findLastFinishedOfficialPuzzle` is standard SQL but should be re-tested).
-   No automated tests.

## Dependency age

The project was last updated in February 2024 and was written against Node 16, Prisma 3 and Express 4. Prisma 3 is long out of support and hasn't been tested on current Node LTS versions; upgrading Prisma (and regenerating the client) is a good first maintenance step.
