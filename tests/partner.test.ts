import { describe, expect, it } from 'vitest';
import { topics } from '../src/content';
import { CLOSING, initialPartner, partnerTurn, reaction } from '../src/lib/partner';

const food = topics.find((t) => t.id === 't-food')!;

describe('partner reactions', () => {
  it('fits the mood, with negation winning over 好き', () => {
    expect(reaction('ラーメンが好きです', 0).ja).toBe('いいですね！');
    expect(reaction('魚は好きじゃないです', 0).ja).toBe('そうなんですね。');
    expect(reaction('からいものはにがてです', 0).ja).toBe('そうなんですね。');
    expect(reaction('毎日食べます', 0).ja).not.toBe(reaction('毎日食べます', 1).ja); // varies
  });
});

describe('partner turns', () => {
  it('asks the follow-ups in order, then closes once, then only reacts', () => {
    let s = initialPartner;
    const t1 = partnerTurn(food, s, ['ラーメンが好きです。']);
    expect(t1.lines.map((l) => l.ja)).toEqual(['いいですね！', food.followUps[0].ja]);
    s = t1.state;
    const t2 = partnerTurn(food, s, ['はい、します。']);
    expect(t2.lines[1]).toEqual(food.followUps[1]);
    s = t2.state;
    const t3 = partnerTurn(food, s, ['キムチチゲです。']);
    expect(t3.lines[1]).toEqual(CLOSING);
    s = t3.state;
    expect(partnerTurn(food, s, ['そうですね。']).lines).toHaveLength(1);
  });

  it('answers once when asked back, then keeps the conversation going', () => {
    const t1 = partnerTurn(food, initialPartner, ['ラーメンが好きです。', 'ユイさんは？']);
    expect(t1.lines.map((l) => l.ja)).toEqual(['いいですね！', food.partner.ja, food.followUps[0].ja]);
    const t2 = partnerTurn(food, t1.state, ['はい。ユイさんは？']);
    expect(t2.lines.map((l) => l.ja)).not.toContain(food.partner.ja);
  });
});
