import { PuzzleGameData } from "./puzzleValidation";

/**
 * A building placed by the player, as sent by the game when completing a puzzle
 * (see the game's PuzzleSerializer.generateSolutionFromGameRoot)
 */
export type SolutionBuilding = {
  id: string;
  variant: string;
  x: number;
  y: number;
  r: number;
  rv: number;
};

type BuildingInfo = {
  /** Variant -> [width, height] before rotation */
  variants: Record<string, [number, number]>;
  /** Counts as a component for the score (see countComponentsUsed in the game) */
  counted: boolean;
};

// Keep in sync with the game: src/js/game/buildings/*.js (getAvailableVariants / getDimensions),
// the puzzle play toolbar (src/js/game/hud/parts/buildings_toolbar.js) and
// countComponentsUsed (src/js/core/logic_simulation_helper.js)
const buildings: Record<string, BuildingInfo> = {
  wire: { counted: false, variants: { default: [1, 1], second: [1, 1] } },
  wire_tunnel: { counted: false, variants: { default: [1, 1] } },
  logic_gate: {
    counted: true,
    variants: { default: [1, 1], nand: [1, 1], or: [1, 1], nor: [1, 1], not: [1, 1], xor: [1, 1] },
  },
  four_input_logic_gate: { counted: true, variants: { default: [4, 1], or: [4, 1] } },
  multiplexer: { counted: true, variants: { default: [2, 1], demuxer: [2, 1] } },
  adder: { counted: true, variants: { default: [2, 1], full: [2, 1] } },
  edge_detector: { counted: true, variants: { default: [1, 1], falling: [1, 1], change: [1, 1] } },
  memory: { counted: true, variants: { default: [2, 1], d: [2, 1], jk: [2, 1], t: [1, 1] } },
};

const validRotations = [0, 90, 180, 270];

const isInt = (value: unknown): value is number => Number.isInteger(value);

/** Same as MetaBuilding.getCompleteIdentifier in the game */
const completeIdentifier = (id: string, variant: string) => (variant === "default" ? id : `${id}-${variant}`);

/**
 * Tiles covered by a building, same as StaticMapEntityComponent.getTileSpaceBounds in the game
 */
function coveredTiles(x: number, y: number, r: number, [w, h]: [number, number]): [number, number][] {
  let left: number, top: number, width: number, height: number;
  switch (r) {
    case 90:
      [left, top, width, height] = [x - h + 1, y, h, w];
      break;
    case 180:
      [left, top, width, height] = [x - w + 1, y - h + 1, w, h];
      break;
    case 270:
      [left, top, width, height] = [x, y - w + 1, h, w];
      break;
    default:
      [left, top, width, height] = [x, y, w, h];
  }

  const tiles: [number, number][] = [];
  for (let dx = 0; dx < width; dx++) {
    for (let dy = 0; dy < height; dy++) {
      tiles.push([left + dx, top + dy]);
    }
  }
  return tiles;
}

/**
 * Checks that a solution could have been built in the game for this puzzle: only known and allowed
 * buildings, inside the puzzle bounds, not overlapping each other or the puzzle's own buildings.
 * Does NOT simulate the circuit, so it doesn't prove the solution passes the truth table.
 * Throws an Error with a human readable message if the solution is invalid.
 */
export function validateSolution(
  solution: unknown,
  puzzle: PuzzleGameData
): { buildings: SolutionBuilding[]; componentsUsed: number } {
  if (!Array.isArray(solution)) {
    throw new Error("solution must be a list of buildings");
  }

  const { w, h } = puzzle.bounds;
  // Same as Rectangle.centered in the game (the puzzle zone)
  const minX = -Math.ceil(w / 2);
  const minY = -Math.ceil(h / 2);

  if (solution.length > w * h) {
    throw new Error("solution has more buildings than tiles in the puzzle");
  }

  const occupied = new Set<string>(puzzle.buildings.map((it) => `${it.pos.x},${it.pos.y}`));
  const excluded = new Set(puzzle.excludedBuildings);
  const excludedVariants = new Set(puzzle.excludedBuildingsVariations ?? []);

  const result: SolutionBuilding[] = [];
  let componentsUsed = 0;

  for (const building of solution) {
    const { id, variant, x, y, r, rv } = building ?? {};
    const info = typeof id === "string" ? buildings[id] : undefined;
    if (!info) {
      throw new Error(`unknown building '${id}'`);
    }

    const size = typeof variant === "string" ? info.variants[variant] : undefined;
    if (!size) {
      throw new Error(`unknown variant '${variant}' of '${id}'`);
    }

    if (excluded.has(id) || excludedVariants.has(completeIdentifier(id, variant))) {
      throw new Error(`'${completeIdentifier(id, variant)}' is not allowed in this puzzle`);
    }

    if (!isInt(x) || !isInt(y) || !validRotations.includes(r) || !isInt(rv) || rv < 0 || rv > 7) {
      throw new Error("every building must have an integer position, a valid rotation and rotation variant");
    }

    for (const [tx, ty] of coveredTiles(x, y, r, size)) {
      if (tx < minX || ty < minY || tx >= minX + w || ty >= minY + h) {
        throw new Error(`'${id}' at ${x},${y} is outside the puzzle`);
      }
      const key = `${tx},${ty}`;
      if (occupied.has(key)) {
        throw new Error(`more than one building at ${key}`);
      }
      occupied.add(key);
    }

    if (info.counted) {
      componentsUsed++;
    }
    result.push({ id, variant, x, y, r, rv });
  }

  return { buildings: result, componentsUsed };
}
