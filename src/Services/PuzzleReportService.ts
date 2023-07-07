import { PuzzleReport } from "@prisma/client";
import { client } from "../prisma/client";
import { puzzleService } from "./PuzzleService";
import { PaginationRequest, queryPaginationResult } from "../Models/Pagination";

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

  // TODO add a explicit type
  async listReports(pagination: PaginationRequest) {
    return queryPaginationResult(pagination, client.puzzleReport.count, client.puzzleReport.findMany, {
      where: {
        reviewed: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            userRole: true,
          },
        },
        puzzle: {
          select: {
            id: true,
            title: true,
            authorName: true,
            hidden: true,
            completions: true,
            likes: true,
            downloads: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                userRole: true,
              },
            },
          },
        },
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
