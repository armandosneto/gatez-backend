import request from "supertest";
import { compressToEncodedURIComponent } from "lz-string";
import { app } from "../src/app";
import { client } from "../src/prisma/client";
import { UserRole } from "../src/Models/UserRole";

export const api = () => request(app);

let counter = 0;

export type TestUser = { id: string; name: string; token: string; auth: { authorization: string } };

export async function createUser(role: UserRole = UserRole.user): Promise<TestUser> {
  const name = `user${Date.now() % 100000}${counter++}`;
  const password = "secret12";

  const created = await api().post("/v1/user").send({ name, password }).expect(201);
  if (role !== UserRole.user) {
    await client.user.update({ where: { id: created.body.id }, data: { userRole: role } });
  }

  const login = await api().post("/v1/login").send({ name, password }).expect(200);
  return { id: created.body.id, name, token: login.body.token, auth: { authorization: `Bearer ${login.body.token}` } };
}

type PuzzleOptions = {
  signals?: string[];
  acceptors?: string[];
  bounds?: { w: number; h: number };
  extraBuildings?: unknown[];
};

export function puzzleData({
  signals = ["0,0,1,1", "0,1,0,1"],
  acceptors = ["0,0,0,1"],
  bounds = { w: 8, h: 8 },
  extraBuildings = [],
}: PuzzleOptions = {}) {
  return compressToEncodedURIComponent(
    JSON.stringify({
      version: 1,
      bounds,
      buildings: [
        ...signals.map((signalList, x) => ({ type: "programmableSignal", signalList, pos: { x, y: 2, r: 0 } })),
        ...acceptors.map((expectedSignals, x) => ({ type: "programmableAcceptor", expectedSignals, pos: { x, y: -2, r: 0 } })),
        ...extraBuildings,
      ],
      excludedBuildings: [],
      excludedBuildingsVariations: [],
    })
  );
}

export function puzzleSubmission(overrides: Record<string, unknown> = {}) {
  return {
    shortKey: "CuCuCuCu",
    title: "Test puzzle",
    description: "Build an AND gate",
    minimumComponents: 1,
    data: puzzleData(),
    ...overrides,
  };
}

export async function submitPuzzle(user: TestUser, overrides: Record<string, unknown> = {}): Promise<number> {
  const response = await api().post("/v1/puzzles/submit").set(user.auth).send(puzzleSubmission(overrides)).expect(201);
  return response.body.id;
}
