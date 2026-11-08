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
