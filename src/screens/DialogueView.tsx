import { useEffect, useRef, useState } from 'react';
import type { Card, Dialogue } from '../content';
import { plain } from '../lib/furigana';
import { diff, grade } from '../lib/kana';
import { speak, stopSpeaking } from '../lib/tts';
import { useSettings, useStore } from '../lib/store';
import { Ja, SpeakButton, Tag, TimeBar, useCountdown } from '../components/ui';
import { KanaInput } from '../components/KanaInput';

const PITCH = { ユイ: 1.15, ケン: 0.85 };
const SUBS = ['일본어+한국어', '일본어만', '자막 없음'];
const REPLY_SECONDS = 20;

export function DialogueView({ dialogue: d, day, onDone }: { dialogue: Dialogue; day: number; onDone?: () => void }) {
  const [settings, setSettings] = useSettings();
  const { state, update } = useStore();
  const [subs, setSubs] = useState(0);
  const [dictation, setDictation] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const [answering, setAnswering] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<(number | null)[]>(d.quiz.map(() => null));
  const [added, setAdded] = useState<string | null>(null);
  const stop = useRef(false);

  useEffect(() => () => stopSpeaking(), []);

  const playTurn = (i: number) => speak(plain(d.turns[i].ja), { rate: settings.rate, voice: settings.voice, pitch: PITCH[d.turns[i].speaker] });

  const playAll = async () => {
    if (playing !== null) {
      stop.current = true;
      stopSpeaking();
      setPlaying(null);
      return;
    }
    stop.current = false;
    for (let i = 0; i < d.turns.length; i++) {
      if (stop.current) break;
      setPlaying(i);
      await playTurn(i);
      await new Promise((r) => setTimeout(r, 400));
    }
    setPlaying(null);
  };

  const addCard = (i: number) => {
    const t = d.turns[i];
    const card: Card = { id: `u-${d.id}-${i}`, day, skill: 'turn', ko: t.ko.replace(/^\(나에게\)\s*/, ''), ja: t.ja, register: 'polite' };
    if (!state.custom.some((c) => c.id === card.id)) update((s) => ({ ...s, custom: [...s.custom, card] }));
    setAdded(plain(t.ja));
  };

  const answerQuiz = (qi: number, oi: number) => {
    if (quiz[qi] !== null) return;
    const next = quiz.map((v, i) => (i === qi ? oi : v));
    setQuiz(next);
    if (next.every((v) => v !== null)) {
      const correct = next.filter((v, i) => v === d.quiz[i].answer).length;
      update((s) => ({ ...s, quiz: { ...s.quiz, [d.id]: { correct, total: d.quiz.length } } }));
    }
  };

  return (
    <div className="stack">
      <div className="panel stack">
        <div className="row between wrap">
          <h2>{d.title}</h2>
          <Tag tone="accent">듣기 → 반응</Tag>
        </div>
        <p className="muted">{d.scene}</p>
        <div className="row wrap">
          <button className="btn primary" onClick={playAll}>{playing !== null ? '■ 정지' : '▶ 전체 듣기'}</button>
          <div className="seg" aria-label="속도">
            {[0.7, 0.85, 1, 1.2].map((r) => (
              <button key={r} className={settings.rate === r ? 'on' : ''} onClick={() => setSettings({ rate: r })}>{r}×</button>
            ))}
          </div>
        </div>
        <div className="row wrap">
          <div className="seg" aria-label="자막">
            {SUBS.map((label, i) => (
              <button key={label} className={subs === i ? 'on' : ''} onClick={() => setSubs(i)}>{label}</button>
            ))}
          </div>
          <button className={`btn ghost sm ${dictation ? 'on' : ''}`} onClick={() => setDictation((x) => !x)} aria-pressed={dictation}>
            ✍ 받아쓰기 {dictation ? 'ON' : 'OFF'}
          </button>
        </div>
        <p className="muted small">턴을 탭하면 그 문장만 재생 · 길게 누르면 인출 카드로 추가</p>
        {added && <p className="small good-text" role="status">카드에 추가했어요: {added}</p>}
      </div>

      <ol className="turns">
        {d.turns.map((t, i) => (
          <Turn key={i} turn={t} index={i} active={playing === i} subs={subs} dictation={dictation}
            onPlay={() => playTurn(i)} onLongPress={() => addCard(i)} />
        ))}
      </ol>

      <div className="panel stack">
        <h3>마지막 질문에 대답하기</h3>
        {!answering && reply === null && (
          <button className="btn primary lg" onClick={() => setAnswering(true)}>대답하기 ({REPLY_SECONDS}초)</button>
        )}
        {answering && <ReplyBox onSubmit={(t) => { setReply(t); setAnswering(false); }} />}
        {reply !== null && (
          <div className="stack">
            {reply && <p lang="ja">내 대답: {reply}</p>}
            <p className="answer"><Ja text={d.reply.ja} /></p>
            <p className="muted small">모범 답안 · {d.reply.ko}</p>
            <SpeakButton text={d.reply.ja} small />
          </div>
        )}
      </div>

      <div className="panel stack">
        <h3>이해 확인</h3>
        {d.quiz.map((q, qi) => (
          <div key={qi} className="stack quiz">
            <p><b>Q{qi + 1}.</b> {q.q}</p>
            <div className="quiz-options">
              {q.options.map((o, oi) => {
                const chosen = quiz[qi];
                const cls = chosen === null ? '' : oi === q.answer ? 'good' : oi === chosen ? 'bad' : '';
                return <button key={oi} className={`btn ${cls}`} onClick={() => answerQuiz(qi, oi)} disabled={chosen !== null}>{o}</button>;
              })}
            </div>
          </div>
        ))}
      </div>

      {onDone && <button className="btn primary lg" onClick={onDone}>다음으로 ▶</button>}
    </div>
  );
}

