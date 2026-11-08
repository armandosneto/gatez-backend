# Gatez back-end — API reference

Base URL (dev): `http://localhost:15001`. All routes are prefixed with `/v1`.

## Conventions

-   **Body format:** JSON (`Content-Type: application/json`).
-   **Authentication:** `Authorization: Bearer <jwt>`. The token is returned by `POST /v1/login`. Tokens are signed with `JWT_KEY` and currently **never expire**.
-   **Locale:** every route accepts an optional `?locale=<code>` query parameter (see `supportedLocales` in `src/Services/PuzzleTranslationService.ts`). Unknown or missing locales fall back to `en`. It is used to return approved puzzle translations and to tag submitted puzzles.
-   **Pagination** (only on routes marked _paginated_): `?page=<n>` (0-based, default `0`) and `?pageSize=<n>` (default `20`). Paginated responses look like:

    ```json
    { "page": 0, "pageSize": 20, "total": 42, "totalPages": 3, "records": [ ... ] }
    ```

-   **Errors** always have the shape below. `error` is the name of a member of the `ErrorType` enum (`src/Errors/ErrorType.ts`), which the front-end uses to pick a translated message.

    ```json
    { "status": 404, "message": "Puzzle not found", "error": "PuzzleNotFound" }
    ```

    Validation failures (express-validator) return `400` with `error: "BadRequest"`. Banned users get `403 YouAreBanned` on any authenticated route.

-   **Roles** (`src/Models/UserRole.ts`): `0 = user`, `1 = moderator`, `2 = admin`. A route that requires a role accepts that role or higher.

---

## Users and authentication

### `POST /v1/user` — create account

| Field      | Rules                              |
| ---------- | ---------------------------------- |
| `name`     | 4–20 characters, no whitespace     |
| `password` | 6–24 characters                    |

E-mail is not used yet: the server stores `email = name`. Returns `201` with the user (without `password`, `email`, `confirmed`). `400 UserAlreadyExists` if the name is taken.

### `POST /v1/login` — log in

Body: `{ "name": string, "password": string }`.
Returns the user plus `token`:

```json
{ "id": "uuid", "name": "rafael", "createdAt": "...", "trophies": 300, "userRole": 0, "token": "eyJ..." }
```

`401 InvalidCredentials` on wrong name/password, `403 YouAreBanned` if banned.

### `GET /v1/login` — validate token 🔒

Returns the current user (same shape as login, without token). Used by the game on startup to check whether the saved token is still valid.

---

## Puzzles 🔒

All routes below require authentication.

### Puzzle metadata object

Returned by list/search (without `description`) and inside `download` (as `meta`):

```jsonc
{
    "id": 19,
    "shortKey": "...",
    "title": "Half adder",          // replaced by the approved translation for ?locale, if any
    "description": "...",           // only in download
    "afterCompletingMessage": null,
    "author": null,                  // null = official puzzle
    "authorName": "official",
    "locale": "en",
    "likes": 0, "completions": 0, "downloads": 0,
    "averageTime": null,             // seconds
    "averageDifficultyRating": null, // 0..2
    "difficulty": "easy",           // "easy" | "medium" | "hard" | null (label, not the raw float)
    "minimumComponents": 2, "maximumComponents": null, "minimumNands": 1,
    "createdAt": "...", "hiddenAt": null, "hiddenById": null,
    "completed": false,              // for the current user
    "liked": false,                  // for the current user
    "canPlay": true                  // false for official puzzles not yet unlocked
}
```

**Official puzzle progression:** official puzzles (`author = null`) are unlocked in `id` order. A user can play every official puzzle with `id` ≤ the first official puzzle after the highest one they have completed (see `_findLastFinishedOfficialPuzzle` in `PuzzleService.ts`).

### `GET /v1/puzzles/list/:category`

`category` ∈ `official | top-rated | new | easy | medium | hard | mine | completed`. Returns an array (max 500, not paginated) of metadata objects. Hidden puzzles are never returned.

### `POST /v1/puzzles/search`

```json
{ "searchTerm": "adder", "duration": "any", "difficulty": "any", "includeCompleted": true }
```

-   `duration`: `short` (avg < 120 s) | `medium` (120–600 s) | `long` (> 600 s) | `any`
-   `difficulty`: `easy | medium | hard | any`
-   `searchTerm` is matched against title and description (original language only).

### `GET /v1/puzzles/download/:puzzleId`

Returns `{ "game": "<compressed puzzle data>", "meta": { ...metadata, "difficultyRating": "easy" | null } }`.
Side effects: increments `downloads` and creates the user's `PuzzleCompleteData` row if it doesn't exist yet. **The game must download a puzzle before completing it.**

