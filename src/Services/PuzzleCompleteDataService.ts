import { Prisma, Puzzle, PuzzleCompleteData } from "@prisma/client";
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

  update(puzzleId: number, userId: string, data: Prisma.PuzzleCompleteDataUpdateInput): Promise<PuzzleCompleteData> {
    return client.puzzleCompleteData.update({
      where: {
        userId_puzzleId: {
          puzzleId,
          userId,
        },
      },
      data,
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

    return completeData;
  }
}

const puzzleCompleteDataService = new PuzzleCompleteDataService();

export { puzzleCompleteDataService };
