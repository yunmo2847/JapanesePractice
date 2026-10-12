import { useEffect, useMemo, useState } from 'react';
import { Flag } from 'lucide-react';
import { SKILL_LABEL, type Card } from '../content';
import { blocks, plain } from '../lib/furigana';
import { diff, grade, type Grade } from '../lib/kana';
import { rate, type Rating } from '../lib/srs';
import { today, useSettings, useStore, type OutputMode } from '../lib/store';
import { Ja, SpeakButton, Tag, TimeBar, useCountdown, useSpeak, Next } from '../components/ui';
import { KanaInput } from '../components/KanaInput';

const limitFor = (card: Card) => (plain(card.ja).length <= 8 ? 10 : 15);

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  // Never hand out the blocks already in order.
  return a.length > 1 && a.every((x, i) => x === list[i]) ? shuffle(list) : a;
}

type Result = { grade: Grade | 'silent'; input: string; inTime: boolean };

export function CardDrill({ cards, onDone }: { cards: Card[]; onDone: () => void }) {
  const { update } = useStore();
  const [settings] = useSettings();
  const [queue, setQueue] = useState(cards);
  const [requeued, setRequeued] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<OutputMode>(settings.output);
  const [tally, setTally] = useState({ good: 0, ok: 0, bad: 0 });

  const card = queue[index];
  if (!card) {
    return (
      <div className="panel center stack">
        <h2>카드 완료</h2>
        <p>
          바로 말함 <b>{tally.good}</b> · 떠올림 <b>{tally.ok}</b> · 못 함 <b>{tally.bad}</b>
        </p>
        <button className="btn primary lg" onClick={onDone}>
          다음으로
        </button>
      </div>
    );
  }

  const finish = (rating: Rating, inTime: boolean) => {
    update((s) => ({ ...s, cards: { ...s.cards, [card.id]: rate(s.cards[card.id], rating, today(), inTime) } }));
    setTally((t) => ({ ...t, [rating]: t[rating] + 1 }));
    if (rating === 'bad' && !requeued.has(card.id)) {
      setQueue((q) => [...q, card]);
      setRequeued((r) => new Set(r).add(card.id));
    }
    setIndex((i) => i + 1);
  };

  const effectiveMode = mode === 'blocks' && blocks(card.ja).length < 2 ? 'typing' : mode;

  return (
    <div className="stack">
      <div className="row between">
        <span className="muted">
          {index + 1} / {queue.length}
        </span>
        <div className="seg" role="group" aria-label="출력 방식">
          {(['typing', 'blocks', 'silent'] as OutputMode[]).map((m) => (
            <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
              {{ typing: '타이핑', blocks: '블록', silent: '속으로' }[m]}
            </button>
          ))}
        </div>
      </div>
      <CardView key={`${card.id}-${index}-${effectiveMode}`} card={card} mode={effectiveMode} onRated={finish} />
    </div>
  );
}

