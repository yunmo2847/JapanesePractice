import { describe, expect, it } from 'vitest';
import { isKatakana, toKatakana } from 'wanakana';
import { allKana, LOOKALIKES } from '../src/content/katakana';
import words from '../src/content/katakanaWords.json';
import { grade, gradeKatakana } from '../src/lib/kana';
import { speakable } from '../src/lib/tts';

describe('katakana chart', () => {
  it('types every character with the key sequence it shows', () => {
    const wrong = allKana().filter((k) => toKatakana(k.type, { IMEMode: true }) !== k.kana);
    expect(wrong).toEqual([]);
  });

  it('has unique characters and look-alikes that exist in the chart', () => {
    const kana = allKana().map((k) => k.kana);
    expect(new Set(kana).size).toBe(kana.length);
    for (const ch of LOOKALIKES.flat()) expect(kana, ch).toContain(ch);
  });
});

describe('loanwords', () => {
  it('are written in katakana only and unique', () => {
    for (const w of words) expect(isKatakana(w.ja), w.ja).toBe(true);
    expect(new Set(words.map((w) => w.ja)).size).toBe(words.length);
  });

  it('can be read back from romaji input', () => {
    expect(grade('こーひー', ['コーヒー']).grade).toBe('correct');
    expect(grade('ぱーてぃー', ['パーティー']).grade).toBe('correct');
  });
});

describe('katakana writing', () => {
  it('needs exact katakana for full marks', () => {
    expect(gradeKatakana('コーヒー', 'コーヒー')).toBe('correct');
    expect(gradeKatakana('コヒー', 'コーヒー')).toBe('near'); // missing ー
    expect(gradeKatakana('こーひー', 'コーヒー')).toBe('near'); // hiragana
    expect(gradeKatakana('ラーメン', 'コーヒー')).toBe('wrong');
  });

  it('finishes a trailing n as ン', () => {
    expect(toKatakana('ぱn')).toBe('パン');
    expect(toKatakana('pan')).toBe('パン');
  });
});

describe('speech text', () => {
  it('drops Hangul so a Korean line is never read aloud', () => {
    expect(speakable('ラーメンが好き。라면 좋아')).toBe('ラーメンが好き。');
    expect(speakable('한국어만')).toBe('');
    expect(speakable('K-POPが好き')).toBe('K-POPが好き');
  });
});
