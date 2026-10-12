// Scripted conversation partner (ユイ) for free talk: no AI, just a small set of rules.
// After each of the learner's turns she says one thing: a reaction, then
// - her own answer if the learner asked back (once),
// - otherwise the topic's next follow-up question,
// - and once those run out, a closing line; after that only reactions.
import type { JaKo, Topic } from '../content';
import { isQuestion, splitSentences } from './report';

export type PartnerState = { next: number; answered: boolean; closed: boolean; turns: number };

export const initialPartner: PartnerState = { next: 0, answered: false, closed: false, turns: 0 };

const NEGATIVE = /苦手|にがて|嫌い|きらい|疲れ|つかれ|大変|たいへん|残念|ざんねん|じゃない|ません|くない/;
const POSITIVE = /好き|すき|楽し|たのし|おいし|いい|すごい|最高|さいこう/;

const POSITIVE_REACTIONS: JaKo[] = [
  { ja: 'いいですね！', ko: '좋네요!' },
  { ja: '楽{たの}しそうですね！', ko: '재밌겠네요!' },
];
const NEUTRAL_REACTIONS: JaKo[] = [
  { ja: 'へえ！', ko: '오!' },
  { ja: 'なるほど。', ko: '그렇구나.' },
  { ja: 'そうなんですね。', ko: '그렇군요.' },
];
const NEGATIVE_REACTION: JaKo = { ja: 'そうなんですね。', ko: '그렇군요.' };

export const CLOSING: JaKo = { ja: '今日{きょう}は話{はな}せて楽{たの}しかったです！', ko: '오늘 이야기해서 즐거웠어요!' };

/** A short reaction that fits the mood of what the learner said (negation wins over 好き). */
export function reaction(text: string, turn: number): JaKo {
  if (NEGATIVE.test(text)) return NEGATIVE_REACTION;
  if (POSITIVE.test(text)) return POSITIVE_REACTIONS[turn % POSITIVE_REACTIONS.length];
  return NEUTRAL_REACTIONS[turn % NEUTRAL_REACTIONS.length];
}

export function partnerTurn(topic: Topic, state: PartnerState, learnerLines: string[]): { lines: JaKo[]; state: PartnerState } {
  const said = learnerLines.join('');
  const lines: JaKo[] = [reaction(said, state.turns)];
  const next = { ...state, turns: state.turns + 1 };
  const askedBack = splitSentences(learnerLines).some(isQuestion);

  if (askedBack && !state.answered) {
    lines.push(topic.partner);
    next.answered = true;
  }
  if (next.next < topic.followUps.length) {
    lines.push(topic.followUps[next.next]);
    next.next += 1;
  } else if (!next.closed) {
    lines.push(CLOSING);
    next.closed = true;
  }
  return { lines, state: next };
}
