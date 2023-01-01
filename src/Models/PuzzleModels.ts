import { Puzzle } from ".prisma/client";

export type PuzzleMetadata = Omit<Puzzle, "data" | "difficulty"> & {
  completed: boolean;
  liked: boolean;
  difficulty: string | null;
  canPlay: boolean;
};

export type MetadataWhitoutDescription = Omit<PuzzleMetadata, "description">;

export type PuzzleFullData = {
  game: string;
  meta: PuzzleMetadata & {
    difficultyRating: string | null;
  };
};
