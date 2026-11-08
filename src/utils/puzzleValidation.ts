import { decompressFromEncodedURIComponent } from "lz-string";

// Keep in sync with the game: src/js/core/config.js (puzzleMinBoundsSize / puzzleMaxBoundsSize)
// and src/js/savegame/puzzle_serializer.js
export const puzzleMinBoundsSize = 2;
export const puzzleMaxBoundsSize = 20;
export const maxCompressedPuzzleLength = 50_000;
export const maxTruthTableRows = 256;

const validRotations = [0, 90, 180, 270];
const signalValues = new Set(["0", "1"]);
const expectedValues = new Set(["0", "1", "x", "null"]);

type Position = { x: number; y: number; r: number };

export type PuzzleGameData = {
  version: number;
  bounds: { w: number; h: number };
  buildings: (
    | { type: "programmableSignal"; signalList: string; pos: Position }
    | { type: "programmableAcceptor"; expectedSignals: string; pos: Position }
    | { type: "block"; pos: Position }
  )[];
  excludedBuildings: string[];
  excludedBuildingsVariations?: string[];
};

const isInt = (value: unknown): value is number => Number.isInteger(value);
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((it) => typeof it === "string");

function parseList(list: unknown, allowed: Set<string>): string[] | null {
  if (typeof list !== "string" || list.length === 0) {
    return null;
  }
  const values = list.split(",").map((it) => it.trim().toLowerCase());
  return values.every((it) => allowed.has(it)) ? values : null;
}

/**
 * Decompresses and validates a puzzle as produced by the game's puzzle serializer.
 * Throws an Error with a human readable message if the puzzle is invalid.
 */
export function parseAndValidatePuzzleData(compressed: unknown): PuzzleGameData {
  if (typeof compressed !== "string" || compressed.length === 0) {
    throw new Error("puzzle data must be a non empty string");
  }
  if (compressed.length > maxCompressedPuzzleLength) {
    throw new Error(`puzzle data must be at most ${maxCompressedPuzzleLength} characters`);
  }

  let puzzle: any;
  try {
    puzzle = JSON.parse(decompressFromEncodedURIComponent(compressed) ?? "");
  } catch {
    throw new Error("puzzle data could not be decompressed");
  }

  if (!puzzle || typeof puzzle !== "object" || puzzle.version !== 1) {
    throw new Error("unsupported puzzle version");
  }

  const { bounds, buildings, excludedBuildings, excludedBuildingsVariations } = puzzle;

  for (const dimension of [bounds?.w, bounds?.h]) {
    if (!isInt(dimension) || dimension < puzzleMinBoundsSize || dimension > puzzleMaxBoundsSize) {
      throw new Error(`puzzle bounds must be integers between ${puzzleMinBoundsSize} and ${puzzleMaxBoundsSize}`);
    }
  }

  if (!isStringArray(excludedBuildings)) {
    throw new Error("excludedBuildings must be a list of strings");
  }
  if (excludedBuildingsVariations !== undefined && !isStringArray(excludedBuildingsVariations)) {
    throw new Error("excludedBuildingsVariations must be a list of strings");
  }

  if (!Array.isArray(buildings)) {
    throw new Error("buildings must be a list");
  }

  const lengths: number[] = [];
  let signals = 0;
  let acceptors = 0;

  for (const building of buildings) {
    const pos = building?.pos;
    if (!pos || !isInt(pos.x) || !isInt(pos.y) || !validRotations.includes(pos.r)) {
      throw new Error("every building must have an integer position and a valid rotation");
    }

    switch (building.type) {
      case "programmableSignal": {
        const values = parseList(building.signalList, signalValues);
        if (!values) {
          throw new Error("signal lists may only contain 0 and 1");
        }
        lengths.push(values.length);
        signals++;
        break;
      }
      case "programmableAcceptor": {
        const values = parseList(building.expectedSignals, expectedValues);
        if (!values) {
          throw new Error("expected signal lists may only contain 0, 1 and x");
        }
        lengths.push(values.length);
        acceptors++;
        break;
      }
      case "block":
        break;
      default:
        throw new Error(`unknown building type '${building?.type}'`);
    }
  }

  if (signals === 0 || acceptors === 0) {
    throw new Error("a puzzle needs at least one programmable signal and one programmable acceptor");
  }
  if (lengths.some((length) => length !== lengths[0])) {
    throw new Error("all signals and acceptors must have the same number of values");
  }
  if (lengths[0] > maxTruthTableRows) {
    throw new Error(`a puzzle may have at most ${maxTruthTableRows} truth table rows`);
  }

  return puzzle as PuzzleGameData;
}
