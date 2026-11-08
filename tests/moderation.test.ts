import { describe, expect, it } from "vitest";
import { UserRole } from "../src/Models/UserRole";
import { api, createUser, submitPuzzle } from "./helpers";

const translation = { title: "Quebra-cabeca", description: "Descricao", locale: "pt-BR" };

describe("translations", () => {
  it("auto approves translations made by the author", async () => {
    const author = await createUser();
    const player = await createUser();
    const id = await submitPuzzle(author);

    const created = await api().post(`/v1/puzzles/translate/${id}`).set(author.auth).send(translation).expect(201);
    expect(created.body.approved).toBe(true);

    const download = await api().get(`/v1/puzzles/download/${id}?locale=pt-BR`).set(player.auth).expect(200);
    expect(download.body.meta).toMatchObject({ title: translation.title, locale: "pt-BR" });
  });

  it("lists suggestions from other users for moderators to review", async () => {
    const author = await createUser();
    const translator = await createUser();
    const moderator = await createUser(UserRole.moderator);
    const id = await submitPuzzle(author);

    const suggestion = await api().post(`/v1/puzzles/translate/${id}`).set(translator.auth).send(translation).expect(201);
    expect(suggestion.body.approved).toBe(false);

    await api().get("/v1/moderation/translations").set(translator.auth).expect(403);

    const pending = await api().get("/v1/moderation/translations").set(moderator.auth).expect(200);
    expect(pending.body.records.map((t: any) => t.id)).toContain(suggestion.body.id);

    await api()
      .put(`/v1/moderation/translations/${suggestion.body.id}`)
      .set(moderator.auth)
      .send({ approved: true })
      .expect(200);

    const afterReview = await api().get("/v1/moderation/translations").set(moderator.auth).expect(200);
    expect(afterReview.body.records.map((t: any) => t.id)).not.toContain(suggestion.body.id);

    const missing = await api()
      .put("/v1/moderation/translations/does-not-exist")
      .set(moderator.auth)
      .send({ approved: true })
      .expect(404);
    expect(missing.body.error).toBe("TranslationNotFound");
  });

  it("rejects translations into the original locale or unsupported ones", async () => {
    const author = await createUser();
    const id = await submitPuzzle(author);

    const same = await api().post(`/v1/puzzles/translate/${id}`).set(author.auth).send({ ...translation, locale: "en" });
    expect(same.body.error).toBe("PuzzleAlreadyInLocale");

    const unsupported = await api()
      .post(`/v1/puzzles/translate/${id}`)
      .set(author.auth)
      .send({ ...translation, locale: "xx" })
      .expect(400);
    expect(unsupported.body.error).toBe("LocaleNotSupported");
  });
});

describe("reports and bans", () => {
  it("does not allow reporting official or own puzzles, or reporting twice", async () => {
    const author = await createUser();
    const player = await createUser();
    const id = await submitPuzzle(author);

    expect((await api().post("/v1/puzzles/report/1").set(player.auth).send({ reason: "x" }).expect(422)).body.error).toBe(
      "CantReportOfficial"
    );
    expect((await api().post(`/v1/puzzles/report/${id}`).set(author.auth).send({ reason: "x" }).expect(422)).body.error).toBe(
      "ReportOwnPuzzle"
    );

    await api().post(`/v1/puzzles/report/${id}`).set(player.auth).send({ reason: "trolling" }).expect(201);
    await api().post(`/v1/puzzles/report/${id}`).set(player.auth).send({ reason: "trolling" }).expect(409);
  });

  it("hides a puzzle after REPORTS_TO_HIDE open reports", async () => {
    const author = await createUser();
    const id = await submitPuzzle(author);

    for (let i = 0; i < 3; i++) {
      const reporter = await createUser();
      await api().post(`/v1/puzzles/report/${id}`).set(reporter.auth).send({ reason: "spam" }).expect(201);
    }

    await api().get(`/v1/puzzles/download/${id}`).set(author.auth).expect(404);
  });

  it("filters reports and bans the author after REPORTS_TO_BAN legit reports", async () => {
    const author = await createUser();
    const reporter = await createUser();
    const admin = await createUser(UserRole.admin);
    const puzzles = [await submitPuzzle(author), await submitPuzzle(author)];

    const reportIds: string[] = [];
    for (const id of puzzles) {
      const report = await api().post(`/v1/puzzles/report/${id}`).set(reporter.auth).send({ reason: "offensive" }).expect(201);
      reportIds.push(report.body.id);
    }

    const byPuzzle = await api().get(`/v1/moderation/reports?puzzleId=${puzzles[0]}`).set(admin.auth).expect(200);
    expect(byPuzzle.body.records.map((r: any) => r.id)).toEqual([reportIds[0]]);

    await api().put(`/v1/moderation/reports/${reportIds[0]}`).set(admin.auth).send({ legit: true, reviewNotes: "ok" }).expect(200);
    await api().get("/v1/login").set(author.auth).expect(200);

    await api().put(`/v1/moderation/reports/${reportIds[1]}`).set(admin.auth).send({ legit: true, reviewNotes: "ok" }).expect(200);

    const banned = await api().get("/v1/login").set(author.auth).expect(403);
    expect(banned.body.error).toBe("YouAreBanned");
    expect(banned.body.message).toContain("100 more days");
    await api().get("/v1/login").set(reporter.auth).expect(200);

    const reviewed = await api().get(`/v1/moderation/reports?puzzleId=${puzzles[0]}&reviewed=true`).set(admin.auth).expect(200);
    expect(reviewed.body.total).toBe(1);
    const unreviewed = await api().get(`/v1/moderation/reports?puzzleId=${puzzles[0]}&reviewed=false`).set(admin.auth).expect(200);
    expect(unreviewed.body.total).toBe(0);

    const activeBans = await api().get("/v1/moderation/ban").set(admin.auth).expect(200);
    expect(activeBans.body.records.map((b: any) => b.user.name)).toContain(author.name);
  });

  it("bans and lifts bans manually", async () => {
    const user = await createUser();
    const admin = await createUser(UserRole.admin);
    const moderator = await createUser(UserRole.moderator);

    await api().put(`/v1/moderation/ban/${user.id}`).set(moderator.auth).send({ reason: "spam", duration: 3 }).expect(403);

    const ban = await api().put(`/v1/moderation/ban/${user.id}`).set(admin.auth).send({ reason: "spam", duration: 3 }).expect(200);
    expect((await api().get("/v1/login").set(user.auth).expect(403)).body.message).toContain("3 more days");

    await api().put(`/v1/moderation/ban/${user.id}`).set(admin.auth).send({ reason: "again", duration: 3 }).expect(409);

    await api().put(`/v1/moderation/ban/lift/${ban.body.id}`).set(admin.auth).send({ reason: "mistake" }).expect(200);
    await api().get("/v1/login").set(user.auth).expect(200);
  });

  it("changes roles and returns 404 for unknown users", async () => {
    const user = await createUser();
    const admin = await createUser(UserRole.admin);

    const updated = await api().put(`/v1/moderation/userRole/${user.id}`).set(admin.auth).send({ newRole: 1 }).expect(200);
    expect(updated.body.userRole).toBe(1);

    await api().put("/v1/moderation/userRole/unknown").set(admin.auth).send({ newRole: 1 }).expect(404);
    await api().put(`/v1/moderation/userRole/${user.id}`).set(admin.auth).send({ newRole: 5 }).expect(400);
  });
});