function CardView({ card, mode, onRated }: { card: Card; mode: OutputMode; onRated: (r: Rating, inTime: boolean) => void }) {
  const { update } = useStore();
  const [settings] = useSettings();
  const say = useSpeak();
  const limit = limitFor(card);
  const [result, setResult] = useState<Result | null>(null);
  const left = useCountdown(limit, !result, () => {});
  const answers = [card.ja, ...(card.alt ?? [])];
  const [pool, setPool] = useState(() => shuffle(blocks(card.ja).map((b, i) => ({ b, i }))));
  const [picked, setPicked] = useState<{ b: string; i: number }[]>([]);

  const reveal = (r: Result) => {
    setResult(r);
    if (settings.autoplay && settings.sound) say(card.ja);
  };

  const submitText = (input: string) => reveal({ grade: grade(input, answers).grade, input, inTime: left > 0 });

  useEffect(() => {
    if (mode !== 'blocks' || pool.length > 0 || picked.length === 0 || result) return;
    const input = picked.map((p) => plain(p.b)).join('');
    reveal({ grade: grade(input, answers).grade === 'correct' ? 'correct' : 'wrong', input, inTime: left > 0 });
  }, [pool, picked]);

  // Hardware keyboard shortcuts (Book Cover keyboard, DeX): Tab = show answer, 1/2/3 = rate, R = replay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!result && e.key === 'Tab') {
        e.preventDefault();
        reveal({ grade: mode === 'silent' ? 'silent' : 'wrong', input: '', inTime: false });
        return;
      }
      if (!result || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'r' || e.key === 'R') say(card.ja);
      const needsRating = result.grade === 'silent' || result.grade === 'near';
      if (needsRating && ['1', '2', '3'].includes(e.key)) {
        onRated((['good', 'ok', 'bad'] as Rating[])[Number(e.key) - 1], e.key === '1' && result.inTime);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const flag = () =>
    update((s) => ({ ...s, flags: [...s.flags, { id: card.id, at: today(), note: result?.input || undefined }] }));

  return (
    <div className="panel stack card-view">
      <p className="eyebrow">{SKILL_LABEL[card.skill]} · {card.register === 'polite' ? '정중체' : '반말'}</p>
      <p className="prompt-ko">{card.ko}</p>
      {!result && <TimeBar left={left} total={limit} />}

      {!result && mode === 'typing' && <KanaInput autoFocus onSubmit={submitText} submitLabel="확인" />}

      {!result && mode === 'blocks' && (
        <div className="stack">
          <div className="block-answer" aria-label="내가 맞춘 문장">
            {picked.length === 0 && <span className="muted">아래 블록을 순서대로 탭하세요</span>}
            {picked.map((p) => (
              <button key={p.i} className="block on" onClick={() => {
                setPicked((x) => x.filter((y) => y.i !== p.i));
                setPool((x) => [...x, p]);
              }}>
                <Ja text={p.b} />
              </button>
            ))}
          </div>
          <div className="block-pool">
            {pool.map((p) => (
              <button key={p.i} className="block" onClick={() => {
                setPool((x) => x.filter((y) => y.i !== p.i));
                setPicked((x) => [...x, p]);
              }}>
                <Ja text={p.b} />
              </button>
            ))}
          </div>
        </div>
      )}

      {!result && mode === 'silent' && (
        <div className="stack">
          <p className="muted">머릿속으로 일본어 문장을 말해 본 뒤 정답을 확인하세요. (입모양만 따라 해도 좋아요)</p>
          <button className="btn primary lg" onClick={() => reveal({ grade: 'silent', input: '', inTime: left > 0 })}>
            정답 보기
          </button>
        </div>
      )}

      {result && (
        <div className="stack">
          <ResultBadge grade={result.grade} inTime={result.inTime} />
          {result.input && result.grade !== 'correct' && (
            <p className="diff" aria-label="내 답과 정답 비교">
              {diff(result.input, grade(result.input, answers).target).map((d, i) => (
                <span key={i} className={d.ok ? 'ok' : 'miss'}>
                  {d.text}
                </span>
              ))}
              <span className="muted small"> ← 빨간 글자가 빠졌거나 다른 부분 · 내 답: {result.input}</span>
            </p>
          )}
          <p className="answer">
            <Ja text={card.ja} />
          </p>
          <div className="row wrap">
            <SpeakButton text={card.ja} />
            <button className="btn ghost sm" onClick={flag} title="정답이 이상하거나, 내 답도 맞는 것 같을 때">
              <Flag size={16} aria-hidden /> 이상해요
            </button>
          </div>
          {card.nuance && <p className="nuance">{card.nuance}</p>}
          <RatingButtons result={result} onRated={onRated} />
        </div>
      )}
    </div>
  );
}

function ResultBadge({ grade, inTime }: { grade: Result['grade']; inTime: boolean }) {
  if (grade === 'silent') return null;
  const label = { correct: '정답!', near: '거의 정답', wrong: '다시 한번' }[grade];
  const tone = { correct: 'good', near: 'warn', wrong: 'bad' }[grade] as 'good' | 'warn' | 'bad';
  return (
    <div className="row">
      <Tag tone={tone}>{label}</Tag>
      {!inTime && <Tag>시간 초과</Tag>}
    </div>
  );
}

function RatingButtons({ result, onRated }: { result: Result; onRated: (r: Rating, inTime: boolean) => void }) {
  const { grade, inTime } = result;
  if (grade === 'correct') {
    return (
      <button className="btn primary lg" autoFocus onClick={() => onRated(inTime ? 'good' : 'ok', inTime)}>
        다음 <Next />
      </button>
    );
  }
  if (grade === 'wrong') {
    return (
      <button className="btn primary lg" autoFocus onClick={() => onRated('bad', false)}>
        다음 (다시 나와요) <Next />
      </button>
    );
  }
  // silent recall or a near miss: the learner decides.
  return (
    <div className="stack">
      <p className="muted small">{grade === 'near' ? '사소한 차이라면 맞은 걸로 해도 돼요.' : '어땠나요?'}</p>
      <div className="rate-row">
        <button className="btn good" onClick={() => onRated('good', inTime)}>
          바로 말함
        </button>
        <button className="btn" onClick={() => onRated('ok', false)}>
          떠올리긴 함
        </button>
        <button className="btn bad" onClick={() => onRated('bad', false)}>
          못 함
        </button>
      </div>
    </div>
  );
}

/** Cards to drill today: due reviews from earlier days + today's new cards. */
export function useTodayCards(allCards: Card[], day: number): Card[] {
  const { state } = useStore();
  return useMemo(() => {
    const t = today();
    const reviews = allCards.filter((c) => c.day < day && (!state.cards[c.id] || state.cards[c.id].due <= t)).slice(0, 20);
    const fresh = allCards.filter((c) => c.day === day);
    return [...reviews, ...fresh];
    // Only computed when the session step opens; ratings shouldn't reshuffle the queue.
  }, [allCards, day]);
}
