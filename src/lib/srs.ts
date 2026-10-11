// Leitner boxes 0..4 → review again after 0, 1, 2, 4, 8 days.
export const INTERVALS = [0, 1, 2, 4, 8];

export type Rating = 'good' | 'ok' | 'bad';

export type CardState = {
  box: number;
  due: string; // YYYY-MM-DD
  inTime?: boolean; // answered correctly within the time limit at least once
};

export function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function rate(prev: CardState | undefined, rating: Rating, today: string, inTime: boolean): CardState {
  const box = prev?.box ?? 0;
  const next = rating === 'good' ? Math.min(box + 1, INTERVALS.length - 1) : rating === 'ok' ? box : 0;
  return {
    box: next,
    due: addDays(today, INTERVALS[next]),
    inTime: Boolean(prev?.inTime || (rating === 'good' && inTime)),
  };
}

export function isDue(state: CardState | undefined, today: string): boolean {
  return !state || state.due <= today;
}
