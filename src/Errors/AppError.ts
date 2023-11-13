export enum ErrorType {
  UserNotFound,
  ModeratorNotFound,
  BanExpired,
  BanLifted,
  BanNotFound,
  BanReasonEmpty,
  BanDurationZero,
  BanUserAlreadyBanned,
  YouAreBanned,
  PuzzleNotFound,
  PuzzleAlreadyTranslated,
  PuzzleAlreadyInLocale,
  LocaleNotSupported,
  CantJudgeOwnReport,
  OfficialReported,
  CantReportOfficial,
  ReportNotFound,
  ReportOwnPuzzle,
  AlreadyReported,
  InvalidCredentials,
  InvalidRole,
  ReportReasonEmpty,
  InvalidDifficulty,
  DeleteOthersPuzzle,
  UserAlreadyExists,
  BadRequest, // Generic 400 error
  InvalidAuth,
  InternalServerError,
  NoPermissions,
  InvalidPage,
  InvalidPageSize,
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly type: ErrorType;

  constructor(message: string, statusCode: number, type: ErrorType) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.type = type;
  }
}
