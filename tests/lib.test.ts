import { describe, expect, it } from 'vitest';
import { blocks, plain, reading, segments } from '../src/lib/furigana';
import { diff, finishKana, grade, normalize } from '../src/lib/kana';
import { isDue, rate } from '../src/lib/srs';
import { dayFor, sentenceTarget } from '../src/lib/days';
import { analyze, isQuestion, splitSentences } from '../src/lib/report';

const CARD = '昨日{きのう}|友達{ともだち}に|会{あ}って、|映画{えいが}を|見{み}ました。';

describe('furigana markup', () => {
  it('derives plain text, reading and ruby segments', () => {
    expect(plain(CARD)).toBe('昨日友達に会って、映画を見ました。');
    expect(reading(CARD)).toBe('きのうともだちにあって、えいがをみました。');
    expect(segments('私{わたし}は')).toEqual([{ text: '私', ruby: 'わたし' }, { text: 'は' }]);
  });

  it('splits blocks and drops trailing punctuation', () => {
    expect(blocks(CARD)).toEqual(['昨日{きのう}', '友達{ともだち}に', '会{あ}って、', '映画{えいが}を', '見{み}ました']);
  });
});

describe('grading', () => {
  it('accepts kana, kanji and katakana-free spellings alike', () => {
    expect(grade('きのうともだちにあって、えいがをみました', [CARD]).grade).toBe('correct');
    expect(grade('昨日友達に会って映画を見ました。', [CARD]).grade).toBe('correct');
    expect(grade('ラーメンがすきです', ['ラーメンが|好{す}きです。']).grade).toBe('correct');
    expect(grade('らーめんがすきです', ['ラーメンが|好{す}きです。']).grade).toBe('correct');
  });

  it('flags small slips as near and others as wrong', () => {
    expect(grade('きのうともだちにあって えいがをみます', [CARD]).grade).toBe('near');
    expect(grade('すしがすきです', [CARD]).grade).toBe('wrong');
  });

  it('accepts alternative answers', () => {
    expect(grade('わたしはにほんじんではありません', ['私{わたし}は|日本人{にほんじん}|じゃないです。', '私{わたし}は日本人{にほんじん}ではありません。']).grade).toBe('correct');
  });

  it('normalizes punctuation and spaces', () => {
    expect(normalize('は い 、です。？')).toBe('はいです');
  });

  it('finishes a trailing n', () => {
    expect(finishKana('ほn')).toBe('ほん');
  });

  it('marks missing characters in a diff', () => {
    expect(diff('たべす', 'たべます')).toEqual([
      { text: 'たべ', ok: true },
      { text: 'ま', ok: false },
      { text: 'す', ok: true },
    ]);
  });
});

describe('leitner', () => {
  it('moves boxes and schedules reviews', () => {
    const a = rate(undefined, 'good', '2026-10-11', true);
    expect(a).toEqual({ box: 1, due: '2026-10-12', inTime: true });
    const b = rate(a, 'bad', '2026-10-12', false);
    expect(b).toEqual({ box: 0, due: '2026-10-12', inTime: true });
    expect(rate({ box: 4, due: '' }, 'good', '2026-10-11', false).box).toBe(4);
    expect(isDue(undefined, '2026-10-11')).toBe(true);
    expect(isDue({ box: 1, due: '2026-10-12' }, '2026-10-11')).toBe(false);
  });
});

describe('days', () => {
  it('counts the start date as day 1 and clamps to 1..21', () => {
    expect(dayFor('2026-10-11', '2026-10-11')).toBe(1);
    expect(dayFor('2026-10-11', '2026-10-17')).toBe(7);
    expect(dayFor('2026-10-11', '2026-12-01')).toBe(21);
    expect(dayFor('2026-10-11', '2026-10-01')).toBe(1);
    expect(sentenceTarget(3)).toBe(3);
    expect(sentenceTarget(10)).toBe(5);
    expect(sentenceTarget(21)).toBe(6);
  });
});

describe('free-talk report', () => {
  const connectors = [
    { forms: ['それから'], ko: '그러고 나서' },
    { forms: ['でも'], ko: '하지만' },
    { forms: ['例えば', 'たとえば'], ko: '예를 들면' },
  ];

  it('counts sentences, connectors and asking back', () => {
    const r = analyze(
      ['ラーメンがすきです。でもからいものはにがてです', 'たとえばキムチ。ユイさんは？'],
      connectors,
      ['好き', 'すき'],
      4.2,
    );
    expect(r.sentences).toBe(4);
    expect(r.connectors).toEqual(['でも', '例えば']);
    expect(r.askedBack).toBe(true);
    expect(r.usedPattern).toBe(true);
    expect(r.firstReactionSec).toBe(4.2);
  });

  it('counts reason-から but not place-から', () => {
    const c = [{ forms: ['から'], ko: '이유', match: '(い|だ|た|る|ます|です|ない)から' }];
    expect(analyze(['かんこくからきました'], c, [], null).connectors).toEqual([]);
    expect(analyze(['韓国から来ました'], c, [], null).connectors).toEqual([]);
    expect(analyze(['おいしいからすきです'], c, [], null).connectors).toEqual(['から']);
    expect(analyze(['好きだから'], c, [], null).connectors).toEqual(['から']);
  });

  it('detects questions', () => {
    expect(isQuestion('ユイさんは何が好きですか')).toBe(true);
    expect(isQuestion('好きです。')).toBe(false);
    expect(splitSentences(['あ。い？', 'う'])).toEqual(['あ。', 'い？', 'う']);
  });
});
