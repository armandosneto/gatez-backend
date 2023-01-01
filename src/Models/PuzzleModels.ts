import { Puzzle } from ".prisma/client";

export type PuzzleMetadata = Omit<Puzzle, "data" | "desciption" | "difficulty"> & {
  completed: boolean;
  liked: boolean;
  difficulty: string | null;
  canPlay: boolean;
};

export type PuzzleFullData = {
  game: string;
  meta: PuzzleMetadata & {
    description: string;
    difficultyRating: string | null;
  };
};
