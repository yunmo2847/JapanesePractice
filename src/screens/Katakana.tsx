import { useMemo, useState } from 'react';
import { allKana, KANA_GROUPS, LOOKALIKES, type Kana, type KanaGroupId } from '../content/katakana';
import words from '../content/katakanaWords.json';
import { diff, grade, gradeKatakana, normalize, type Grade } from '../lib/kana';
import { navigate } from '../lib/router';
import { useSettings } from '../lib/store';
import { SpeakButton, Tag, useSpeak } from '../components/ui';
import { KanaInput } from '../components/KanaInput';

type Word = { ja: string; ko: string };
const TABS = [
  ['chart', '표'],
  ['chars', '글자 퀴즈'],
  ['read', '외래어 읽기'],
  ['write', '외래어 쓰기'],
] as const;

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** #/katakana[/chart|chars|read|write] */
export function Katakana({ tab = 'chart' }: { tab?: string }) {
  return (
    <div className="stack">
      <h1>가타카나</h1>
      <div className="seg" role="tablist" aria-label="가타카나 연습">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => navigate(`/katakana/${id}`)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'chart' && <Chart />}
      {tab === 'chars' && <CharQuiz />}
      {tab === 'read' && <WordDrill mode="read" />}
      {tab === 'write' && <WordDrill mode="write" />}
    </div>
  );
}

