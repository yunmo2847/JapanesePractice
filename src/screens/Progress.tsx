import { useState } from 'react';
import { cards, topics } from '../content';
import { TOTAL_DAYS } from '../lib/days';
import { exportCode, importCode, useStore, type FreeTalk } from '../lib/store';
import { Empty, Ja, Tag } from '../components/ui';

function avg(list: number[]) {
  return list.length ? Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10 : null;
}

export function Progress() {
  const { state } = useStore();
  const talks = state.freetalks;
  const daysDone = Object.values(state.days).filter((d) => d.done).length;
  const inTime = Object.values(state.cards).filter((c) => c.inTime).length;
  const best = talks.filter((t) => t.seconds === 120).reduce((m, t) => Math.max(m, t.report.sentences), 0);
  const reaction = avg(talks.map((t) => t.report.firstReactionSec).filter((x): x is number => x !== null));
  const conn = avg(talks.map((t) => t.report.connectors.length));
  const askRate = talks.length ? Math.round((talks.filter((t) => t.report.askedBack).length / talks.length) * 100) : null;

  // Best free-talk sentence count per day, for the trend bars.
  const perDay = Array.from({ length: TOTAL_DAYS }, (_, i) =>
    talks.filter((t) => t.day === i + 1).reduce((m, t) => Math.max(m, t.report.sentences), 0),
  );
  const maxBar = Math.max(6, ...perDay);

  return (
    <div className="stack">
      <h1>진도 · 리포트</h1>
      <div className="stats metrics">
        <Metric label="2분 프리토킹 최고 문장 수" value={`${best}`} goal="6문장" ok={best >= 6} />
        <Metric label="첫 반응 평균" value={reaction === null ? '—' : `${reaction}초`} goal="10초 이내" ok={reaction !== null && reaction <= 10} />
        <Metric label="시간 안에 맞힌 카드" value={`${inTime}`} goal={`150장 (현재 콘텐츠 ${cards.length}장)`} ok={inTime >= 150} />
        <Metric label="프리토킹당 접속 표현" value={conn === null ? '—' : `${conn}`} goal="4개" ok={conn !== null && conn >= 4} />
        <Metric label="되묻기 사용률" value={askRate === null ? '—' : `${askRate}%`} goal="80%" ok={askRate !== null && askRate >= 80} />
        <Metric label="완료한 날" value={`${daysDone} / ${TOTAL_DAYS}`} goal="18일" ok={daysDone >= 18} />
      </div>

      <div className="panel stack">
        <h3>일별 프리토킹 최고 문장 수</h3>
        <div className="bars" role="img" aria-label="일별 프리토킹 문장 수 그래프">
          {perDay.map((n, i) => (
            <div key={i} className="bar-col" title={`Day ${i + 1}: ${n}문장`}>
              <div className="bar" style={{ height: `${(n / maxBar) * 100}%` }} />
              <span className="bar-label">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <Growth talks={talks} />

      <div className="panel stack">
        <h3>말하고 싶었는데 못 한 말</h3>
        {state.memos.length === 0 ? <p className="muted">아직 없어요. 프리토킹 리포트에서 적을 수 있어요.</p> : (
          <ul className="plain-list">{state.memos.map((m, i) => <li key={i}>{m.text} <span className="muted small">· {m.at}</span></li>)}</ul>
        )}
      </div>

      {state.flags.length > 0 && (
        <div className="panel stack">
          <h3>🚩 이상하다고 표시한 카드</h3>
          <ul className="plain-list">{state.flags.map((f, i) => <li key={i}>{f.id} {f.note && <span lang="ja">· 내 답: {f.note}</span>} <span className="muted small">{f.at}</span></li>)}</ul>
        </div>
      )}

      <Backup />
    </div>
  );
}

function Metric({ label, value, goal, ok }: { label: string; value: string; goal: string; ok: boolean }) {
  return (
    <div className={`stat ${ok ? 'good' : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      <span className="muted small">목표 {goal}</span>
    </div>
  );
}

/** Same topic answered on different days / rounds, side by side (Day 7 · 14 · 21 tests). */
function Growth({ talks }: { talks: FreeTalk[] }) {
  const byTopic = topics
    .map((t) => ({ t, list: talks.filter((x) => x.topicId === t.id) }))
    .filter((x) => x.list.length > 0);
  if (!byTopic.length) return <Empty>프리토킹을 하면 여기에 주제별 기록이 쌓여요.</Empty>;
  return (
    <div className="panel stack">
      <h3>성장 비교 (주제별 기록)</h3>
      {byTopic.map(({ t, list }) => (
        <details key={t.id}>
          <summary><Ja text={t.question.ja} /> <span className="muted small">{list.length}회</span></summary>
          <div className="growth">
            {list.map((x, i) => (
              <div key={i} className="growth-item">
                <div className="row wrap">
                  <Tag>Day {x.day}</Tag>
                  <Tag>{x.round}회차</Tag>
                  <span className="small">{x.report.sentences}문장 · 반응 {x.report.firstReactionSec ?? '—'}초</span>
                </div>
                <ol className="my-lines small" lang="ja">{x.messages.map((m, j) => <li key={j}>{m}</li>)}</ol>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function Backup() {
  const { state, update } = useStore();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  const download = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `nihongo21-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const copy = async () => {
    const c = exportCode(state);
    setCode(c);
    try {
      await navigator.clipboard.writeText(c);
      setMsg('코드를 복사했어요. 다른 기기의 "가져오기"에 붙여넣으세요.');
    } catch {
      setMsg('아래 코드를 길게 눌러 복사하세요.');
    }
  };
  const restore = (text: string) => {
    try {
      const next = importCode(text);
      if (!window.confirm('지금 기기의 진도를 가져온 진도로 덮어쓸까요?')) return;
      update(() => next);
      setMsg('가져오기 완료!');
    } catch {
      setMsg('코드나 파일을 읽을 수 없어요. 다시 확인해 주세요.');
    }
  };

  return (
    <div className="panel stack">
      <h3>진도 내보내기 / 가져오기</h3>
      <p className="muted small">로그인이 없어서 진도는 이 기기에만 저장돼요. 다른 기기로 옮길 때 사용하세요. (녹음은 없으므로 텍스트 진도만 옮겨져요)</p>
      <div className="row wrap">
        <button className="btn" onClick={download}>📄 파일로 내보내기</button>
        <button className="btn" onClick={copy}>📋 코드 복사</button>
        <label className="btn">
          📂 파일 가져오기
          <input type="file" accept="application/json,.json" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) restore(await f.text());
            e.target.value = '';
          }} />
        </label>
      </div>
      <textarea className="text" rows={3} value={code} onChange={(e) => setCode(e.target.value)} placeholder="여기에 코드를 붙여넣고 가져오기" />
      <div className="row"><button className="btn primary" onClick={() => restore(code)} disabled={!code.trim()}>코드로 가져오기</button></div>
      {msg && <p className="small" role="status">{msg}</p>}
    </div>
  );
}
