import { useEffect, useState } from 'react';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

const isJa = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase().startsWith('ja');

/** Japanese voices. Android Chrome fills the list late, so listen for voiceschanged. */
export function useJapaneseVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!synth) return;
    const read = () => setVoices(synth.getVoices().filter(isJa));
    read();
    synth.addEventListener('voiceschanged', read);
    return () => synth.removeEventListener('voiceschanged', read);
  }, []);
  return voices;
}

export type SpeakOptions = { rate: number; voice: string; pitch?: number };

/** Waits (briefly) for the voice list, then returns a Japanese voice or undefined. */
async function japaneseVoice(uri: string): Promise<SpeechSynthesisVoice | undefined> {
  if (!synth) return undefined;
  if (synth.getVoices().length === 0) {
    await new Promise<void>((resolve) => {
      const done = () => {
        synth.removeEventListener('voiceschanged', done);
        resolve();
      };
      synth.addEventListener('voiceschanged', done);
      setTimeout(done, 2000);
    });
  }
  const ja = synth.getVoices().filter(isJa);
  return ja.find((v) => v.voiceURI === uri) ?? ja[0];
}

/** Text to speak: Japanese only. Hangul (e.g. Korean typed into a chat line) is dropped. */
export function speakable(text: string): string {
  return text.replace(/[ᄀ-ᇿ㄰-㆏가-힯]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Fired when speech was skipped because the device has no Japanese voice. */
export const NO_JA_VOICE = 'tts-no-japanese-voice';

let generation = 0;

/**
 * Speaks Japanese text sentence by sentence (Android Chrome cuts long utterances off).
 * Never falls back to the device's default (e.g. Korean) voice: without a Japanese
 * voice nothing is spoken and NO_JA_VOICE is dispatched. Resolves when finished or cancelled.
 */
export async function speak(text: string, opts: SpeakOptions): Promise<void> {
  if (!synth) return;
  synth.cancel();
  const gen = ++generation;
  const parts = speakable(text).split(/(?<=[。！？!?])/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return;
  const voice = await japaneseVoice(opts.voice);
  if (gen !== generation) return;
  if (!voice) {
    window.dispatchEvent(new Event(NO_JA_VOICE));
    return;
  }
  return new Promise((resolve) => {
    let i = 0;
    let guard = 0;
    const next = () => {
      clearTimeout(guard);
      if (i >= parts.length || gen !== generation) return resolve();
      const part = parts[i++];
      const u = new SpeechSynthesisUtterance(part);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = opts.rate;
      u.pitch = opts.pitch ?? 1;
      const mine = i;
      const advance = () => i === mine && next(); // ignore a late onend after the guard fired
      u.onend = advance;
      u.onerror = () => {
        clearTimeout(guard);
        resolve();
      };
      // Some engines never fire onend (background tab, engine hiccup): move on anyway.
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
