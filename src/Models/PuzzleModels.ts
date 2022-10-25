import { Puzzle } from ".prisma/client";

export type PuzzleMetadata = Omit<Puzzle, "data" | "desciption"> & {
    completed: boolean;
    liked: boolean;
};

export type PuzzlePlayData = {
    game: string,
    meta: PuzzleMetadata & {
        description: string | null,
        difficultyRating: string | null,
    }
}
