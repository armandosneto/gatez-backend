import { Prisma, PuzzleReport, User } from "@prisma/client";
import { client } from "../prisma/client";
import { puzzleService } from "./PuzzleService";
import { PaginationRequest, queryPaginationResult } from "../Models/Pagination";
import { AppError, ErrorType } from "../Errors";
import { userBanService } from "./UserBanService";

const reports_to_hide = +(process.env.REPORTS_TO_HIDE ?? 10);
const reports_to_ban = +(process.env.REPORTS_TO_BAN ?? 5);

class PuzzleReportService {
  async reportPuzzle(puzzleId: number, userId: string, reason: string): Promise<PuzzleReport> {
    if (await this.userHasReportedPuzzle(+puzzleId, userId)) {
      throw new AppError("You have already reported this puzzle!", 409, ErrorType.AlreadyReported);
    }

    const puzzle = await puzzleService.get(puzzleId);

    if (!puzzle) {
      throw new AppError("Puzzle does not exist!", 404, ErrorType.PuzzleNotFound);
    }

    if (!puzzle.author) {
      throw new AppError(
        `You can't report an official puzzle! If you find a problem with an official puzzle\
, please open an issue on the github page.`,
        422,
        ErrorType.CantReportOfficial
      );
    }

    if (puzzle.author === userId) {
      throw new AppError(
        "You can't report your own puzzle! Maybe you shloud delete it.",
        422,
        ErrorType.ReportOwnPuzzle
      );
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
    puzzleId: number | undefined,
    userId: string | undefined,
    reviewed: boolean | undefined
  ) {
    const where: Prisma.PuzzleReportWhereInput = {
      puzzleId,
      userId,
    };

    if (reviewed !== undefined) {
      where.reviewedAt = reviewed ? { not: null } : null;
    }

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
      throw new AppError("Report not found!", 404, ErrorType.ReportNotFound);
    }

    report.legit = legit;
    report.reviewNotes = reviewNotes;
    report.reviewedAt = new Date();
    report.reviewerId = moderator.id;

    const { id, puzzle, ...data } = report;
    const reportedUser = puzzle.user;

    if (!reportedUser) {
      throw new AppError(
        `This is a report on an official puzzle and is probably a mistake! If \
you find a problem with an official puzzle, please open an issue on the github page.`,
        422,
        ErrorType.OfficialReported
      );
    }

    if (reportedUser.id === moderator.id) {
      throw new AppError("You can't respond to a report on yourself!", 422, ErrorType.CantJudgeOwnReport);
    }

    const updatedReport = await client.puzzleReport.update({
      where: {
        id,
      },
      data,
    });

    if (legit) {
      await this._banIfTooManyLegitReports(reportedUser, moderator);
    }

    return updatedReport;
  }

  private async _banIfTooManyLegitReports(reportedUser: User, moderator: User): Promise<void> {
    if ((await this._legitReportsAgainstAuthorCount(reportedUser.id)) < reports_to_ban) {
      return;
    }
    if (await userBanService.getActiveForUser(reportedUser.id)) {
      return;
    }

    await userBanService.banUser(
      reportedUser,
      "User has surpassed the number of allowed legit puzzle reports",
      moderator,
      100
    );
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

  // Counts legit reports made against puzzles authored by the given user
  private _legitReportsAgainstAuthorCount(authorId: string): Promise<number> {
    return client.puzzleReport.count({
      where: {
        legit: true,
        puzzle: {
          author: authorId,
        },
      },
    });
  }
}

const puzzleReportService = new PuzzleReportService();

export { puzzleReportService };
