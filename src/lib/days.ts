export const TOTAL_DAYS = 21;

/** Day number (1..21) for `today`, counting `startDate` as Day 1. */
export function dayFor(startDate: string, today: string): number {
  const ms = new Date(today + 'T00:00:00').getTime() - new Date(startDate + 'T00:00:00').getTime();
  const day = Math.floor(ms / 86_400_000) + 1;
  return Math.min(Math.max(day, 1), TOTAL_DAYS);
}

export function weekOf(day: number): 1 | 2 | 3 {
  return day <= 7 ? 1 : day <= 14 ? 2 : 3;
}

/** Free-talk sentence target per week (plan 3.1). */
export function sentenceTarget(day: number): number {
  return [3, 5, 6][weekOf(day) - 1];
}

export function isTestDay(day: number): boolean {
  return day % 7 === 0;
}