function ReplyBox({ onSubmit }: { onSubmit: (t: string) => void }) {
  const left = useCountdown(REPLY_SECONDS, true, () => onSubmit(''));
  return (
    <div className="stack">
      <TimeBar left={left} total={REPLY_SECONDS} />
      <KanaInput autoFocus submitLabel="대답" onSubmit={onSubmit} />
    </div>
  );
}

function Turn({ turn, index, active, subs, dictation, onPlay, onLongPress }: {
  turn: Dialogue['turns'][number]; index: number; active: boolean; subs: number; dictation: boolean;
  onPlay: () => void; onLongPress: () => void;
}) {
  const [typed, setTyped] = useState<string | null>(null);
  const timer = useRef(0);
  const long = useRef(false);
  const target = grade(typed ?? '', [turn.ja]);

  return (
    <li className={`turn ${turn.speaker === 'ユイ' ? 'yui' : 'ken'} ${active ? 'active' : ''}`}>
      <button
        className="turn-body"
        onClick={() => { if (!long.current) onPlay(); }}
        onPointerDown={() => {
          long.current = false;
          timer.current = window.setTimeout(() => { long.current = true; onLongPress(); }, 600);
        }}
        onPointerUp={() => clearTimeout(timer.current)}
        onPointerLeave={() => clearTimeout(timer.current)}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={`${index + 1}번째 턴 재생`}
      >
        <span className="who">{turn.speaker}</span>
        {dictation && typed === null ? (
          <span className="muted">🔊 듣고 아래에 받아쓰세요</span>
        ) : subs < 2 || (dictation && typed !== null) ? (
          <Ja text={turn.ja} />
        ) : (
          <span className="muted">🔊 (자막 없음)</span>
        )}
        {subs === 0 && !dictation && <span className="muted small">{turn.ko}</span>}
      </button>
      {dictation && typed === null && <KanaInput submitLabel="채점" placeholder="들은 대로 입력" onSubmit={setTyped} />}
      {dictation && typed !== null && (
        <p className="diff small">
          <Tag tone={target.grade === 'correct' ? 'good' : target.grade === 'near' ? 'warn' : 'bad'}>
            {{ correct: '정답', near: '거의', wrong: '다시' }[target.grade]}
          </Tag>{' '}
          {diff(typed, target.target).map((p, i) => <span key={i} className={p.ok ? 'ok' : 'miss'}>{p.text}</span>)}
        </p>
      )}
    </li>
  );
}