`game` is the serialized puzzle (see the front-end `docs/PUZZLES.md`), compressed with the game's own compression.

### `POST /v1/puzzles/submit`

```json
{
    "shortKey": "...", "title": "...", "description": "...", "data": "<compressed puzzle>",
    "minimumComponents": 3, "maximumComponents": null, "minimumNands": null
}
```

Returns `201` with the created puzzle. The puzzle is tagged with the request `locale`. ⚠️ The server does not validate `data` yet.

### `POST /v1/puzzles/complete/:puzzleId`

```json
{ "time": 142, "liked": true, "componentsUsed": 5, "nandsUsed": 0, "difficultyRating": "medium" }
```

`difficultyRating` is `easy | medium | hard` or omitted/null. Updates the user's completion row, the puzzle's averages, likes and computed difficulty. On the **first** completion the user earns trophies (100 / 200 / 400 for easy / medium / hard).

Response: `{ "completeData": { ... }, "trophies": 600 }` (`trophies` is the user's new total, or omitted if it was not the first completion).

Difficulty formula (`src/utils/difficultyUtil.ts`):

```
difficulty = sigmoid(averageTime / 300) - 0.5 + averageDifficultyRating / 4      // in [0, 1]
easy < 0.3 ≤ medium < 0.7 ≤ hard
```

### `POST /v1/puzzles/report/:puzzleId`

Body `{ "reason": string }`. Returns `201`. Official puzzles and your own puzzles can't be reported; one report per user per puzzle. When a puzzle reaches `REPORTS_TO_HIDE` (default 10) unreviewed or legit reports, it is hidden automatically.

### `POST /v1/puzzles/translate/:puzzleId`

```json
{ "title": "Meio somador", "description": "...", "locale": "pt-BR" }
```

-   `title`: 4–30 chars, no leading/trailing whitespace. `description`: up to 1000 chars.
-   If the requester is the puzzle author, the translation is approved immediately; otherwise it waits for moderation.
-   A user re-submitting for the same puzzle/locale overwrites their previous suggestion.
-   Errors: `LocaleNotSupported`, `PuzzleAlreadyInLocale` (406), `PuzzleAlreadyTranslated` (406, an approved one exists).

### `DELETE /v1/puzzles/delete/:puzzleId`

Only the author can delete. Returns `{ "success": true }`.

### `GET /v1/puzzles/officialSnapshot` 🛡️ admin

Returns every official puzzle as `{ [id]: { game, meta } }`, with statistics reset. This is the format of the front-end offline fallback file `src/js/platform/offlineFallback/officialLevelsDownload.json`.

---

## Moderation 🔒

### Translations

| Method | Route                                       | Role      | Notes                                       |
| ------ | ------------------------------------------- | --------- | ------------------------------------------- |
| GET    | `/v1/moderation/translations`               | any user  | _paginated_ — pending translations          |
| PUT    | `/v1/moderation/translations/:translationId` | moderator | body `{ "approved": boolean }`             |

### Reports

| Method | Route                              | Role      | Notes                                                                       |
| ------ | ---------------------------------- | --------- | --------------------------------------------------------------------------- |
| GET    | `/v1/moderation/reports`           | moderator | _paginated_; query `puzzleId`, `userId`, `reviewed` (`true`/`false`)        |
| PUT    | `/v1/moderation/reports/:reportId` | moderator | body `{ "legit": boolean, "reviewNotes": string }`                          |

### Admin

| Method | Route                                     | Body                                        |
| ------ | ----------------------------------------- | ------------------------------------------- |
| PUT    | `/v1/moderation/ban/:userId`              | `{ "reason": string, "duration": <days> }` |
| PUT    | `/v1/moderation/ban/lift/:userBanId`      | `{ "reason": string }`                      |
| GET    | `/v1/moderation/ban/:userId`              | — _paginated_, ban history of a user        |
| GET    | `/v1/moderation/ban`                      | — _paginated_, active bans                  |
| PUT    | `/v1/moderation/userRole/:userId`         | `{ "newRole": 0 \| 1 \| 2 }`                |
| GET    | `/v1/moderation/hidePuzzle`               | — _paginated_, hidden puzzles               |
| PUT    | `/v1/moderation/hidePuzzle/:puzzleId`     | — hides a puzzle                            |
| PUT    | `/v1/moderation/hidePuzzle/undo/:puzzleId` | — unhides a puzzle                         |

There is no UI for moderation yet; use an HTTP client. To bootstrap the first admin, change `userRole` to `2` directly in the database (e.g. `yarn prisma studio`).

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for bugs found in some of these routes.
