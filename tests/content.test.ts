import { describe, expect, it } from 'vitest';
import { isKana } from 'wanakana';
import { cards, chains, CONTENT_DAYS, dialogues, patternById, patterns, survival, topics } from '../src/content';
import { blocks, plain, reading, segments } from '../src/lib/furigana';
import { grade } from '../src/lib/kana';

const KANJI = /[々一-鿿]/;

/** Every Japanese string in the content, with where it came from. */
function allJapanese(): [string, string][] {
  const out: [string, string][] = [];
  cards.forEach((c) => [c.ja, ...(c.alt ?? [])].forEach((j) => out.push([c.id, j])));
  patterns.forEach((p) => {
    out.push([p.id, p.polite.ja], [p.id, p.casual.ja], [p.id, p.swap.template]);
    p.swap.words.forEach((w) => out.push([p.id, w.ja]));
    p.examples.forEach((e) => out.push([p.id, e.ja]));
  });
  chains.forEach((c) => [c.start, ...c.links.map((l) => l.example)].forEach((x) => out.push([c.id, x.ja])));
  topics.forEach((t) => {
    out.push([t.id, t.question.ja], [t.id, t.answers.polite.ja], [t.id, t.answers.casual.ja]);
    t.hints.words.forEach((w) => out.push([t.id, w.ja]));
  });
  dialogues.forEach((d) => [...d.turns, d.reply].forEach((x) => out.push([d.id, x.ja])));
  survival.forEach((s) => [s.ja, s.example?.ja].forEach((j) => j && out.push([s.id, j])));
  return out;
}

describe('content integrity', () => {
  it('gives every kanji a furigana reading', () => {
    const missing = allJapanese().filter(([, ja]) => segments(ja).some((s) => !s.ruby && KANJI.test(s.text)));
    expect(missing).toEqual([]);
  });

  it('has well-formed markup (no stray braces)', () => {
    const bad = allJapanese().filter(([, ja]) => /[{}]/.test(plain(ja)));
    expect(bad).toEqual([]);
  });

  it('uses unique ids', () => {
    const ids = [cards, patterns, chains, topics, dialogues, survival].flatMap((l) => l.map((x) => x.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('grades every card answer as correct against itself, in kanji and in kana', () => {
    for (const c of cards) {
      const answers = [c.ja, ...(c.alt ?? [])];
      expect(grade(plain(c.ja), answers).grade, c.id).toBe('correct');
      expect(grade(reading(c.ja), answers).grade, c.id).toBe('correct');
    }
  });

  it('gives every card reading only kana (plus digits/latin)', () => {
    for (const c of cards) {
      const r = reading(c.ja).replace(/[。、？！?!\s]/g, '');
      expect(isKana(r.replace(/[0-9A-Za-z-]/g, '')), `${c.id}: ${r}`).toBe(true);
    }
  });

  it('splits multi-word cards into blocks that rebuild the sentence', () => {
    for (const c of cards) {
      const b = blocks(c.ja);
      expect(plain(b.join('')), c.id).toBe(plain(c.ja).replace(/[。？！?!]+$/, ''));
    }
  });

  it('references existing patterns and fills every day with content', () => {
    for (const t of topics) for (const id of t.hints.patterns) expect(patternById(id), `${t.id} → ${id}`).toBeTruthy();
    for (let day = 1; day < CONTENT_DAYS; day++) {
      expect(cards.filter((c) => c.day === day).length, `cards day ${day}`).toBeGreaterThanOrEqual(10);
      expect(patterns.some((p) => p.day === day), `pattern day ${day}`).toBe(true);
      expect(chains.filter((c) => c.day === day).length, `chains day ${day}`).toBe(3);
      expect(topics.some((t) => t.day === day), `topic day ${day}`).toBe(true);
      expect(dialogues.some((d) => d.day === day), `dialogue day ${day}`).toBe(true);
    }
    expect(topics.filter((t) => t.day === CONTENT_DAYS).length).toBe(3);
  });

  it('keeps pattern swap templates fillable and quiz answers in range', () => {
    for (const p of patterns) expect(p.swap.template, p.id).toContain('＿');
    for (const d of dialogues) for (const q of d.quiz) expect(q.answer).toBeLessThan(q.options.length);
  });

  it('ends model answers and dialogues with a question to the learner', () => {
    for (const t of topics) expect(plain(t.answers.polite.ja), t.id).toMatch(/[?？]|か。$/);
    for (const d of dialogues) expect(d.turns[d.turns.length - 1].speaker, d.id).toBe('ユイ');
  });
});
