import { PuzzleReport } from "@prisma/client";
import { client } from "../prisma/client";
import { puzzleService } from "./PuzzleService";
import { PaginationRequest, PaginationResponse, queryPaginationResult } from "../Models/Pagination";

const reports_to_hide = +(process.env.REPORTS_TO_HIDE ?? 10);

class PuzzleReportService {
  async reportPuzzle(puzzleId: number, userId: string, reason: string): Promise<PuzzleReport> {
    const puzzleReport = await client.puzzleReport.create({
      data: {
        puzzleId,
        userId,
        reason,
      },
    });

    const numberOfReports = await this._validOrSuspectedReports(puzzleId);

    if (numberOfReports >= reports_to_hide) {
      await puzzleService.hidePuzzle(puzzleId);
    }

    return puzzleReport;
  }

  async userHasReportedPuzzle(puzzleId: number, userId: string): Promise<boolean> {
    const count = await client.puzzleReport.count({
      where: {
        puzzleId,
        userId,
      },
    });

    return count > 0;
  }

  async listReports(pagination: PaginationRequest): Promise<PaginationResponse<PuzzleReport>> {
    return queryPaginationResult(pagination, client.puzzleReport.count, client.puzzleReport.findMany, {
      where: {
        reviewed: false,
      },
    });
  }

  private _validOrSuspectedReports(puzzleId: number): Promise<number> {
    return client.puzzleReport.count({
      where: {
        puzzleId,
        OR: [
          {
            legit: true,
          },
          {
            reviewed: false,
          },
        ],
      },
    });
  }
}

const puzzleReportService = new PuzzleReportService();

export { puzzleReportService };
