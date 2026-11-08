import { decompressFromEncodedURIComponent } from "lz-string";

// Puzzle icons are drawn by the game as a chip with one pin per input/output.
// They are stored in the puzzle's shortKey as "io:<inputs>:<outputs>" (keep in sync with src/js/game/puzzle_icon.js).
export const iconKeyPrefix = "io:";

/**
 * Builds the icon key of a puzzle from its compressed data. Returns null if the data can't be read.
 * Lenient on purpose, so it also works for puzzles created before server side validation existed.
 */
export function iconKeyFromPuzzleData(compressed: string): string | null {
  try {
    const puzzle = JSON.parse(decompressFromEncodedURIComponent(compressed) ?? "");
    const buildings: { type?: string }[] = Array.isArray(puzzle?.buildings) ? puzzle.buildings : [];
    const inputs = buildings.filter((it) => it?.type === "programmableSignal").length;
    const outputs = buildings.filter((it) => it?.type === "programmableAcceptor").length;
    return `${iconKeyPrefix}${inputs}:${outputs}`;
  } catch {
    return null;
  }
}
