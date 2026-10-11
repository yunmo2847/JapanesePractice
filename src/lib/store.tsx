import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CardState } from './srs';
import { toISODate } from './srs';
import type { Report } from './report';
import type { Card } from '../content/types';

export const DATA_VERSION = 1;
const KEY = 'nihongo21';

export type OutputMode = 'typing' | 'blocks' | 'silent';

export type Settings = {
  startDate: string;
  minutes: 30 | 60;
  output: OutputMode;
  romaji: boolean;
  rate: number;
  voice: string; // voiceURI, '' = auto
  furigana: boolean;
  autoplay: boolean;
  theme: 'system' | 'light' | 'dark';
  sound: boolean; // false = 소리 끄기 모드
};

export type FreeTalk = {
  topicId: string;
  day: number;
  round: 1 | 2;
  at: string;
  messages: string[];
  report: Report;
  seconds: number;
};

export type State = {
  version: number;
  settings: Settings;
  dayOverride: number | null;
  days: Record<number, { steps: string[]; done?: string }>;
  cards: Record<string, CardState>;
  custom: Card[]; // cards added from dialogues (long press)
  freetalks: FreeTalk[];
  memos: { at: string; topicId: string; text: string }[];
  quiz: Record<string, { correct: number; total: number }>;
  favorites: string[];
  flags: { id: string; at: string; note?: string }[];
};

export const today = () => toISODate(new Date());

export function initialState(): State {
  return {
    version: DATA_VERSION,
    settings: {
      startDate: today(),
      minutes: 30,
      output: 'typing',
      romaji: true,
      rate: 0.85,
      voice: '',
      furigana: true,
      autoplay: true,
      theme: 'system',
      sound: true,
    },
    dayOverride: null,
    days: {},
    cards: {},
    custom: [],
    freetalks: [],
    memos: [],
    quiz: {},
    favorites: [],
    flags: [],
  };
}

/** Accepts saved/imported data from any version and fills in missing fields. */
export function migrate(raw: unknown): State {
  const base = initialState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<State>;
  return { ...base, ...r, version: DATA_VERSION, settings: { ...base.settings, ...(r.settings ?? {}) } };
}

function load(): State {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? migrate(JSON.parse(saved)) : initialState();
  } catch {
    return initialState();
  }
}

export function exportCode(state: State): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

export function importCode(text: string): State {
  const trimmed = text.trim();
  const json = trimmed.startsWith('{') ? trimmed : decodeURIComponent(escape(atob(trimmed)));
  return migrate(JSON.parse(json));
}

type Ctx = { state: State; update: (fn: (s: State) => State) => void };
const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked: progress stays in memory for this visit.
    }
  }, [state]);
  return <StoreContext.Provider value={{ state, update: setState }}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}

export function useSettings() {
  const { state, update } = useStore();
  const set = (patch: Partial<Settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  return [state.settings, set] as const;
}
