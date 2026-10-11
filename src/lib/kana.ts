import { toHiragana, toKana } from 'wanakana';
import { plain, reading } from './furigana';

/** Comparison form: hiragana, no punctuation/spaces/long-vowel marks. */
export function normalize(text: string): string {
  // Drop ー first: toHiragana would turn katakana ラーメン into らあめん.
  return toHiragana(text.trim().replace(/[ー－-]/g, ''), { passRomaji: true })
    .toLowerCase()
    .replace(/[\s、。，．,.！!？?「」『』（）()〜~・…]/g, '');
}

/** Final conversion on submit: turns a trailing "n" into ん, etc. */
export function finishKana(text: string): string {
  return toKana(text, { passRomaji: false });
}

export type Grade = 'correct' | 'near' | 'wrong';

function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

/** Every accepted written form of an answer (kanji form and kana reading). */
export function acceptedForms(markups: string[]): string[] {
  return [...new Set(markups.flatMap((m) => [plain(m), reading(m)]).map(normalize))];
}

export function grade(input: string, markups: string[]): { grade: Grade; target: string } {
  const given = normalize(input);
  const forms = acceptedForms(markups);
  let best = { d: Infinity, target: forms[0] };
  for (const f of forms) {
    const d = distance(given, f);
    if (d < best.d) best = { d, target: f };
  }
  if (best.d === 0) return { grade: 'correct', target: best.target };
  // Small slips (one or two kana, or mixed kanji/kana spelling) are left to self-assessment.
  const near = best.d <= Math.max(2, Math.floor(best.target.length * 0.2));
  return { grade: near ? 'near' : 'wrong', target: best.target };
}

export type DiffPart = { text: string; ok: boolean };

/** Marks which characters of `target` the input got right (LCS-based). */
export function diff(input: string, target: string): DiffPart[] {
  const a = normalize(input);
  const b = target;
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const parts: DiffPart[] = [];
  const push = (ch: string, ok: boolean) => {
    const prev = parts[parts.length - 1];
    if (prev && prev.ok === ok) prev.text += ch;
    else parts.push({ text: ch, ok });
  };
  let i = 0;
  let j = 0;
  while (j < b.length) {
    if (i < a.length && a[i] === b[j]) {
      push(b[j], true);
      i++;
      j++;
    } else if (i < a.length && dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      push(b[j], false);
      j++;
    }
  }
  return parts;
}
