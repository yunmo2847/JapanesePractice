import { useEffect, useState } from 'react';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

/** Japanese voices. Android Chrome fills the list late, so listen for voiceschanged. */
export function useJapaneseVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!synth) return;
    const read = () => setVoices(synth.getVoices().filter((v) => v.lang.replace('_', '-').startsWith('ja')));
    read();
    synth.addEventListener('voiceschanged', read);
    return () => synth.removeEventListener('voiceschanged', read);
  }, []);
  return voices;
}

export type SpeakOptions = { rate: number; voice: string; pitch?: number };

function pickVoice(uri: string): SpeechSynthesisVoice | undefined {
  const ja = synth?.getVoices().filter((v) => v.lang.replace('_', '-').startsWith('ja')) ?? [];
  return ja.find((v) => v.voiceURI === uri) ?? ja[0];
}

/**
 * Speaks text sentence by sentence (Android Chrome cuts long utterances off).
 * Resolves when finished or cancelled.
 */
let generation = 0;

export function speak(text: string, opts: SpeakOptions): Promise<void> {
  if (!synth) return Promise.resolve();
  synth.cancel();
  const gen = ++generation;
  const parts = text.split(/(?<=[。！？!?])/).map((p) => p.trim()).filter(Boolean);
  const voice = pickVoice(opts.voice);
  return new Promise((resolve) => {
    let i = 0;
    let guard = 0;
    const next = () => {
      clearTimeout(guard);
      if (i >= parts.length || gen !== generation) return resolve();
      const part = parts[i++];
      const u = new SpeechSynthesisUtterance(part);
      u.lang = 'ja-JP';
      if (voice) u.voice = voice;
      u.rate = opts.rate;
      u.pitch = opts.pitch ?? 1;
      const mine = i;
      const advance = () => i === mine && next(); // ignore a late onend after the guard fired
      u.onend = advance;
      u.onerror = () => {
        clearTimeout(guard);
        resolve();
      };
      // Some engines never fire onend (no voice installed, background tab): move on anyway.
      guard = window.setTimeout(advance, 2000 + (part.length * 400) / opts.rate);
      synth.speak(u);
    };
    next();
  });
}

export function stopSpeaking() {
  generation++;
  synth?.cancel();
}

export const ttsSupported = Boolean(synth);
