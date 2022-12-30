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
}

const puzzleReportService = new PuzzleReportService();

export { puzzleReportService };
