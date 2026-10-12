import { useEffect, useState } from 'react';

const SEEN = 'nihongo21-splash';
const HOLD_MS = 1500; // intro plays, then the curtain lifts
const LIFT_MS = 550;

function shouldShow(): boolean {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return !sessionStorage.getItem(SEEN);
  } catch {
    return false;
  }
}

/** Intro on the first visit of a browser session. Tap to skip. */
export function Splash() {
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>(() => (shouldShow() ? 'in' : 'gone'));

  useEffect(() => {
    if (phase === 'gone') return;
    try {
      sessionStorage.setItem(SEEN, '1');
    } catch {
      // Private mode: the intro may play again next time, which is fine.
    }
    const id = window.setTimeout(() => setPhase(phase === 'in' ? 'out' : 'gone'), phase === 'in' ? HOLD_MS : LIFT_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  if (phase === 'gone') return null;
  return (
    <div className={`splash ${phase}`} onClick={() => setPhase('out')} role="presentation">
      <div className="splash-inner">
        <span className="splash-mark" aria-hidden>日</span>
        <p className="splash-word">니혼고 21</p>
        <span className="splash-line" aria-hidden />
        <p className="splash-caption">21일 일본어 프리토킹</p>
      </div>
    </div>
  );
}
