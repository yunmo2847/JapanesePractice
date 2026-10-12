// Katakana chart. Each entry is "カナ:romaji" or "カナ:romaji:what-to-type" when the
// keyboard input differs from the reading (ティ is typed "thi").

export type Kana = { kana: string; romaji: string; type: string };
export type KanaGroupId = 'basic' | 'voiced' | 'combo' | 'extended';
export type KanaRow = Kana[];

const parse = (row: string): KanaRow =>
  row.split(' ').map((cell) => {
    const [kana, romaji, type] = cell.split(':');
    return { kana, romaji, type: type ?? romaji };
  });

export const KANA_GROUPS: { id: KanaGroupId; label: string; note?: string; rows: KanaRow[] }[] = [
  {
    id: 'basic',
    label: '기본',
    rows: [
      'ア:a イ:i ウ:u エ:e オ:o',
      'カ:ka キ:ki ク:ku ケ:ke コ:ko',
      'サ:sa シ:shi ス:su セ:se ソ:so',
      'タ:ta チ:chi ツ:tsu テ:te ト:to',
      'ナ:na ニ:ni ヌ:nu ネ:ne ノ:no',
      'ハ:ha ヒ:hi フ:fu ヘ:he ホ:ho',
      'マ:ma ミ:mi ム:mu メ:me モ:mo',
      'ヤ:ya ユ:yu ヨ:yo',
      'ラ:ra リ:ri ル:ru レ:re ロ:ro',
      'ワ:wa ヲ:wo ン:n:nn',
    ].map(parse),
  },
  {
    id: 'voiced',
    label: '탁음·반탁음',
    note: 'ヂ·ヅ는 ジ·ズ와 소리가 같아서 거의 쓰지 않아요.',
    rows: [
      'ガ:ga ギ:gi グ:gu ゲ:ge ゴ:go',
      'ザ:za ジ:ji ズ:zu ゼ:ze ゾ:zo',
      'ダ:da ヂ:ji:di ヅ:zu:du デ:de ド:do',
      'バ:ba ビ:bi ブ:bu ベ:be ボ:bo',
      'パ:pa ピ:pi プ:pu ペ:pe ポ:po',
    ].map(parse),
  },
  {
    id: 'combo',
    label: '요음',
    rows: [
      'キャ:kya キュ:kyu キョ:kyo',
      'シャ:sha シュ:shu ショ:sho',
      'チャ:cha チュ:chu チョ:cho',
      'ニャ:nya ニュ:nyu ニョ:nyo',
      'ヒャ:hya ヒュ:hyu ヒョ:hyo',
      'ミャ:mya ミュ:myu ミョ:myo',
      'リャ:rya リュ:ryu リョ:ryo',
      'ギャ:gya ギュ:gyu ギョ:gyo',
      'ジャ:ja ジュ:ju ジョ:jo',
      'ビャ:bya ビュ:byu ビョ:byo',
      'ピャ:pya ピュ:pyu ピョ:pyo',
    ].map(parse),
  },
  {
    id: 'extended',
    label: '외래어 전용',
    note: '외래어 소리를 적으려고 만든 조합이에요. 장음은 ー (입력할 때 - 키).',
    rows: [
      'ファ:fa フィ:fi フェ:fe フォ:fo',
      'ティ:ti:thi ディ:di:dhi トゥ:tu:twu ドゥ:du:dwu',
      'ウィ:wi ウェ:we シェ:she ジェ:je チェ:che',
    ].map(parse),
  },
];

/** Characters that look alike; the quiz uses them as wrong options first. */
export const LOOKALIKES: string[][] = [
  ['シ', 'ツ'], ['ソ', 'ン', 'リ', 'ノ'], ['ク', 'ワ', 'ウ', 'フ', 'タ'], ['ヌ', 'ス'],
  ['チ', 'テ'], ['コ', 'ユ'], ['マ', 'ア', 'ム'], ['ナ', 'メ'], ['ル', 'レ'], ['ヲ', 'ラ'],
];

export const allKana = (groups: KanaGroupId[] = KANA_GROUPS.map((g) => g.id)) =>
  KANA_GROUPS.filter((g) => groups.includes(g.id)).flatMap((g) => g.rows.flat());
