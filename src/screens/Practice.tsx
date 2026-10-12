import { useMemo } from 'react';
import { BookOpen, Ear, Layers, Link2, MessageCircle, RotateCcw, Shuffle, type LucideIcon } from 'lucide-react';
import { byDay, cards, chains, CONTENT_DAYS, dialogues, patterns, topics } from '../content';
import { today, useStore } from '../lib/store';
import { navigate } from '../lib/router';
import { Empty, Ja } from '../components/ui';
import { CardDrill } from './CardDrill';
import { PatternList } from './PatternView';
import { DialogueView } from './DialogueView';
import { ChainDrill } from './ChainDrill';
import { FreeTalk } from './FreeTalk';
import { useCurrentDay } from './Home';

const back = (day: number) => () => navigate(`/practice/${day}`);

/** Free practice by day: #/practice/:day[/:mode[/:id]] */
export function Practice({ route }: { route: string[] }) {
  const current = Math.min(useCurrentDay(), CONTENT_DAYS);
  const day = Number(route[1]) || current;
  const mode = route[2];
  const { state } = useStore();
  const allCards = useMemo(() => [...cards, ...state.custom], [state.custom]);

  if (mode === 'cards') return <CardDrill cards={allCards.filter((c) => c.day === day)} onDone={back(day)} />;
  if (mode === 'review') {
    const due = allCards.filter((c) => state.cards[c.id] && state.cards[c.id].due <= today());
    return due.length ? <CardDrill cards={due} onDone={back(day)} /> : <Empty>지금 복습할 카드가 없어요.</Empty>;
  }
  if (mode === 'pattern') return <PatternList patterns={byDay(patterns, day)} onDone={back(day)} />;
  if (mode === 'listen') {
    const d = byDay(dialogues, day)[0];
    return d ? <DialogueView dialogue={d} day={day} onDone={back(day)} /> : <Empty>이 날은 대화문이 없어요.</Empty>;
  }
  if (mode === 'chain') return <ChainDrill chains={byDay(chains, day)} onDone={back(day)} />;
  if (mode === 'talk') {
    const t = topics.find((x) => x.id === route[3]);
    return t ? <FreeTalk key={t.id} topic={t} day={day} onDone={back(day)} /> : <Empty>주제를 찾을 수 없어요.</Empty>;
  }

  const random = () => {
    const pool = topics.filter((t) => t.day <= current);
    const t = pool[Math.floor(Math.random() * pool.length)];
    navigate(`/practice/${t.day}/talk/${t.id}`);
  };
  const dayTopics = byDay(topics, day);
  const custom = state.custom.filter((c) => c.day === day).length;

  return (
    <div className="stack">
      <h1>연습</h1>
      <div className="row wrap">
        <button className="btn primary lg" onClick={random}><Shuffle size={18} aria-hidden /> 랜덤 주제로 프리토킹</button>
        <button className="btn lg" onClick={() => navigate(`/practice/${day}/review`)}><RotateCcw size={18} aria-hidden /> 복습 카드 전체</button>
        <button className="btn lg" onClick={() => navigate('/katakana')}>カ 가타카나</button>
      </div>
      <div className="day-chips" role="tablist" aria-label="날짜 선택">
        {Array.from({ length: CONTENT_DAYS }, (_, i) => i + 1).map((d) => (
          <button key={d} role="tab" aria-selected={d === day} className={`chip ${d === day ? 'on' : ''}`} onClick={() => navigate(`/practice/${d}`)}>
            Day {d}
          </button>
        ))}
      </div>
      <div className="grid-tiles">
        <Tile icon={MessageCircle} title="프리토킹" sub={`${dayTopics.length}개 주제`} onClick={() => navigate(`/practice/${day}/talk/${dayTopics[0]?.id}`)} disabled={!dayTopics.length} />
        <Tile icon={Layers} title="인출 카드" sub={`${byDay(cards, day).length + custom}장`} onClick={() => navigate(`/practice/${day}/cards`)} disabled={!byDay(cards, day).length && !custom} />
        <Tile icon={BookOpen} title="문장 재료 (패턴)" sub={`${byDay(patterns, day).length}개`} onClick={() => navigate(`/practice/${day}/pattern`)} disabled={!byDay(patterns, day).length} />
        <Tile icon={Ear} title="듣기 → 반응" sub={byDay(dialogues, day)[0]?.title ?? '없음'} onClick={() => navigate(`/practice/${day}/listen`)} disabled={!byDay(dialogues, day).length} />
        <Tile icon={Link2} title="이어 쓰기" sub={`${byDay(chains, day).length}세트`} onClick={() => navigate(`/practice/${day}/chain`)} disabled={!byDay(chains, day).length} />
      </div>
      {dayTopics.length > 1 && (
        <div className="panel stack">
          <h3>이 날의 주제</h3>
          {dayTopics.map((t) => (
            <button key={t.id} className="list-btn" onClick={() => navigate(`/practice/${day}/talk/${t.id}`)}>
              <Ja text={t.question.ja} /> <span className="muted small">{t.question.ko}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Tile({ icon: Icon, title, sub, onClick, disabled }: {
  icon: LucideIcon; title: string; sub: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button className="tile" onClick={onClick} disabled={disabled}>
      <span className="tile-icon"><Icon size={20} strokeWidth={1.75} aria-hidden /></span>
      <span className="stack" style={{ gap: 2 }}>
        <strong>{title}</strong>
        <span className="muted small">{sub}</span>
      </span>
    </button>
  );
}
