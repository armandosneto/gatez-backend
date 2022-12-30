import { Puzzle, PuzzleCompleteData } from "@prisma/client";
import { client } from "../prisma/client";


class PuzzleCompleteDataService {
  getByPuzzleAndUser(puzzleId: number, userId: string): Promise<PuzzleCompleteData | null> {
    return client.puzzleCompleteData.findFirst({
      where: {
        puzzleId,
        userId,
      },
    });
  }

  async create(puzzle: Puzzle, userId: string): Promise<void> {
    const puzzleId = puzzle.id;

    await client.puzzleCompleteData.create({
      data: {
        userId,
        puzzleId,
      },
    });

    puzzle.downloads++;

    await client.puzzle.update({
      where: {
        id: puzzleId,
      },
      data: {
        downloads: puzzle.downloads,
      },
    });
  }
}

const puzzleCompleteDataService = new PuzzleCompleteDataService();

export { puzzleCompleteDataService }
