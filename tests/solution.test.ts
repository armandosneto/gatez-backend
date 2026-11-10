import { describe, expect, it } from "vitest";
import { client } from "../src/prisma/client";
import { PuzzleGameData } from "../src/utils/puzzleValidation";
import { validateSolution } from "../src/utils/solutionValidation";
import { limitTimeToSession } from "../src/utils/timeUtil";
import { api, completePuzzle, createUser, submitPuzzle } from "./helpers";

// 8x8 zone: tiles -4..3 on both axes. Signals at (0,2) and (1,2), acceptor at (0,-2)
const puzzle: PuzzleGameData = {
  version: 1,
  bounds: { w: 8, h: 8 },
  buildings: [
    { type: "programmableSignal", signalList: "0,0,1,1", pos: { x: 0, y: 2, r: 0 } },
    { type: "programmableSignal", signalList: "0,1,0,1", pos: { x: 1, y: 2, r: 0 } },
    { type: "programmableAcceptor", expectedSignals: "0,0,0,1", pos: { x: 0, y: -2, r: 0 } },
  ],
  excludedBuildings: ["memory"],
  excludedBuildingsVariations: ["logic_gate-xor"],
};

const gate = (x: number, y: number, variant = "default", r = 0) => ({ id: "logic_gate", variant, x, y, r, rv: 0 });
const wire = (x: number, y: number) => ({ id: "wire", variant: "default", x, y, r: 0, rv: 0 });

describe("solution validation", () => {
  it("counts only logic components", () => {
    const result = validateSolution([gate(0, 0), wire(0, 1), wire(0, -1), gate(1, 0, "nand")], puzzle);
    expect(result.componentsUsed).toBe(2);
    expect(result.buildings).toHaveLength(4);
  });

  it("rejects unknown, excluded and locked buildings", () => {
    expect(() => validateSolution([{ ...gate(0, 0), id: "hub" }], puzzle)).toThrow(/unknown building/);
    expect(() => validateSolution([gate(0, 0, "xnor")], puzzle)).toThrow(/unknown variant/);
    expect(() => validateSolution([{ id: "memory", variant: "t", x: 0, y: 0, r: 0, rv: 0 }], puzzle)).toThrow(/not allowed/);
    expect(() => validateSolution([gate(0, 0, "xor")], puzzle)).toThrow(/not allowed/);
    expect(() => validateSolution([{ id: "programmable_signal", variant: "default", x: 0, y: 0, r: 0, rv: 0 }], puzzle)).toThrow(/unknown building/);
  });

  it("rejects buildings outside the zone, taking size and rotation into account", () => {
    expect(() => validateSolution([gate(-4, -4), gate(3, 3)], puzzle)).not.toThrow();
    expect(() => validateSolution([gate(4, 0)], puzzle)).toThrow(/outside/);
    expect(() => validateSolution([gate(0, -5)], puzzle)).toThrow(/outside/);

    const wide = (x: number, y: number, r: number) => ({ id: "four_input_logic_gate", variant: "default", x, y, r, rv: 0 });
    expect(() => validateSolution([wide(0, 0, 0)], puzzle)).not.toThrow(); // x 0..3
    expect(() => validateSolution([wide(1, 0, 0)], puzzle)).toThrow(/outside/); // x 1..4
    expect(() => validateSolution([wide(-4, -1, 90)], puzzle)).not.toThrow(); // y -1..2
    expect(() => validateSolution([wide(-4, -4, 270)], puzzle)).toThrow(/outside/); // y -7..-4
  });

  it("rejects overlapping buildings, including the puzzle's own", () => {
    expect(() => validateSolution([gate(0, 2)], puzzle)).toThrow(/more than one/);
    expect(() => validateSolution([gate(1, 1), wire(1, 1)], puzzle)).toThrow(/more than one/);
    // A 2-tile building rotated by 180° covers its origin and the tile to its left
    const mux = { id: "multiplexer", variant: "default", x: 2, y: 2, r: 180, rv: 0 };
    expect(() => validateSolution([mux], puzzle)).toThrow(/more than one/);
    expect(() => validateSolution([{ ...mux, x: 3 }], puzzle)).not.toThrow();
    // Rotated by 90° it covers its origin and the tile below
    expect(() => validateSolution([{ ...mux, r: 90 }], puzzle)).not.toThrow();
  });

  it("rejects malformed solutions", () => {
    expect(() => validateSolution(undefined, puzzle)).toThrow(/list/);
    expect(() => validateSolution([{ ...gate(0, 0), r: 45 }], puzzle)).toThrow(/rotation/);
    expect(() => validateSolution([{ ...gate(0, 0), x: 0.5 }], puzzle)).toThrow(/position/);
    expect(() => validateSolution(Array.from({ length: 65 }, () => wire(0, 0)), puzzle)).toThrow(/more buildings/);
  });
});

describe("session time", () => {
  const start = new Date("2026-01-01T10:00:00Z");
  const at = (seconds: number) => new Date(start.getTime() + seconds * 1000);

  it("keeps the reported time when it fits in the session", () => {
    expect(limitTimeToSession(42, start, at(60))).toBe(42);
  });

  it("limits the reported time to the session length (with a small tolerance)", () => {
    expect(limitTimeToSession(3600, start, at(60))).toBe(65);
  });

  it("rejects invalid times", () => {
    expect(limitTimeToSession(-1, start, at(60))).toBeNull();
    expect(limitTimeToSession("10", start, at(60))).toBeNull();
    expect(limitTimeToSession(Number.NaN, start, at(60))).toBeNull();
  });
});

describe("completing with a solution", () => {
  it("stores the solution and counts components on the server", async () => {
    const author = await createUser();
    const player = await createUser();
    const id = await submitPuzzle(author);

    const response = await completePuzzle(player, id, {
      componentsUsed: 0, // ignored
      time: 100000, // limited to the session
      solution: [gate(0, 0), wire(0, 1), wire(0, -1)],
    });
    expect(response.body.completeData.componentsUsed).toBe(1);
    expect(response.body.completeData.timeTaken).toBeLessThan(100);

    const stored = await client.puzzleCompleteData.findUnique({ where: { userId_puzzleId: { userId: player.id, puzzleId: id } } });
    expect(JSON.parse(stored!.solution!)).toHaveLength(3);
  });

  it("rejects invalid solutions and solutions over the component limit", async () => {
    const author = await createUser();
    const player = await createUser();
    const id = await submitPuzzle(author, { maximumComponents: 1 });

    const invalid = await completePuzzle(player, id, { solution: [gate(50, 50)] }, 400);
    expect(invalid.body.error).toBe("InvalidSolution");

    const tooMany = await completePuzzle(player, id, { solution: [gate(0, 0), gate(1, 0)] }, 400);
    expect(tooMany.body.error).toBe("TooManyComponents");

    const missing = await api().post(`/v1/puzzles/complete/${id}`).set(player.auth).send({ time: 10 }).expect(400);
    expect(missing.body.error).toBe("InvalidSolution");
  });
});
