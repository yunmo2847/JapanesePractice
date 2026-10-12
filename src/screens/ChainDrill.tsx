import { useState } from 'react';
import type { Chain } from '../content';
import { Ja, SpeakButton, Tag, TimeBar, useCountdown, Next } from '../components/ui';
import { KanaInput } from '../components/KanaInput';

const STEP_SECONDS = 30;

export function ChainDrill({ chains, onDone }: { chains: Chain[]; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const chain = chains[index];
  if (!chain) {
    return (
      <div className="panel center stack">
        <h2>이어 쓰기 완료</h2>
        <button className="btn primary lg" onClick={onDone}>다음으로</button>
      </div>
    );
  }
  return (
    <div className="stack">
      <span className="muted">세트 {index + 1} / {chains.length}</span>
      <ChainSet key={chain.id} chain={chain} onNext={() => setIndex((i) => i + 1)} />
    </div>
  );
}

function ChainSet({ chain, onNext }: { chain: Chain; onNext: () => void }) {
  const [step, setStep] = useState(0);
  const [mine, setMine] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const done = step >= chain.links.length;
  const link = chain.links[step];
  const left = useCountdown(STEP_SECONDS, !revealed && !done, () => setRevealed(true));

  const fullModel = [...(chain.kind === 'chain' ? [chain.start.ja] : []), ...chain.links.map((l) => l.example.ja)].join('');

  return (
    <div className="panel stack">
      <div className="row between">
        <span className="eyebrow">{chain.kind === 'formula' ? '답변 확장 공식' : '이어 쓰기'}</span>
        <SpeakButton text={chain.start.ja} small />
      </div>
      <p className="prompt-ja"><Ja text={chain.start.ja} /></p>
      <p className="muted">{chain.start.ko}</p>

      {chain.kind === 'formula' && (
        <ol className="formula" aria-label="답변 확장 순서">
          {chain.links.map((l, i) => (
            <li key={i} className={i === step ? 'now' : i < step ? 'past' : ''}>{l.label}</li>
          ))}
        </ol>
      )}

      <ul className="chain-lines">
        {chain.links.slice(0, step).map((l, i) => (
          <li key={i}>
            <span lang="ja">{mine[i] || '—'}</span>
            <span className="muted small"> · 예시: <Ja text={l.example.ja} /></span>
          </li>
        ))}
      </ul>

      {!done && (
        <div className="stack step-box">
          <div className="row wrap">
            <Tag>{step + 1}단계 · {link.label}</Tag>
            {link.connector && <Tag tone="accent"><span lang="ja">{link.connector}</span></Tag>}
            <span>{link.hint}</span>
          </div>
          {!revealed ? (
            <>
              <TimeBar left={left} total={STEP_SECONDS} />
              <KanaInput key={step} autoFocus submitLabel="이어 쓰기" onSubmit={(t) => {
                setMine((m) => { const n = [...m]; n[step] = t; return n; });
                setRevealed(true);
              }} />
              <button className="btn ghost sm" onClick={() => setRevealed(true)}>모르겠어요 → 예시 보기</button>
            </>
          ) : (
            <div className="stack">
              {mine[step] && <p lang="ja">내 문장: {mine[step]}</p>}
              <p className="answer"><Ja text={link.example.ja} /></p>
              <p className="muted small">{link.example.ko}</p>
              <div className="row wrap">
                <SpeakButton text={link.example.ja} small />
                <button className="btn primary" autoFocus onClick={() => { setRevealed(false); setStep((s) => s + 1); }}>
                  {step + 1 < chain.links.length ? '다음 단계' : '완성본 보기'} <Next />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="stack">
          <h3>완성본</h3>
          <p className="model"><Ja text={fullModel} /></p>
          <div className="row wrap">
            <SpeakButton text={fullModel} label="완성본 듣기" />
            {mine.some(Boolean) && <SpeakButton text={mine.filter(Boolean).join('。')} label="내 문장 듣기" />}
            <button className="btn primary lg" onClick={onNext}>다음 세트 <Next /></button>
          </div>
        </div>
      )}
    </div>
  );
}
