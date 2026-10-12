// All Japanese strings use furigana markup: 漢字{かんじ}, "|" = block boundary.

export type Skill = 'retrieval' | 'chain' | 'extend' | 'recover' | 'turn';
export type Register = 'polite' | 'casual';
export type JaKo = { ja: string; ko: string };

export type Card = {
  id: string;
  day: number;
  skill: Skill;
  ko: string;
  ja: string;
  alt?: string[]; // other accepted answers
  register: Register;
  nuance?: string;
};

export type Pattern = {
  id: string;
  day: number;
  title: string;
  form: string;
  meaning: string;
  usage: string;
  polite: JaKo;
  casual: JaKo;
  swap: { template: string; words: JaKo[] }; // template contains ＿
  examples: JaKo[];
  detect: string[]; // forms that show the pattern was used in free talk
};

export type ChainLink = { label: string; connector: string; hint: string; example: JaKo };

export type Chain = {
  id: string;
  day: number;
  kind: 'chain' | 'formula';
  start: JaKo; // chain: first sentence / formula: the question
  links: ChainLink[];
};

export type Topic = {
  id: string;
  day: number;
  question: JaKo;
  hints: { patterns: string[]; connectors: string[]; words: JaKo[] };
  answers: { polite: JaKo; casual: JaKo };
  partner: JaKo; // ユイ's own answer, said when the learner asks back
  followUps: JaKo[]; // ユイ's next questions, one per learner turn
};

export type Dialogue = {
  id: string;
  day: number;
  title: string;
  scene: string;
  turns: (JaKo & { speaker: 'ユイ' | 'ケン' })[]; // last turn is a question to the learner
  reply: JaKo; // model reply to the last turn
  quiz: { q: string; options: string[]; answer: number }[];
};

export type SurvivalCategory =
  | 'stall' | 'paraphrase' | 'check' | 'aizuchi' | 'switch' | 'opinion' | 'feeling'
  | 'home_greet' | 'home_meal' | 'home_ask' | 'home_life';

export type Survival = {
  id: string;
  cat: SurvivalCategory;
  ja: string;
  ko: string;
  register: Register | 'both';
  example?: JaKo;
};

/** `match` (regex on normalized kana) narrows ambiguous forms, e.g. reason-から vs 韓国から. */
export type Connector = { forms: string[]; ko: string; match?: string };

export type StructureSection = 'order' | 'particle' | 'verb' | 'adj' | 'question' | 'connect' | 'ending' | 'request';

/** One entry of the sentence-structure book. Table cells use the same furigana markup. */
export type Structure = {
  id: string;
  section: StructureSection;
  title: string;
  form: string;
  meaning: string;
  note: string;
  table?: [string, string][];
  examples: JaKo[];
};
