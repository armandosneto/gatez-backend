import { Puzzle, PuzzleTranslation } from "@prisma/client";
import { AppError } from "../Errors/AppError";
import { client } from "../prisma/client";

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
      throw new AppError(`Locale ${locale} not supported`, 400);
    }
    if (locale === puzzle.locale) {
        throw new AppError(`Original puzzle is already on locale ${locale}`, 406);
    }
    const puzzleId = puzzle.id;

    const approvedTranslation = await this.findApprovedTranslation(puzzleId, locale);

    if (approvedTranslation) {
      throw new AppError(`Puzzle ${puzzleId} already has an approved translation in ${locale}`, 406);
    }

    const translationData = {
      title,
      description,
      locale,
      approved,
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
}

const puzzleTranslationService = new PuzzleTranslationService();

export { puzzleTranslationService };