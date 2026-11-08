import { describe, expect, it } from "vitest";
import { api, createUser, puzzleData, puzzleSubmission, submitPuzzle } from "./helpers";

describe("official puzzles", () => {
  it("lists the 26 official levels, only the first one unlocked for a new user", async () => {
    const user = await createUser();
    const response = await api().get("/v1/puzzles/list/official").set(user.auth).expect(200);

    expect(response.body).toHaveLength(26);
    expect(response.body[0]).toMatchObject({ id: 1, title: "Welcome", authorName: "official", canPlay: true });
    expect(response.body.slice(1).every((puzzle: any) => !puzzle.canPlay)).toBe(true);
    expect(response.body[0].description).toBeUndefined();
    expect(response.body.every((puzzle: any) => /^io:\d+:\d+$/.test(puzzle.shortKey))).toBe(true);
    expect(response.body.find((puzzle: any) => puzzle.title === "Half adder").shortKey).toBe("io:2:2");
    // Dates written by Prisma 3 (unix ms) must still be read correctly
    expect(new Date(response.body[0].createdAt).getFullYear()).toBe(2022);
  });

  it("returns approved translations for the requested locale", async () => {
    const user = await createUser();
    const response = await api().get("/v1/puzzles/download/2?locale=pt-BR").set(user.auth).expect(200);

    expect(response.body.meta.locale).toBe("pt-BR");
    expect(response.body.meta.title).not.toBe("NOT gate");
    expect(typeof response.body.game).toBe("string");
  });

  it("unlocks the next level and awards trophies only on the first completion", async () => {
    const user = await createUser();
    await api().get("/v1/puzzles/download/1").set(user.auth).expect(200);

    const first = await api()
      .post("/v1/puzzles/complete/1")
      .set(user.auth)
      .send({ time: 60, liked: true, componentsUsed: 0, difficultyRating: "easy" })
      .expect(200);
    expect(first.body.trophies).toBeGreaterThan(0);

    const second = await api()
      .post("/v1/puzzles/complete/1")
      .set(user.auth)
      .send({ time: 30, liked: false, componentsUsed: 0, difficultyRating: "easy" })
      .expect(200);
    expect(second.body.trophies).toBeUndefined();

    const list = await api().get("/v1/puzzles/list/official").set(user.auth).expect(200);
    expect(list.body[0]).toMatchObject({ completed: true, liked: false });
    expect(list.body[1].canPlay).toBe(true);
    expect(list.body[2].canPlay).toBe(false);

    const me = await api().get("/v1/login").set(user.auth).expect(200);
    expect(me.body.trophies).toBe(first.body.trophies);
  });

  it("keeps every level unlocked after completing the last one", async () => {
    const user = await createUser();
    for (let id = 1; id <= 26; id++) {
      await api().post(`/v1/puzzles/complete/${id}`).set(user.auth).send({ time: 10, componentsUsed: 1 }).expect(200);
    }

    const list = await api().get("/v1/puzzles/list/official").set(user.auth).expect(200);
    expect(list.body.every((puzzle: any) => puzzle.canPlay && puzzle.completed)).toBe(true);
  });

  it("allows completing a puzzle that was not downloaded first", async () => {
    const user = await createUser();
    await api().post("/v1/puzzles/complete/1").set(user.auth).send({ time: 10, componentsUsed: 0 }).expect(200);
  });

  it("rejects invalid difficulty ratings and unknown puzzles", async () => {
    const user = await createUser();
    const invalid = await api()
      .post("/v1/puzzles/complete/1")
      .set(user.auth)
      .send({ time: 10, difficultyRating: "impossible" })
      .expect(400);
    expect(invalid.body.error).toBe("InvalidDifficulty");

    await api().get("/v1/puzzles/download/99999").set(user.auth).expect(404);
  });
});

describe("community puzzles", () => {
  it("submits, lists, searches and deletes a puzzle", async () => {
    const author = await createUser();
    const player = await createUser();
    const id = await submitPuzzle(author, { title: "Unique xyzzy puzzle" });

    const mine = await api().get("/v1/puzzles/list/mine").set(author.auth).expect(200);
    expect(mine.body.map((p: any) => p.id)).toEqual([id]);

    const search = await api()
      .post("/v1/puzzles/search")
      .set(player.auth)
      .send({ searchTerm: "xyzzy", duration: "any", difficulty: "any", includeCompleted: true })
      .expect(200);
    expect(search.body.map((p: any) => p.id)).toEqual([id]);

    const forbidden = await api().delete(`/v1/puzzles/delete/${id}`).set(player.auth).expect(403);
    expect(forbidden.body.error).toBe("DeleteOthersPuzzle");

    await api().delete(`/v1/puzzles/delete/${id}`).set(author.auth).expect(200);
    await api().get(`/v1/puzzles/download/${id}`).set(player.auth).expect(404);
  });

  it("derives the icon from the puzzle inputs and outputs", async () => {
    const author = await createUser();
    const id = await submitPuzzle(author, {
      shortKey: "CuCuCuCu",
      data: puzzleData({ signals: ["0,1", "1,0", "1,1"], acceptors: ["0,1", "1,1"] }),
    });

    const download = await api().get(`/v1/puzzles/download/${id}`).set(author.auth).expect(200);
    expect(download.body.meta.shortKey).toBe("io:3:2");
  });

  it("accepts don't care outputs and an optional maximum", async () => {
    const author = await createUser();
    await submitPuzzle(author, { data: puzzleData({ acceptors: ["x,0,0,1"] }), maximumComponents: 3 });
  });

  it.each([
    ["not compressed", { data: "definitely not a puzzle" }],
    ["no acceptor", { data: puzzleData({ acceptors: [] }) }],
    ["different lengths", { data: puzzleData({ signals: ["0,1", "0,1,0"] }) }],
    ["invalid signal value", { data: puzzleData({ signals: ["0,2,1,1"] }) }],
    ["bounds too large", { data: puzzleData({ bounds: { w: 50, h: 8 } }) }],
    ["unknown building", { data: puzzleData({ extraBuildings: [{ type: "belt", pos: { x: 0, y: 0, r: 0 } }] }) }],
    ["title too short", { title: "ab" }],
    ["description too long", { description: "a".repeat(1001) }],
    ["maximum below minimum", { minimumComponents: 3, maximumComponents: 2 }],
  ])("rejects a puzzle with %s", async (_, overrides) => {
    const author = await createUser();
    const response = await api().post("/v1/puzzles/submit").set(author.auth).send(puzzleSubmission(overrides)).expect(400);
    expect(response.body.error).toBe("BadRequest");
  });
});
