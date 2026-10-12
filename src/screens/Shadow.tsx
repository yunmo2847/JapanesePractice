import { useEffect, useRef, useState } from 'react';
import { Play, Square } from 'lucide-react';
import { plain } from '../lib/furigana';
import { speak, stopSpeaking } from '../lib/tts';
import { useSettings } from '../lib/store';
import { Ja, Next } from '../components/ui';

/** Silent shadowing: listen and only move your lips along (plan 3.3 step 6). */
export function Shadow({ lines, onDone }: { lines: string[]; onDone: () => void }) {
  const [s] = useSettings();
  const [repeat, setRepeat] = useState(3);
  const [gap, setGap] = useState(2);
  const [now, setNow] = useState<number | null>(null);
  const stop = useRef(false);
  useEffect(() => () => stopSpeaking(), []);

  const play = async () => {
    if (now !== null) {
      stop.current = true;
      stopSpeaking();
      setNow(null);
      return;
    }
    stop.current = false;
    for (let i = 0; i < lines.length && !stop.current; i++) {
      for (let r = 0; r < repeat && !stop.current; r++) {
        setNow(i);
        await speak(plain(lines[i]), { rate: s.rate, voice: s.voice });
        await new Promise((res) => setTimeout(res, gap * 1000));
      }
    }
    setNow(null);
  };

  return (
    <div className="panel stack">
      <h2>무성 쉐도잉 <span className="muted small">(선택)</span></h2>
      <p className="muted">이어폰으로 들으면서 소리 내지 말고 <b>입모양만</b> 따라 하세요. 발음 감각을 잃지 않게 도와줘요.</p>
      <div className="row wrap">
        <span>반복</span>
        <div className="seg">{[1, 3, 5].map((n) => <button key={n} className={repeat === n ? 'on' : ''} onClick={() => setRepeat(n)}>{n}회</button>)}</div>
        <span>간격</span>
        <div className="seg">{[1, 2, 3].map((n) => <button key={n} className={gap === n ? 'on' : ''} onClick={() => setGap(n)}>{n}초</button>)}</div>
      </div>
      <ol className="shadow-lines">
        {lines.map((l, i) => <li key={i} className={now === i ? 'active' : ''}><Ja text={l} /></li>)}
      </ol>
      <div className="row wrap end">
        <button className="btn" onClick={play}>{now !== null ? <><Square size={16} aria-hidden /> 정지</> : <><Play size={16} aria-hidden /> 시작</>}</button>
        <button className="btn primary lg" onClick={() => { stopSpeaking(); onDone(); }}>다음으로 <Next /></button>
      </div>
    </div>
  );
}