function Chart() {
  const say = useSpeak();
  return (
    <div className="stack">
      <p className="muted">글자를 탭하면 발음을 들을 수 있어요. 괄호 안은 입력할 때 치는 키예요.</p>
      {KANA_GROUPS.map((g) => (
        <section key={g.id} className="panel stack">
          <h3>{g.label}</h3>
          {g.note && <p className="muted small">{g.note}</p>}
          <div className="kana-grid">
            {g.rows.map((row, r) => (
              <div key={r} className="kana-row">
                {row.map((k) => (
                  <button key={k.kana} className="kana-cell" onClick={() => say(k.kana)} aria-label={`${k.kana} ${k.romaji}`}>
                    <span className="kana-big" lang="ja">{k.kana}</span>
                    <span className="small muted">{k.romaji}{k.type !== k.romaji && ` (${k.type})`}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const QUIZ_LENGTH = 20;

/** Four romaji options: look-alike characters first, then random ones from the same set. */
function optionsFor(target: Kana, pool: Kana[]): string[] {
  const alike = LOOKALIKES.find((set) => set.includes(target.kana)) ?? [];
  const byKana = new Map(pool.map((k) => [k.kana, k]));
  const wrong = new Set<string>();
  for (const ch of shuffle(alike)) {
    const k = byKana.get(ch);
    if (k && k.romaji !== target.romaji) wrong.add(k.romaji);
  }
  for (const k of shuffle(pool)) {
    if (wrong.size >= 3) break;
    if (k.romaji !== target.romaji) wrong.add(k.romaji);
  }
  return shuffle([target.romaji, ...[...wrong].slice(0, 3)]);
}

function CharQuiz() {
  const [groups, setGroups] = useState<KanaGroupId[]>(['basic']);
  const [round, setRound] = useState(0);
  // ヂ/ヅ share their reading with ジ/ズ, so they can't be asked by sound.
  const pool = useMemo(() => allKana(groups).filter((k) => k.kana !== 'ヂ' && k.kana !== 'ヅ'), [groups]);
  const toggle = (id: KanaGroupId) =>
    setGroups((g) => (g.includes(id) ? (g.length > 1 ? g.filter((x) => x !== id) : g) : [...g, id]));

  return (
    <div className="stack">
      <div className="row wrap">
        <span>범위</span>
        {KANA_GROUPS.map((g) => (
          <button key={g.id} className={`chip ${groups.includes(g.id) ? 'on' : ''}`} aria-pressed={groups.includes(g.id)} onClick={() => { toggle(g.id); setRound((r) => r + 1); }}>
            {g.label}
          </button>
        ))}
      </div>
      <CharRound key={`${groups.join()}-${round}`} pool={pool} onAgain={() => setRound((r) => r + 1)} />
    </div>
  );
}

function CharRound({ pool, onAgain }: { pool: Kana[]; onAgain: () => void }) {
  const [settings] = useSettings();
  const say = useSpeak();
  const [queue, setQueue] = useState(() => shuffle(pool).slice(0, QUIZ_LENGTH));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [missed, setMissed] = useState<Kana[]>([]);
  const current = queue[index];
  const options = useMemo(() => (current ? optionsFor(current, pool) : []), [current, pool]);

  if (!current) {
    return (
      <div className="panel center stack">
        <h2>퀴즈 완료</h2>
        <p>{QUIZ_LENGTH}문제 중 처음에 맞힌 것 <b>{QUIZ_LENGTH - missed.length}</b>개</p>
        {missed.length > 0 && (
          <p>틀린 글자: {missed.map((k) => <Tag key={k.kana}><span lang="ja">{k.kana}</span> {k.romaji}</Tag>)}</p>
        )}
        <button className="btn primary lg" onClick={onAgain}>한 번 더</button>
      </div>
    );
  }

  const choose = (romaji: string) => {
    if (picked) return;
    setPicked(romaji);
    if (settings.sound) say(current.kana);
    if (romaji !== current.romaji && !missed.includes(current)) {
      setMissed((m) => [...m, current]);
      setQueue((q) => [...q, current]); // ask it again at the end
    }
  };

  return (
    <div className="panel stack center">
      <span className="muted">{index + 1} / {queue.length}</span>
      <p className="kana-quiz" lang="ja">{current.kana}</p>
      <div className="quiz-options">
        {options.map((o) => {
          const cls = !picked ? '' : o === current.romaji ? 'good' : o === picked ? 'bad' : '';
          return <button key={o} className={`btn lg ${cls}`} onClick={() => choose(o)} disabled={Boolean(picked)}>{o}</button>;
        })}
      </div>
      {picked && (
        <button className="btn primary lg" autoFocus onClick={() => { setPicked(null); setIndex((i) => i + 1); }}>다음 ▶</button>
      )}
    </div>
  );
}

const WORDS_PER_ROUND = 10;

function WordDrill({ mode }: { mode: 'read' | 'write' }) {
  const [round, setRound] = useState(0);
  return <WordRound key={`${mode}-${round}`} mode={mode} onAgain={() => setRound((r) => r + 1)} />;
}

function WordRound({ mode, onAgain }: { mode: 'read' | 'write'; onAgain: () => void }) {
  const [settings] = useSettings();
  const say = useSpeak();
  const [list] = useState<Word[]>(() => shuffle(words).slice(0, WORDS_PER_ROUND));
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<{ input: string; grade: Grade } | null>(null);
  const [score, setScore] = useState(0);
  const word = list[index];

  if (!word) {
    return (
      <div className="panel center stack">
        <h2>완료</h2>
        <p>{WORDS_PER_ROUND}개 중 <b>{score}</b>개 정답</p>
        <button className="btn primary lg" onClick={onAgain}>한 번 더</button>
      </div>
    );
  }

  const submit = (input: string) => {
    const g = mode === 'write' ? gradeKatakana(input, word.ja) : grade(input, [word.ja]).grade;
    setResult({ input, grade: g });
    if (g === 'correct') setScore((s) => s + 1);
    if (settings.sound) say(word.ja);
  };

  return (
    <div className="panel stack">
      <span className="muted">{index + 1} / {list.length}</span>
      {mode === 'read' ? (
        <>
          <p className="kana-word" lang="ja">{word.ja}</p>
          <p className="muted">읽는 법을 로마자로 입력하세요 (예: ko-hi- → こーひー)</p>
        </>
      ) : (
        <>
          <p className="prompt-ko">{word.ko}</p>
          <p className="muted">가타카나로 쓰세요. 로마자로 치면 가타카나로 바뀌어요. 장음 ー 는 - 키.</p>
        </>
      )}
      {!result ? (
        <KanaInput key={index} autoFocus katakana={mode === 'write'} submitLabel="확인" onSubmit={submit}
          placeholder={mode === 'write' ? '로마자 입력 (ka → カ)' : '로마자 입력 (ka → か)'} />
      ) : (
        <div className="stack">
          <div className="row">
            <Tag tone={result.grade === 'correct' ? 'good' : result.grade === 'near' ? 'warn' : 'bad'}>
              {{ correct: '정답!', near: '거의 정답', wrong: '다시 한번' }[result.grade]}
            </Tag>
            {mode === 'write' && result.grade === 'near' && normalize(result.input) === normalize(word.ja) && (
              <span className="small muted">소리는 맞아요. 가타카나·장음(ー) 표기를 확인하세요.</span>
            )}
          </div>
          {result.grade !== 'correct' && (
            <p className="diff">
              {diff(result.input, normalize(word.ja)).map((d, i) => <span key={i} className={d.ok ? 'ok' : 'miss'}>{d.text}</span>)}
              <span className="muted small"> · 내 답: {result.input}</span>
            </p>
          )}
          <p className="kana-word" lang="ja">{word.ja}</p>
          <p>{word.ko}</p>
          <div className="row wrap">
            <SpeakButton text={word.ja} />
            <button className="btn primary lg" autoFocus onClick={() => { setResult(null); setIndex((i) => i + 1); }}>다음 ▶</button>
          </div>
        </div>
      )}
    </div>
  );
}
