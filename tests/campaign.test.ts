import { afterAll, describe, expect, it } from "vitest";
import { client } from "../src/prisma/client";
import { UserRole } from "../src/Models/UserRole";
import { api, createUser, submitPuzzle } from "./helpers";

describe("campaign order", () => {
  const createdIds: number[] = [];

  afterAll(async () => {
    // Other test files share this database: remove the puzzles added here and restore the original order
    await client.puzzle.deleteMany({ where: { id: { in: createdIds } } });
    await client.$executeRaw`UPDATE puzzles SET "order" = id WHERE author IS NULL`;
  });

  it("orders official puzzles by position, not by id", async () => {
    const author = await createUser();
    const admin = await createUser(UserRole.admin);
    const id = await submitPuzzle(author, { title: "Inserted level" });
    createdIds.push(id);

    await api().put(`/v1/moderation/official/${id}`).set(author.auth).send({ position: 2 }).expect(403);

    const response = await api().put(`/v1/moderation/official/${id}`).set(admin.auth).send({ position: 2 }).expect(200);
    expect(response.body.slice(0, 3).map((p: any) => [p.order, p.title])).toEqual([
      [1, "Welcome"],
      [2, "Inserted level"],
      [3, "NOT gate"],
    ]);
    expect(response.body.map((p: any) => p.order)).toEqual(response.body.map((_: any, i: number) => i + 1));

    const player = await createUser();
    const list = await api().get("/v1/puzzles/list/official").set(player.auth).expect(200);
    expect(list.body[1]).toMatchObject({ id, authorName: "official", author: null, canPlay: false });

    // Completing the first level unlocks the inserted one, not "NOT gate" (which has a lower id)
    await api().post("/v1/puzzles/complete/1").set(player.auth).send({ time: 10, componentsUsed: 0 }).expect(200);
    const after = await api().get("/v1/puzzles/list/official").set(player.auth).expect(200);
    expect(after.body.slice(0, 3).map((p: any) => p.canPlay)).toEqual([true, true, false]);
  });

  it("moves an official puzzle and clamps the position to the end of the campaign", async () => {
    const admin = await createUser(UserRole.admin);
    const before = await api().get("/v1/puzzles/list/official").set(admin.auth).expect(200);

    const moved = await api().put("/v1/moderation/official/1").set(admin.auth).send({ position: 999 }).expect(200);
    expect(moved.body[moved.body.length - 1]).toMatchObject({ id: 1, order: moved.body.length });
    expect(moved.body[0].id).toBe(before.body[1].id);

    await api().put("/v1/moderation/official/1").set(admin.auth).send({ position: 1 }).expect(200);
    await api().put("/v1/moderation/official/99999").set(admin.auth).send({ position: 1 }).expect(404);
    await api().put("/v1/moderation/official/1").set(admin.auth).send({ position: 0 }).expect(400);
  });
});
