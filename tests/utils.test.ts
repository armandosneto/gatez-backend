import { describe, expect, it } from "vitest";
import { createPaginationResult } from "../src/Models/Pagination";
import { calculateDifficulty, getDifficultyLabelByDifficulty, getTrophies } from "../src/utils/difficultyUtil";
import { daystoMs, msToDays } from "../src/utils/timeUtil";

describe("pagination", () => {
  it.each([
    [0, 0],
    [1, 1],
    [20, 1],
    [21, 2],
    [40, 2],
  ])("%i records in pages of 20 -> %i pages", (total, pages) => {
    expect(createPaginationResult({ page: 0, pageSize: 20 }, [], total).totalPages).toBe(pages);
  });
});

describe("time", () => {
  it("converts days and milliseconds", () => {
    expect(daystoMs(1)).toBe(86_400_000);
    expect(msToDays(daystoMs(3))).toBe(3);
    expect(msToDays(daystoMs(2) + 1)).toBe(3);
  });
});

describe("difficulty", () => {
  it("stays between 0 and 1 and maps to labels and trophies", () => {
    for (const time of [0, 30, 300, 10_000]) {
      for (const rating of [null, 0, 1, 2]) {
        const difficulty = calculateDifficulty(time, rating);
        expect(difficulty).toBeGreaterThanOrEqual(0);
        expect(difficulty).toBeLessThanOrEqual(1);
      }
    }

    expect(getDifficultyLabelByDifficulty(0.1)).toBe("easy");
    expect(getDifficultyLabelByDifficulty(0.5)).toBe("medium");
    expect(getDifficultyLabelByDifficulty(0.9)).toBe("hard");
    expect([getTrophies(0.1), getTrophies(0.5), getTrophies(0.9)]).toEqual([100, 200, 400]);
  });
});
