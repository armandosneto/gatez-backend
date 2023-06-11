import { PuzzleReport } from "@prisma/client";
import { client } from "../prisma/client";

class PuzzleReportService {
  reportPuzzle(puzzleId: number, userId: string, reason: string): Promise<PuzzleReport> {
    return client.puzzleReport.create({
      data: {
        puzzleId,
        userId,
        reason,
      },
    });
  }

  async userHasReportedPuzzle(puzzleId: number, userId: string): Promise<boolean> {
    const id = await client.puzzleReport.findFirst({
      select: {
        id: true,
      },
      where: {
        puzzleId,
        userId,
      },
    });

    return id !== null;
  }
}

const puzzleReportService = new PuzzleReportService();

export { puzzleReportService };
