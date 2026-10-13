import type { Card, Chain, Connector, Dialogue, Pattern, Structure, StructureSection, Survival, SurvivalCategory, Topic } from './types';
import cardsJson from './cards.json';
import patternsJson from './patterns.json';
import chainsJson from './chains.json';
import topicsJson from './topics.json';
import dialoguesJson from './dialogues.json';
import survivalJson from './survival.json';
import connectorsJson from './connectors.json';
import structuresJson from './structures.json';

export * from './types';

export const cards = cardsJson as Card[];
export const patterns = patternsJson as Pattern[];
export const chains = chainsJson as Chain[];
export const topics = topicsJson as Topic[];
export const dialogues = dialoguesJson as Dialogue[];
export const survival = survivalJson as Survival[];
export const connectors = connectorsJson as Connector[];
export const structures = structuresJson as Structure[];

/** Last day that has content. Days after this show "콘텐츠 준비 중". */
export const CONTENT_DAYS = 14;

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
  home_greet: '인사',
  home_meal: '식사',
  home_ask: '부탁·허락',
  home_life: '생활·감사',
};

/** The expression book is split into sections; each section shows its categories. */
export const SURVIVAL_SECTIONS: { id: string; label: string; cats: SurvivalCategory[] }[] = [
  { id: 'talk', label: '대화 생존', cats: ['stall', 'paraphrase', 'check', 'aizuchi', 'switch', 'opinion', 'feeling'] },
  { id: 'home', label: '홈스테이', cats: ['home_greet', 'home_meal', 'home_ask', 'home_life'] },
];

/** Day theme shown on the home screen (plan 3.2). */
export const DAY_THEME: Record<number, string> = {
  1: '자기소개 3문장',
  2: '시간 순서로 말하기',
  3: '답변 확장 ① 이유 붙이기',
  4: '답변 확장 ② 예시 붙이기',
  5: '묘사하기',
  6: '되묻기',
  7: '복습 + 프리토킹 테스트 ①',
  8: '과거 이야기 순서',
  9: '문장 잇기 ① て형',
  10: '이유 붙이기',
  11: '반대·완충 (けど · でも)',
  12: '의견 말하기',
  13: '막혔을 때 버티기',
  14: '복습 + 프리토킹 테스트 ②',
};

export const STRUCTURE_SECTIONS: { id: StructureSection; label: string }[] = [
  { id: 'order', label: '기본 어순' },
  { id: 'particle', label: '조사' },
  { id: 'verb', label: '동사' },
  { id: 'adj', label: '형용사' },
  { id: 'question', label: '질문·대답' },
  { id: 'connect', label: '문장 잇기' },
  { id: 'ending', label: '말끝' },
  { id: 'request', label: '부탁·권유' },
];
