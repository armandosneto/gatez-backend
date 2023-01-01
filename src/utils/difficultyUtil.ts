export const difficultyLabels = ["easy", "medium", "hard"];

export const difficultyRanges = {
  easy: {
    min: 0,
    max: 0.3,
  },
  medium: {
    min: 0.3,
    max: 0.7,
  },
  hard: {
    min: 0.7,
    max: 1.1,
  },
};

export function getTrophies(difficulty: number): number {
  if (difficulty < difficultyRanges.easy.max) {
    return 100;
  } else if (difficulty < difficultyRanges.medium.max) {
    return 200;
  } else {
    return 400;
  }
}

export function getDifficultyLabelByDifficulty(difficulty: number | null): string | null {
  if (difficulty === null) {
    return null;
  }

  if (difficulty < difficultyRanges.easy.max) {
    return difficultyLabels[0];
  } else if (difficulty < difficultyRanges.medium.max) {
    return difficultyLabels[1];
  } else {
    return difficultyLabels[2];
  }
}

export function getDifficultyByDifficultyLabel(difficultyLabel: any): number | null {
  return difficultyLabel === null || difficultyLabel === undefined
    ? null
    : difficultyLabels.indexOf(difficultyLabel);
}

// Needs to return a number between 0 and 1 no matter the inputs
export function calculateDifficulty(
  averageTime: number,
  averageDifficulty: number | null
): number {
  if (!averageDifficulty) {
    averageDifficulty = Number.MIN_VALUE;
  }
  return (
    1 / (1 + Math.pow(Math.E, -averageTime / 300)) - 0.5 + averageDifficulty / 4
  );
}
