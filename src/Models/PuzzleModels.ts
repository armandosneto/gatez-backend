import { Puzzle } from ".prisma/client";

export type PuzzleMetadata = Omit<Puzzle, "data" | "desciption"> & {
  completed: boolean;
  liked: boolean;
  canPlay: boolean;
};

export type PuzzleFullData = {
  game: string;
  meta: PuzzleMetadata & {
    description: string | null;
    difficultyRating: string | null;
  };
};