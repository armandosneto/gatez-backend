import { Prisma, Puzzle, PuzzleTranslation } from "@prisma/client";
import { AppError, ErrorType } from "../Errors/AppError";
import { client } from "../prisma/client";
import { PaginationRequest, queryPaginationResult } from "../Models/Pagination";

const defaultLocale = "en";
// Keep in sync with the frontend
const supportedLocales = [
  "en",
  "de",
  "cs",
  "da",
  "et",
  "es-419",
  "fr",
  "it",
  "pt-BR",
  "sv",
  "tr",
  "el",
  "ru",
  "uk",
  "zh-TW",
  "zh-CN",
  "nb",
  "mt-MT",
  "ar",
  "nl",
  "vi",
  "th",
  "hu",
  "pl",
  "ja",
  "kor",
  "no",
  "pt-PT",
  "fi",
  "ro",
  "he",
];

class PuzzleTranslationService {
  getLocaleOrNull(locale: any): string | null {
    if (!locale) {
      return null;
    }
    const localeString = locale.toString();

    if (supportedLocales.indexOf(localeString) === -1) {
      return null;
    }

    return localeString;
  }

  getLocaleOrDefault(locale: any): string {
    return this.getLocaleOrNull(locale) ?? defaultLocale;
  }

  findByPuzzleUserAndLocale(puzzleId: number, userId: string, locale: string): Promise<PuzzleTranslation | null> {
    return client.puzzleTranslation.findUnique({
      where: {
        userId_puzzleId_locale: {
          puzzleId,
          userId,
          locale,
        },
      },
    });
  }

  findApprovedTranslation(puzzleId: number, locale: string): Promise<PuzzleTranslation | null> {
    return client.puzzleTranslation.findFirst({
      where: {
        puzzleId,
        locale,
        approved: true,
      },
    });
  }

  async create(
    puzzle: Puzzle,
    userId: string,
    title: string,
    description: string,
    locale: string,
    approved: boolean
  ): Promise<PuzzleTranslation> {
    if (supportedLocales.indexOf(locale) === -1) {
      throw new AppError(`Locale ${locale} not supported`, 400, ErrorType.LocaleNotSupported);
    }
    if (locale === puzzle.locale) {
      throw new AppError(`Original puzzle is already on locale ${locale}`, 406, ErrorType.PuzzleAlreadyInLocale);
    }
    const puzzleId = puzzle.id;

    const approvedTranslation = await this.findApprovedTranslation(puzzleId, locale);

    if (approvedTranslation) {
      throw new AppError(
        `Puzzle ${puzzleId} already has an approved translation in ${locale}`,
        406,
        ErrorType.PuzzleAlreadyTranslated
      );
    }

    const translationData = {
      title: title.trim(),
      description: description.trim(),
      locale,
      approved,
      reviewedAt: approved ? new Date() : null,
      reviewerId: approved ? userId : null,
    };

    const previousUserTranslation = await this.findByPuzzleUserAndLocale(puzzleId, userId, locale);

    if (previousUserTranslation) {
      return client.puzzleTranslation.update({
        where: {
          id: previousUserTranslation.id,
        },
        data: translationData,
      });
    }

    return client.puzzleTranslation.create({
      data: {
        puzzleId,
        userId,
        ...translationData,
      },
    });
  }

  async review(translationId: string, reviewerId: string, approved: boolean): Promise<PuzzleTranslation> {
    const exists = await client.puzzleTranslation.count({
      where: {
        id: translationId,
      },
    });

    if (exists === 0) {
      throw new AppError("Puzzle does not exist!", 404, ErrorType.PuzzleNotFound);
    }

    return client.puzzleTranslation.update({
      where: {
        id: translationId,
      },
      data: {
        reviewerId,
        approved,
        reviewedAt: new Date(),
      },
    });
  }

  // TODO add a explicit type
  listPendingTranslations(pagination: PaginationRequest) {
    const orderBy = {
      createdAt: "asc",
    } as Prisma.PuzzleTranslationOrderByWithRelationInput;

    return queryPaginationResult(pagination, client.puzzleTranslation.count, client.puzzleTranslation.findMany, {
      where: {
        approved: true,
        reviewedAt: null,
      },
      orderBy,
      include: {
        puzzle: {
          select: {
            id: true,
            locale: true,
            title: true,
            description: true,
            user: {
              select: {
                name: true,
                userRole: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            userRole: true,
          },
        },
      },
    });
  }
}

const puzzleTranslationService = new PuzzleTranslationService();

export { puzzleTranslationService };
