export function msToDays(milisseconds: number): number {
  return Math.ceil(milisseconds / (24 * 60 * 1000));
}

export function daystoMs(days: number): number {
  return days * 24 * 60 * 1000;
}

export function addDays(date: Date, days: number) {
  let result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
