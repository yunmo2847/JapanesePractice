// Content markup: 漢字{かんじ} gives the preceding kanji run a reading.
// "|" separates word blocks for the block-assembly drill.
// Example: "私{わたし}は|学生{がくせい}|です。"

export type Segment = { text: string; ruby?: string };

const RUBY = /([々一-鿿]+)\{([^}]+)\}/g;

export function segments(markup: string): Segment[] {
  const src = markup.replace(/\|/g, '');
  const out: Segment[] = [];
  let last = 0;
  for (const m of src.matchAll(RUBY)) {
    if (m.index! > last) out.push({ text: src.slice(last, m.index) });
    out.push({ text: m[1], ruby: m[2] });
    last = m.index! + m[0].length;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}

/** Display text without readings: 私は学生です。 */
export function plain(markup: string): string {
  return segments(markup).map((s) => s.text).join('');
}

/** Reading with kanji replaced by kana: わたしはがくせいです。 */
export function reading(markup: string): string {
  return segments(markup).map((s) => s.ruby ?? s.text).join('');
}

/** Word blocks (markup), trailing sentence punctuation removed. */
export function blocks(markup: string): string[] {
  return markup
    .replace(/[。？！?!]+$/, '')
    .split('|')
    .filter(Boolean);
}
