import { useEffect, useRef, useState, type ReactNode } from 'react';
import { segments } from '../lib/furigana';
import { speak, stopSpeaking } from '../lib/tts';
import { useSettings } from '../lib/store';
import { plain } from '../lib/furigana';

/** Japanese text with furigana (ruby) when enabled in settings. */
export function Ja({ text, className }: { text: string; className?: string }) {
  const [s] = useSettings();
  return (
    <span className={`ja ${className ?? ''}`} lang="ja">
      {segments(text).map((seg, i) =>
        seg.ruby && s.furigana ? (
          <ruby key={i}>
            {seg.text}
            <rt>{seg.ruby}</rt>
          </ruby>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  );
}

export function useSpeak() {
  const [s] = useSettings();
  return (markup: string, pitch?: number) => speak(plain(markup), { rate: s.rate, voice: s.voice, pitch });
}

/** Play button for one Japanese text. */
export function SpeakButton({ text, label = '듣기', small }: { text: string; label?: string; small?: boolean }) {
  const say = useSpeak();
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  const onClick = async () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    await say(text);
    setPlaying(false);
  };
  return (
    <button type="button" className={`btn ghost ${small ? 'sm' : ''}`} onClick={onClick} aria-label={label}>
      {playing ? '■ 정지' : `🔊 ${label}`}
    </button>
  );
}

/** Seconds left of a countdown; calls onEnd once at zero. `running=false` pauses. */
export function useCountdown(seconds: number, running: boolean, onEnd: () => void) {
  const [left, setLeft] = useState(seconds);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  useEffect(() => setLeft(seconds), [seconds]);
  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const from = left;
    const id = window.setInterval(() => {
      const next = Math.max(0, from - (Date.now() - started) / 1000);
      setLeft(next);
      if (next <= 0) {
        window.clearInterval(id);
        endRef.current();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [running]);
  return left;
}

export function TimeBar({ left, total, warnAt }: { left: number; total: number; warnAt?: number }) {
  const pct = Math.max(0, (left / total) * 100);
  const warn = warnAt !== undefined && total - left >= warnAt;
  return (
    <div className="timebar" role="timer" aria-label={`남은 시간 ${Math.ceil(left)}초`}>
      <div className={`timebar-fill ${warn ? 'warn' : ''}`} style={{ width: `${pct}%` }} />
      <span className="timebar-text">{Math.ceil(left)}초</span>
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <strong>{title}</strong>
          <button type="button" className="btn ghost sm" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Tag({ children, tone }: { children: ReactNode; tone?: 'accent' | 'good' | 'warn' | 'bad' }) {
  return <span className={`tag ${tone ?? ''}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
