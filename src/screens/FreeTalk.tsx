import { useEffect, useRef, useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { connectors, patternById, type JaKo, type Topic } from '../content';
import { plain } from '../lib/furigana';
import { analyze, type Report } from '../lib/report';
import { sentenceTarget } from '../lib/days';
import { today, useSettings, useStore, type FreeTalk as FreeTalkRecord } from '../lib/store';
import { speak, stopSpeaking } from '../lib/tts';
import { initialPartner, partnerTurn, type PartnerState } from '../lib/partner';
import { useKeyboardOpen } from '../lib/useKeyboardOpen';
import { Ja, Sheet, SpeakButton, Tag, TimeBar, useCountdown, Next } from '../components/ui';
import { KanaInput, type KanaInputHandle } from '../components/KanaInput';
import { SurvivalList } from '../components/SurvivalList';

const DURATIONS = [30, 60, 120];
const STALL_HINTS = ['えっと…', 'そうですね…', '何て言うんだろう…'];

type Phase = 'intro' | 'talk' | 'report';

export function FreeTalk({ topic, day, onDone }: { topic: Topic; day: number; onDone?: () => void }) {
  const { update } = useStore();
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState<1 | 2>(1);
  const [seconds, setSeconds] = useState(120);
  const [rounds, setRounds] = useState<FreeTalkRecord[]>([]);

  const finishRound = (messages: string[], firstReaction: number | null, log: FreeTalkRecord['log']) => {
    const detect = topic.hints.patterns.flatMap((id) => patternById(id)?.detect ?? []);
    const report = analyze(messages, connectors, detect, firstReaction);
    const record: FreeTalkRecord = { topicId: topic.id, day, round, at: today(), messages, report, seconds, log };
    update((s) => ({ ...s, freetalks: [...s.freetalks, record] }));
    setRounds((r) => [...r, record]);
    setPhase('report');
  };

  if (phase === 'intro') {
    return <Intro topic={topic} round={round} seconds={seconds} setSeconds={setSeconds} onStart={() => setPhase('talk')} />;
  }
  if (phase === 'talk') {
    return <Talk key={round} topic={topic} seconds={seconds} onFinish={finishRound} />;
  }
  return (
    <ReportView
      topic={topic}
      day={day}
      rounds={rounds}
      onRetry={
        round === 1
          ? () => {
              setRound(2);
              setPhase('intro');
            }
          : undefined
      }
      onDone={onDone}
    />
  );
}

function Intro({ topic, round, seconds, setSeconds, onStart }: {
  topic: Topic; round: 1 | 2; seconds: number; setSeconds: (n: number) => void; onStart: () => void;
}) {
  const [hints, setHints] = useState(false);
  return (
    <div className="panel stack">
      <div className="row between">
        <span className="eyebrow">프리토킹{round === 2 ? ' · 2회차' : ''}</span>
        <SpeakButton text={topic.question.ja} label="질문 듣기" small />
      </div>
      <p className="prompt-ja">
        <Ja text={topic.question.ja} />
      </p>
      <p className="prompt-ko">{topic.question.ko}</p>
      <p className="muted">
        준비 없이 바로 대답해 보세요. 한 문장 쓰고 Enter, 이어서 다음 문장. <b>답 → 이유 → 예시 → 되묻기</b> 순서를 떠올리세요.
        잠깐 멈추면(4초) 유이가 맞장구치고 이어서 물어봐요. 되물으면 유이도 자기 얘기를 해요.
      </p>
      <div className="row wrap">
        <span>목표 시간</span>
        <div className="seg">
          {DURATIONS.map((d) => (
            <button key={d} className={seconds === d ? 'on' : ''} onClick={() => setSeconds(d)}>
              {d < 60 ? `${d}초` : `${d / 60}분`}
            </button>
          ))}
        </div>
      </div>
      <button className="btn ghost" onClick={() => setHints((h) => !h)} aria-expanded={hints}>
        {hints ? '힌트 숨기기' : '힌트 보기 (먼저 힌트 없이 해보는 걸 추천)'}
      </button>
      {hints && <Hints topic={topic} />}
      <button className="btn primary lg" onClick={onStart}>
        시작하기 <Next />
      </button>
    </div>
  );
}

function Hints({ topic }: { topic: Topic }) {
  return (
    <div className="hints stack">
      <div>
        <h4>쓸 만한 패턴</h4>
        <ul className="plain-list">
          {topic.hints.patterns.map((id) => {
            const p = patternById(id);
            return p && <li key={id}><b lang="ja">{p.form}</b> <span className="muted">{p.meaning}</span></li>;
          })}
        </ul>
      </div>
      <div>
        <h4>접속 표현</h4>
        <div className="row wrap">{topic.hints.connectors.map((c) => <Tag key={c}><span lang="ja">{c}</span></Tag>)}</div>
      </div>
      <div>
        <h4>단어</h4>
        <div className="row wrap">
          {topic.hints.words.map((w) => (
            <Tag key={w.ja}><Ja text={w.ja} /> {w.ko}</Tag>
          ))}
        </div>
      </div>
    </div>
  );
}

type ChatLine = { who: 'me' | 'them'; ja: string; ko?: string };

/** Learner silent this long after sending (and input empty) → ユイ takes her turn. */
const PARTNER_PAUSE_MS = 4000;
const YUI_PITCH = 1.15;

function Talk({ topic, seconds, onFinish }: {
  topic: Topic; seconds: number; onFinish: (m: string[], first: number | null, log: ChatLine[]) => void;
}) {
  const [settings] = useSettings();
  const keyboard = useKeyboardOpen();
  const input = useRef<KanaInputHandle>(null);
  const [chat, setChat] = useState<ChatLine[]>([{ who: 'them', ja: topic.question.ja, ko: topic.question.ko }]);
  const [started, setStarted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [firstKey, setFirstKey] = useState<number | null>(null);
  const [stuck, setStuck] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [ended, setEnded] = useState(false);
  const [partner, setPartner] = useState<PartnerState>(initialPartner);
  const [pending, setPending] = useState<string[]>([]); // learner lines since ユイ last spoke
  const [activity, setActivity] = useState(0); // bumps on every keystroke/send
  const typing = useRef(false);
  const chatRef = useRef(chat);
  chatRef.current = chat;
  const log = useRef<HTMLDivElement>(null);

  const end = () => {
    if (ended) return;
    setEnded(true);
    stopSpeaking();
    const lines = chatRef.current;
    const mine = lines.filter((l) => l.who === 'me').map((l) => l.ja);
    const first = firstKey === null ? null : Math.round(((firstKey - startedAt) / 1000) * 10) / 10;
    onFinish(mine, first, lines.map(({ who, ja }) => ({ who, ja })));
  };
  // ユイ's speaking time doesn't eat into the learner's time.
  const left = useCountdown(seconds, started && !speaking && !ended, end);

  /** ユイ says something (shown at once, spoken in order); the clock waits for her. */
  const yuiSays = async (lines: JaKo[]) => {
    setChat((c) => [...c, ...lines.map((l) => ({ who: 'them' as const, ja: l.ja, ko: l.ko }))]);
    if (!settings.sound) return;
    setSpeaking(true);
    for (const l of lines) await speak(plain(l.ja), { rate: settings.rate, voice: settings.voice, pitch: YUI_PITCH });
    setSpeaking(false);
  };

  // Ask the question, then start the clock when it has finished playing (Bluetooth earbuds lag).
  useEffect(() => {
    let cancelled = false;
    const start = () => {
      if (cancelled) return;
      setStartedAt(Date.now());
      setStarted(true);
    };
    if (settings.sound) speak(plain(topic.question.ja), { rate: settings.rate, voice: settings.voice, pitch: YUI_PITCH }).then(start);
    else start();
    return () => {
      cancelled = true;
      stopSpeaking();
    };
  }, []);

  const partnerTurnNow = () => {
    if (!pending.length || speaking || ended) return;
    const { lines, state } = partnerTurn(topic, partner, pending);
    setPartner(state);
    setPending([]);
    yuiSays(lines);
  };

  // The learner paused (sent something, input empty, no typing) → ユイ answers.
  useEffect(() => {
    if (!started || speaking || ended || !pending.length || typing.current) return;
    const id = window.setTimeout(partnerTurnNow, PARTNER_PAUSE_MS);
    return () => window.clearTimeout(id);
    // Not on every render: the countdown re-renders 5×/s and would keep resetting the pause.
  }, [started, speaking, ended, pending, partner, activity]);

  // No typing for 10 s after the clock starts → offer stalling phrases.
  useEffect(() => {
    if (!started || firstKey !== null) return;
    const id = window.setTimeout(() => setStuck(true), 10_000);
    return () => window.clearTimeout(id);
  }, [started, firstKey]);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [chat]);

  const onFirstKey = () => {
    if (firstKey === null) setFirstKey(Date.now());
    setStuck(false);
  };

  const send = (text: string) => {
    setChat((c) => [...c, { who: 'me', ja: text }]);
    setPending((p) => [...p, text]);
    setActivity((a) => a + 1);
  };

  return (
    <div className={`talk ${keyboard ? 'kb-open' : ''}`}>
      <div className="talk-main">
        <TimeBar left={left} total={seconds} />
        <div className="chat-log" ref={log}>
          {chat.map((l, i) =>
            l.who === 'them' ? (
              <div key={i} className="bubble them">
                <span className="who">ユイ</span>
                <Ja text={l.ja} />
                {l.ko && <span className="muted small">{l.ko}</span>}
              </div>
            ) : (
              <div key={i} className="bubble me" lang="ja">{l.ja}</div>
            ),
          )}
          {!started && <p className="muted small center">질문을 듣는 중… 끝나면 타이머가 시작돼요</p>}
          {speaking && started && <p className="muted small center">ユイ가 말하는 중 · 타이머 멈춤</p>}
        </div>
        {stuck && (
          <div className="stuck row wrap" role="status">
            <span className="muted small">막혔다면:</span>
            {STALL_HINTS.map((h) => (
              <button key={h} className="chip" onClick={() => input.current?.insert(h)} lang="ja">{h}</button>
            ))}
          </div>
        )}
        <div className="talk-input">
          <KanaInput ref={input} autoFocus onFirstKey={onFirstKey} onSubmit={send} disabled={ended}
            onType={(v) => {
              typing.current = v.length > 0;
              setActivity((a) => a + 1);
            }} />
          <div className="row between wrap">
            <button className="btn ghost sm survival-toggle" onClick={() => setSheet(true)}><LifeBuoy size={16} aria-hidden /> 생존 표현</button>
            <button className="btn sm" onClick={partnerTurnNow} disabled={!pending.length || speaking || ended}>
              ユイ 차례 <Next />
            </button>
            <button className="btn ghost sm" onClick={end}>끝내기</button>
          </div>
        </div>
      </div>
      <aside className="talk-side" aria-label="생존 표현">
        <h3>생존 표현 <span className="muted small">탭하면 입력창에 들어가요</span></h3>
        <SurvivalList compact onPick={(t) => input.current?.insert(t)} />
      </aside>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="생존 표현">
        <SurvivalList compact onPick={(t) => {
          input.current?.insert(t);
          setSheet(false);
        }} />
      </Sheet>
    </div>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className={`stat ${ok === undefined ? '' : ok ? 'good' : 'bad'}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function ReportStats({ r, target }: { r: Report; target: number }) {
  return (
    <div className="stats">
      <Stat label={`문장 (목표 ${target})`} value={String(r.sentences)} ok={r.sentences >= target} />
      <Stat label="첫 반응" value={r.firstReactionSec === null ? '—' : `${r.firstReactionSec}초`} ok={r.firstReactionSec !== null && r.firstReactionSec <= 10} />
      <Stat label="접속 표현" value={String(r.connectors.length)} ok={r.connectors.length >= 2} />
      <Stat label="되묻기" value={r.askedBack ? '했음' : '안 함'} ok={r.askedBack} />
      <Stat label="오늘 패턴" value={r.usedPattern ? '사용' : '미사용'} ok={r.usedPattern} />
      <Stat label="글자 수" value={String(r.chars)} />
    </div>
  );
}

function ReportView({ topic, day, rounds, onRetry, onDone }: {
  topic: Topic; day: number; rounds: FreeTalkRecord[]; onRetry?: () => void; onDone?: () => void;
}) {
  const { update } = useStore();
  const [register, setRegister] = useState<'polite' | 'casual'>(day >= 15 ? 'casual' : 'polite');
  const [memo, setMemo] = useState('');
  const [saved, setSaved] = useState(false);
  const last = rounds[rounds.length - 1];
  const model = topic.answers[register];
  const modelConnectors = analyze([plain(model.ja)], connectors, [], null).connectors;
  const target = sentenceTarget(day);

  const saveMemo = () => {
    if (!memo.trim()) return;
    update((s) => ({ ...s, memos: [...s.memos, { at: today(), topicId: topic.id, text: memo.trim() }] }));
    setMemo('');
    setSaved(true);
  };

  return (
    <div className="stack">
      <div className="panel stack">
        <h2>리포트 {rounds.length === 2 && <span className="muted small">1회차 → 2회차</span>}</h2>
        {rounds.length === 2 ? (
          <div className="compare">
            <div><h4>1회차</h4><ReportStats r={rounds[0].report} target={target} /></div>
            <div><h4>2회차</h4><ReportStats r={rounds[1].report} target={target} /></div>
          </div>
        ) : (
          <ReportStats r={last.report} target={target} />
        )}
        {last.report.connectors.length > 0 && (
          <p className="small">사용한 접속 표현: {last.report.connectors.map((c) => <Tag key={c}><span lang="ja">{c}</span></Tag>)}</p>
        )}
        <p className="muted small">자동 집계라 실제와 조금 다를 수 있어요. 문법은 채점하지 않아요 — 모범 답안과 비교해 보세요.</p>
      </div>

      <div className="compare">
        <div className="panel stack">
          <div className="row between">
            <h3>{last.log ? '대화 기록' : '내 대답'}</h3>
            {last.messages.length > 0 && <SpeakButton text={last.messages.join('。')} label="내 문장 듣기" small />}
          </div>
          {last.messages.length === 0 ? (
            <p className="muted">입력한 문장이 없어요. 다시 대답하기로 한 문장부터 시작해 봐요.</p>
          ) : last.log ? (
            <ul className="transcript" lang="ja">
              {last.log.map((l, i) => (
                <li key={i} className={l.who}>
                  <span className="who">{l.who === 'them' ? 'ユイ' : '나'}</span> {l.who === 'them' ? <Ja text={l.ja} /> : l.ja}
                </li>
              ))}
            </ul>
          ) : (
            <ol className="my-lines" lang="ja">{last.messages.map((m, i) => <li key={i}>{m}</li>)}</ol>
          )}
        </div>
        <div className="panel stack">
          <div className="row between">
            <h3>모범 답안</h3>
            <div className="seg">
              <button className={register === 'polite' ? 'on' : ''} onClick={() => setRegister('polite')}>정중체</button>
              <button className={register === 'casual' ? 'on' : ''} onClick={() => setRegister('casual')}>반말</button>
            </div>
          </div>
          <p className="model"><Ja text={model.ja} /></p>
          <p className="muted small">{model.ko}</p>
          <div className="row wrap">
            <SpeakButton text={model.ja} small />
            {modelConnectors.map((c) => <Tag key={c} tone="accent"><span lang="ja">{c}</span></Tag>)}
          </div>
        </div>
      </div>

      <div className="panel stack">
        <label htmlFor="memo"><b>말하고 싶었는데 못 한 말</b> <span className="muted small">(한국어로 적어두면 진도 화면에 모여요)</span></label>
        <div className="row">
          <input id="memo" className="text" value={memo} onChange={(e) => { setMemo(e.target.value); setSaved(false); }} placeholder="예: 요즘 빠져 있는 게임" />
          <button className="btn" onClick={saveMemo}>저장</button>
        </div>
        {saved && <p className="small good-text">저장했어요.</p>}
      </div>

      <div className="row wrap end">
        {onRetry && <button className="btn lg" onClick={onRetry}>모범 답안 보고 다시 대답하기</button>}
        {onDone && <button className="btn primary lg" onClick={onDone}>완료 <Next /></button>}
      </div>
    </div>
  );
}
