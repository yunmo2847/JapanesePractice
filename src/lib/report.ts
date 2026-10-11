import { normalize } from './kana';

export type Connector = { forms: string[]; ko: string; match?: string };

export type Report = {
  sentences: number;
  chars: number;
  firstReactionSec: number | null;
  connectors: string[];
  askedBack: boolean;
  usedPattern: boolean;
};

/** Splits chat messages into sentences on 。！？ and line breaks. */
export function splitSentences(messages: string[]): string[] {
  return messages
    .flatMap((m) => m.split(/(?<=[。！？!?])|\n/))
    .map((s) => s.trim())
    .filter((s) => s.replace(/[。！？!?、\s]/g, '').length > 0);
}

/** A sentence that ends as a question: ...か / ...？ / ...は? */
export function isQuestion(sentence: string): boolean {
  return /[?？]$/.test(sentence.trim()) || /か$/.test(normalize(sentence));
}

export function analyze(
  messages: string[],
  connectors: Connector[],
  patternDetect: string[],
  firstReactionSec: number | null,
): Report {
  const sentences = splitSentences(messages);
  const all = messages.join('');
  const norm = normalize(all);
  const has = (form: string) => all.includes(form) || norm.includes(normalize(form));
  return {
    sentences: sentences.length,
    chars: all.replace(/[\s。、！？!?]/g, '').length,
    firstReactionSec,
    connectors: connectors
      .filter((c) => (c.match ? new RegExp(c.match).test(norm) : c.forms.some(has)))
      .map((c) => c.forms[0]),
    askedBack: sentences.some(isQuestion),
    usedPattern: patternDetect.some(has),
  };
}
