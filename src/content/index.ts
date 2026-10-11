import type { Card, Chain, Connector, Dialogue, Pattern, Survival, SurvivalCategory, Topic } from './types';
import cardsJson from './cards.json';
import patternsJson from './patterns.json';
import chainsJson from './chains.json';
import topicsJson from './topics.json';
import dialoguesJson from './dialogues.json';
import survivalJson from './survival.json';
import connectorsJson from './connectors.json';

export * from './types';

export const cards = cardsJson as Card[];
export const patterns = patternsJson as Pattern[];
export const chains = chainsJson as Chain[];
export const topics = topicsJson as Topic[];
export const dialogues = dialoguesJson as Dialogue[];
export const survival = survivalJson as Survival[];
export const connectors = connectorsJson as Connector[];

/** Last day that has content. Days after this show "콘텐츠 준비 중". */
export const CONTENT_DAYS = 7;

export const byDay = <T extends { day: number }>(list: T[], day: number) => list.filter((x) => x.day === day);

export const patternById = (id: string) => patterns.find((p) => p.id === id);

export const SKILL_LABEL: Record<Card['skill'], string> = {
  retrieval: '즉시 인출',
  chain: '문장 잇기',
  extend: '답 늘리기',
  recover: '막혔을 때',
  turn: '주고받기',
};

export const SURVIVAL_LABEL: Record<SurvivalCategory, string> = {
  stall: '시간 벌기',
  paraphrase: '바꿔 말하기',
  check: '되묻기·확인',
  aizuchi: '맞장구',
  switch: '화제 전환',
  opinion: '의견',
  feeling: '감정',
};

/** Day theme shown on the home screen (plan 3.2). */
export const DAY_THEME: Record<number, string> = {
  1: '자기소개 3문장',
  2: '시간 순서로 말하기',
  3: '답변 확장 ① 이유 붙이기',
  4: '답변 확장 ② 예시 붙이기',
  5: '묘사하기',
  6: '되묻기',
  7: '복습 + 프리토킹 테스트 ①',
};
