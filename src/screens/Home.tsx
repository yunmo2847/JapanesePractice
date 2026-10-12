import { byDay, CONTENT_DAYS, DAY_THEME, topics } from '../content';
import { dayFor, TOTAL_DAYS, weekOf } from '../lib/days';
import { today, useSettings, useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { Ja } from '../components/ui';
import { ArrowRight, Headphones, VolumeX } from 'lucide-react';
import { estimateMinutes, stepsFor, STEP_LABEL } from './Session';

export function useCurrentDay(): number {
  const { state } = useStore();
  return state.dayOverride ?? dayFor(state.settings.startDate, today());
}

export function Home() {
  const { state, update } = useStore();
  const [settings, setSettings] = useSettings();
  const day = useCurrentDay();
  const steps = stepsFor(day, settings.minutes);
  const done = state.days[day]?.steps ?? [];
  const started = done.length > 0;
  const finished = Boolean(state.days[day]?.done);
  const next = steps.find((s) => !done.includes(s));
  const topic = byDay(topics, day)[0];
  const hasContent = day <= CONTENT_DAYS;

  return (
    <div className="stack home">
      <section className="hero" aria-label="오늘의 학습">
        <div className="row between wrap">
          <span className="hero-meta">Week {weekOf(day)} · {DAY_THEME[day] ?? '콘텐츠 준비 중'}</span>
          <button className="btn sm hero-toggle" onClick={() => setSettings({ sound: !settings.sound })} aria-pressed={!settings.sound}>
            {settings.sound ? <Headphones size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />}
            {settings.sound ? '이어폰 모드' : '소리 끄기 모드'}
          </button>
        </div>
        <h1 className="hero-day">Day {day}<span> / {TOTAL_DAYS}</span></h1>
        {topic ? (
          <div className="stack hero-topic">
            <p className="hero-meta">오늘의 질문{day % 7 === 0 ? ' · 테스트 3개' : ''}</p>
            <p className="prompt-ja"><Ja text={topic.question.ja} /></p>
            <p className="prompt-ko">{topic.question.ko}</p>
          </div>
        ) : (
          <p>Day {day} 콘텐츠는 아직 준비 중이에요. 연습 화면에서 지난 내용을 복습하세요.</p>
        )}
        <div className="hero-foot">
          <p className="hero-meta">
            {estimateMinutes(day, settings.minutes)}분 · {steps.map((s) => STEP_LABEL[s]).join(' · ')}
          </p>
          {hasContent ? (
            <button className="btn lime lg" onClick={() => navigate(`/session/${day}`)}>
              {finished ? '오늘 학습 다시 보기' : started ? `이어하기 · ${next ? STEP_LABEL[next] : ''}` : '오늘 학습 시작'}
              <ArrowRight size={18} aria-hidden />
            </button>
          ) : (
            <button className="btn lime lg" onClick={() => navigate('/practice')}>복습하러 가기 <ArrowRight size={18} aria-hidden /></button>
          )}
        </div>
      </section>

      <div className="panel stack">
        <div className="row between wrap">
          <h3>21일 진도</h3>
          <label className="small">
            다른 날 하기{' '}
            <select value={state.dayOverride ?? ''} onChange={(e) => update((s) => ({ ...s, dayOverride: e.target.value ? Number(e.target.value) : null }))}>
              <option value="">오늘 (자동)</option>
              {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>Day {d}{d > CONTENT_DAYS ? ' (준비 중)' : ''}</option>
              ))}
            </select>
          </label>
        </div>
        <ol className="days-bar" aria-label="21일 진도">
          {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((d) => (
            <li key={d} className={`${state.days[d]?.done ? 'done' : ''} ${d === day ? 'today' : ''} ${d > CONTENT_DAYS ? 'locked' : ''}`}>
              <button onClick={() => d <= CONTENT_DAYS && navigate(`/session/${d}`)} aria-label={`Day ${d}`} disabled={d > CONTENT_DAYS}>
                {d}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
