import { Prisma, PuzzleReport, User } from "@prisma/client";
import { client } from "../prisma/client";
import { puzzleService } from "./PuzzleService";
import { PaginationRequest, queryPaginationResult } from "../Models/Pagination";
import { AppError } from "../Errors/AppError";
import { userBanService } from "./UserBanService";

const reports_to_hide = +(process.env.REPORTS_TO_HIDE ?? 10);
const reports_to_ban = +(process.env.REPORTS_TO_HIDE ?? 5);

class PuzzleReportService {
  async reportPuzzle(puzzleId: number, userId: string, reason: string): Promise<PuzzleReport> {
    if (await this.userHasReportedPuzzle(+puzzleId, userId)) {
      throw new AppError("You have already reported this puzzle!", 409);
    }

    const puzzle = await puzzleService.get(puzzleId);

    if (!puzzle) {
      throw new AppError("Puzzle does not exist!", 404);
    }

    if (!puzzle.author) {
      throw new AppError("You can't report an official puzzle!", 422);
    }

    if (puzzle.author === userId) {
      throw new AppError("You can't report your own puzzle! Maybe you shloud delete it.", 422);
    }

    const puzzleReport = await client.puzzleReport.create({
      data: {
        puzzleId,
        userId,
        reason,
      },
    });

    const numberOfReports = await this._validOrSuspectedReportsCount(puzzleId);

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
  async listReports(
    pagination: PaginationRequest,
    puzzleId: string | undefined,
    userId: string | undefined,
    reviewed: boolean | undefined
  ) {
    const where = {
      puzzleId,
      userId,
      reviewedAt: reviewed ? { not: null } : null,
    } as Prisma.PuzzleReportWhereInput;

    const orderBy = {
      createdAt: "asc",
    } as Prisma.PuzzleReportOrderByWithRelationInput;

    return queryPaginationResult(pagination, client.puzzleReport.count, client.puzzleReport.findMany, {
      where,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            userRole: true,
          },
        },
        reviewer: {
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
            hiddenAt: true,
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

  async repondToReport(reportId: string, legit: boolean, reviewNotes: string, moderator: User): Promise<PuzzleReport> {
    const report = await client.puzzleReport.findUnique({
      where: {
        id: reportId,
      },
      include: {
        puzzle: {
          select: {
            user: true,
          },
        },
      },
    });

    if (!report) {
      throw new AppError("Report not found!", 404);
    }

    report.legit = legit;
    report.reviewNotes = reviewNotes;
    report.reviewedAt = new Date();
    report.reviewerId = moderator.id;

    const { id, puzzle, ...data } = report;
    const reportedUser = puzzle.user!;

    if (reportedUser.id === moderator.id) {
      throw new AppError("You can't respond to a report on yourself!", 422);
    }

    if ((await this._validReportsCount(reportedUser.id)) >= reports_to_ban) {
      userBanService.banUser(
        reportedUser,
        "User has surpassed the number of allowed legit puzzle reports",
        moderator,
        100
      );
    }

    return client.puzzleReport.update({
      where: {
        id,
      },
      data,
    });
  }

  private _validOrSuspectedReportsCount(puzzleId: number): Promise<number> {
    return client.puzzleReport.count({
      where: {
        puzzleId,
        OR: [
          {
            legit: true,
          },
          {
            reviewedAt: null,
          },
        ],
      },
    });
  }

  private _validReportsCount(userId: string): Promise<number> {
    return client.puzzleReport.count({
      where: {
        userId,
        legit: true,
      },
    });
  }
}

const puzzleReportService = new PuzzleReportService();

export { puzzleReportService };
