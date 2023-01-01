import { Puzzle, PuzzleCompleteData } from "@prisma/client";
import { client } from "../prisma/client";


class PuzzleCompleteDataService {
  getByPuzzleAndUser(puzzleId: number, userId: string): Promise<PuzzleCompleteData | null> {
    return client.puzzleCompleteData.findUnique({
      where: {
        userId_puzzleId: {
          puzzleId,
          userId,
        },
      },
    });
  }

  async create(puzzle: Puzzle, userId: string): Promise<PuzzleCompleteData> {
    const puzzleId = puzzle.id;

    const completeData = await client.puzzleCompleteData.create({
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

    return completeData;
  }
}

const puzzleCompleteDataService = new PuzzleCompleteDataService();

export { puzzleCompleteDataService };
