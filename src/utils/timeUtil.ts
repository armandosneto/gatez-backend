const msPerDay = 24 * 60 * 60 * 1000;

export function msToDays(milisseconds: number): number {
  return Math.ceil(milisseconds / msPerDay);
}

export function daystoMs(days: number): number {
  return days * msPerDay;
}

export function addDays(date: Date, days: number) {
  let result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Tolerance for the clock difference between the game and the server, in seconds */
const sessionTimeTolerance = 5;

/**
 * The time (in seconds) a player reported for completing a puzzle can't be longer than the
 * time since they opened it. Returns null if the reported time isn't a valid number.
 */
export function limitTimeToSession(time: unknown, startedAt: Date, now = new Date()): number | null {
  if (typeof time !== "number" || !Number.isFinite(time) || time < 0) {
    return null;
  }
  const elapsed = Math.max(0, Math.ceil((now.getTime() - startedAt.getTime()) / 1000));
  return Math.min(Math.round(time), elapsed + sessionTimeTolerance);
}
