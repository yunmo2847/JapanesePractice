import { useMemo } from 'react';
import { Check } from 'lucide-react';
import { byDay, cards, chains, CONTENT_DAYS, DAY_THEME, dialogues, patterns, topics } from '../content';
import { isTestDay } from '../lib/days';
import { today, useSettings, useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { Empty, Tag, Next } from '../components/ui';
import { CardDrill, useTodayCards } from './CardDrill';
import { PatternList } from './PatternView';
import { DialogueView } from './DialogueView';
import { ChainDrill } from './ChainDrill';
import { FreeTalk } from './FreeTalk';
import { Shadow } from './Shadow';

export type StepKey = 'cards' | 'pattern' | 'listen' | 'chain' | 'talk' | 'test1' | 'test2' | 'test3' | 'shadow';

export const STEP_LABEL: Record<StepKey, string> = {
  cards: '인출 카드',
  pattern: '문장 재료',
  listen: '듣기 → 반응',
  chain: '이어 쓰기',
  talk: '프리토킹',
  test1: '테스트 1',
  test2: '테스트 2',
  test3: '테스트 3',
  shadow: '무성 쉐도잉',
};

/** Steps of a day's session (plan 3.3). */
export function stepsFor(day: number, minutes: 30 | 60): StepKey[] {
  if (isTestDay(day)) return ['cards', 'test1', 'test2', 'test3'];
  return minutes === 30 ? ['cards', 'pattern', 'talk'] : ['cards', 'pattern', 'listen', 'chain', 'talk', 'shadow'];
}

export function estimateMinutes(day: number, minutes: 30 | 60) {
  return isTestDay(day) ? 30 : minutes;
}

export function Session({ day }: { day: number }) {
  const { state, update } = useStore();
  const [settings] = useSettings();
  const steps = stepsFor(day, settings.minutes);
  const done = state.days[day]?.steps ?? [];
  const current = steps.find((s) => !done.includes(s));
  const allCards = useMemo(() => [...cards, ...state.custom], [state.custom]);
  const todayCards = useTodayCards(allCards, day);

  if (day > CONTENT_DAYS) {
    return (
      <Empty>
        Day {day} 콘텐츠는 준비 중이에요. (지금은 Week 1까지)
        <br />
        <button className="btn primary" onClick={() => navigate('/practice')}>연습 화면에서 복습하기</button>
      </Empty>
    );
  }

  const markDone = (step: StepKey) =>
    update((s) => {
      const prev = s.days[day]?.steps ?? [];
      const nextSteps = prev.includes(step) ? prev : [...prev, step];
      const finished = steps.every((x) => nextSteps.includes(x));
      return { ...s, days: { ...s.days, [day]: { steps: nextSteps, done: finished ? s.days[day]?.done ?? today() : undefined } } };
    });

  const testTopics = byDay(topics, day);
  const topic = testTopics[0];
  const lastTalk = [...state.freetalks].reverse().find((f) => f.day === day);

  const body = (() => {
    switch (current) {
      case 'cards':
        return todayCards.length ? <CardDrill cards={todayCards} onDone={() => markDone('cards')} /> : <Skip onSkip={() => markDone('cards')} text="오늘 복습할 카드가 없어요." />;
      case 'pattern':
        return <PatternList patterns={byDay(patterns, day)} onDone={() => markDone('pattern')} />;
      case 'listen': {
        const d = byDay(dialogues, day)[0];
        if (!settings.sound) return <Skip onSkip={() => markDone('listen')} text="소리 끄기 모드예요. 듣기는 이어폰을 쓸 수 있을 때 연습 화면에서 해요." />;
        return d ? <DialogueView dialogue={d} day={day} onDone={() => markDone('listen')} /> : <Skip onSkip={() => markDone('listen')} text="오늘 대화문이 없어요." />;
      }
      case 'chain':
        return <ChainDrill chains={byDay(chains, day)} onDone={() => markDone('chain')} />;
      case 'talk':
        return <FreeTalk key={topic.id} topic={topic} day={day} onDone={() => markDone('talk')} />;
      case 'test1':
      case 'test2':
      case 'test3': {
        const t = testTopics[Number(current.slice(4)) - 1];
        return <FreeTalk key={t.id} topic={t} day={day} onDone={() => markDone(current)} />;
      }
      case 'shadow': {
        const lines = [...(lastTalk?.messages ?? []), topic.answers.polite.ja];
        return <Shadow lines={lines} onDone={() => markDone('shadow')} />;
      }
      default:
        return <Finished day={day} />;
    }
  })();

  return (
    <div className="stack">
      <header className="session-head">
        <div className="row between wrap">
          <h1>Day {day} <span className="muted small">{DAY_THEME[day]}</span></h1>
          <button className="btn ghost sm" onClick={() => navigate('/')}>나가기 (자동 저장)</button>
        </div>
        <ol className="steps" aria-label="오늘의 단계">
          {steps.map((s) => (
            <li key={s} className={done.includes(s) ? 'done' : s === current ? 'now' : ''}>
              {done.includes(s) && <Check size={14} strokeWidth={2.5} aria-hidden />}{STEP_LABEL[s]}
            </li>
          ))}
        </ol>
      </header>
      {body}
    </div>
  );
}

function Skip({ text, onSkip }: { text: string; onSkip: () => void }) {
  return (
    <Empty>
      {text}
      <br />
      <button className="btn primary" onClick={onSkip}>다음 단계로 <Next /></button>
    </Empty>
  );
}

function Finished({ day }: { day: number }) {
  const { state } = useStore();
  const talks = state.freetalks.filter((f) => f.day === day);
  const best = talks.reduce((m, f) => Math.max(m, f.report.sentences), 0);
  const asked = talks.some((f) => f.report.askedBack);
  return (
    <div className="panel center stack">
      <h2>Day {day} 완료</h2>
      <p>오늘 프리토킹 최고 <b>{best}문장</b> · 되묻기 {asked ? <Tag tone="good">성공</Tag> : <Tag tone="bad">다음엔 꼭</Tag>}</p>
      <div className="row wrap center">
        <button className="btn" onClick={() => navigate('/progress')}>진도 보기</button>
        <button className="btn primary lg" onClick={() => navigate('/')}>홈으로</button>
      </div>
    </div>
  );
}
