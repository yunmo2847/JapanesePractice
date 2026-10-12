import { useEffect, useState } from 'react';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

const isJa = (v: SpeechSynthesisVoice) => v.lang.replace('_', '-').toLowerCase().startsWith('ja');

/** All voices the browser reports. Android Chrome fills the list late, so listen for voiceschanged. */
export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!synth) return;
    const read = () => setVoices(synth.getVoices());
    read();
    synth.addEventListener('voiceschanged', read);
    return () => synth.removeEventListener('voiceschanged', read);
  }, []);
  return voices;
}

export function useJapaneseVoices(): SpeechSynthesisVoice[] {
  return useVoices().filter(isJa);
}

export type SpeakOptions = {
  rate: number;
  voice: string;
  pitch?: number;
  /** Progress messages, used by the voice test in settings. */
  onStatus?: (status: string) => void;
};

let waitedForVoices = false;

/**
 * Picks the voice to use.
 * - Japanese voice listed → use it.
 * - Voices listed but none Japanese → 'none' (never fall back to e.g. a Korean voice).
 * - No list at all (some Android browsers never fill it) → undefined: speak with lang ja-JP
 *   and let the system engine choose its Japanese voice.
 */
async function chooseVoice(uri: string): Promise<SpeechSynthesisVoice | 'none' | undefined> {
  if (!synth) return 'none';
  if (synth.getVoices().length === 0 && !waitedForVoices) {
    waitedForVoices = true;
    await new Promise<void>((resolve) => {
      const done = () => {
        synth.removeEventListener('voiceschanged', done);
        resolve();
      };
      synth.addEventListener('voiceschanged', done);
      setTimeout(done, 2000);
    });
  }
  const all = synth.getVoices();
  if (all.length === 0) return undefined;
  const ja = all.filter(isJa);
  return ja.find((v) => v.voiceURI === uri) ?? ja[0] ?? 'none';
}

/** Text to speak: Japanese only. Hangul (e.g. Korean typed into a chat line) is dropped. */
export function speakable(text: string): string {
  return text.replace(/[ᄀ-ᇿ㄰-㆏가-힯]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Fired when speech was skipped because the browser lists voices but no Japanese one. */
export const NO_JA_VOICE = 'tts-no-japanese-voice';

let generation = 0;
// Chrome can garbage-collect an utterance mid-speech (no sound, no onend); keep references.
const alive = new Set<SpeechSynthesisUtterance>();

/**
 * Speaks Japanese text sentence by sentence (Android Chrome cuts long utterances off).
 * Never uses a non-Japanese voice. Resolves when finished or cancelled.
 */
export async function speak(text: string, opts: SpeakOptions): Promise<void> {
  const status = opts.onStatus ?? (() => {});
  if (!synth) return status('이 브라우저는 음성 재생을 지원하지 않아요.');
  const gen = ++generation;
  if (synth.speaking || synth.pending) {
    synth.cancel();
    // Chrome drops an utterance queued right after cancel(); give it a moment.
    await new Promise((r) => setTimeout(r, 80));
  }
  // Sentence by sentence; fragments that are only punctuation (e.g. left after dropping Hangul) are skipped.
  const parts = speakable(text).split(/(?<=[。！？!?])/).map((p) => p.trim()).filter((p) => /[^\s。、！？!?…]/.test(p));
  if (!parts.length) return;
  const voice = await chooseVoice(opts.voice);
  if (gen !== generation) return;
  if (voice === 'none') {
    status('일본어 음성을 찾지 못했어요.');
    window.dispatchEvent(new Event(NO_JA_VOICE));
    return;
  }
  synth.resume(); // Android Chrome can stay paused after the tab was in the background.
  return new Promise((resolve) => {
    let i = 0;
    let guard = 0;
    const next = () => {
      clearTimeout(guard);
      if (i >= parts.length || gen !== generation) {
        status('재생 끝');
        return resolve();
      }
      const part = parts[i++];
      const u = new SpeechSynthesisUtterance(part);
      // Always a valid tag: Android reports voice.lang as "ja_JP", which the engine rejects.
      u.lang = 'ja-JP';
      if (voice) u.voice = voice;
      u.rate = opts.rate;
      u.pitch = opts.pitch ?? 1;
      const mine = i;
      const advance = () => i === mine && next(); // ignore a late onend after the guard fired
      u.onstart = () => status(`재생 중 · ${voice ? voice.name : '시스템 기본 일본어 음성'}`);
      u.onend = () => {
        alive.delete(u);
        advance();
      };
      u.onerror = (e) => {
        alive.delete(u);
        clearTimeout(guard);
        status(`오류: ${(e as SpeechSynthesisErrorEvent).error ?? 'unknown'}`);
        resolve();
      };
      // Some engines never fire onend (background tab, engine hiccup): move on anyway.
      guard = window.setTimeout(advance, 2000 + (part.length * 400) / opts.rate);
      alive.add(u);
      synth.speak(u);
    };
    next();
  });
}

export function stopSpeaking() {
  generation++;
  alive.clear();
  synth?.cancel();
}

export const ttsSupported = Boolean(synth);
