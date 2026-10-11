import { useState } from 'react';
import type { Pattern } from '../content';
import { Ja, SpeakButton, Tag, useSpeak } from '../components/ui';
import { useSettings } from '../lib/store';

export function PatternList({ patterns, onDone }: { patterns: Pattern[]; onDone?: () => void }) {
  return (
    <div className="stack">
      {patterns.map((p) => <PatternCard key={p.id} pattern={p} />)}
      {onDone && <button className="btn primary lg" onClick={onDone}>다음으로 ▶</button>}
    </div>
  );
}

function PatternCard({ pattern: p }: { pattern: Pattern }) {
  const [settings] = useSettings();
  const say = useSpeak();
  const [word, setWord] = useState(0);
  const sentence = p.swap.template.replace('＿', p.swap.words[word].ja);

  return (
    <div className="panel stack">
      <div className="row between wrap">
        <h2>{p.title}</h2>
        <Tag tone="accent"><span lang="ja">{p.form}</span></Tag>
      </div>
      <p><b>{p.meaning}</b> — {p.usage}</p>

      <div className="pair">
        <div>
          <Tag>정중체</Tag>
          <p className="answer"><Ja text={p.polite.ja} /></p>
          <p className="muted small">{p.polite.ko}</p>
          <SpeakButton text={p.polite.ja} small />
        </div>
        <div>
          <Tag>반말</Tag>
          <p className="answer"><Ja text={p.casual.ja} /></p>
          <p className="muted small">{p.casual.ko}</p>
          <SpeakButton text={p.casual.ja} small />
        </div>
      </div>

      <div className="swap stack">
        <h3>단어 바꿔 끼우기</h3>
        <p className="answer swap-result" aria-live="polite"><Ja text={sentence} /></p>
        <div className="row wrap">
          {p.swap.words.map((w, i) => (
            <button key={w.ja} className={`chip ${i === word ? 'on' : ''}`} onClick={() => {
              setWord(i);
              if (settings.sound) say(p.swap.template.replace('＿', w.ja));
            }}>
              <Ja text={w.ja} /> <span className="muted small">{w.ko}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3>예문</h3>
        <ul className="examples">
          {p.examples.map((e) => (
            <li key={e.ja}>
              <div><Ja text={e.ja} /><br /><span className="muted small">{e.ko}</span></div>
              <SpeakButton text={e.ja} small label="" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
