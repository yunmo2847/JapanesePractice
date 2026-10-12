import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { toKana, toKatakana } from 'wanakana';
import { useSettings } from '../lib/store';
import { finishKana } from '../lib/kana';

export type KanaInputHandle = { insert: (text: string) => void; focus: () => void };

type Props = {
  onSubmit: (text: string) => void;
  onFirstKey?: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  submitLabel?: string;
  katakana?: boolean; // convert romaji to katakana instead of hiragana
  onType?: (value: string) => void; // every change, e.g. to know whether the box is empty
};

/**
 * Text input that turns romaji into kana as you type (F0).
 * Conversion waits while the keyboard is composing (Samsung keyboard/Gboard predictive
 * text) and runs on compositionend, so characters are not doubled.
 */
export const KanaInput = forwardRef<KanaInputHandle, Props>(function KanaInput(
  { onSubmit, onFirstKey, placeholder, disabled, autoFocus, submitLabel = '보내기', katakana, onType },
  ref,
) {
  const [s] = useSettings();
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const typed = useRef(false);

  const convert = () => {
    const el = input.current;
    if (!el || !s.romaji) return;
    const cursor = el.selectionEnd ?? el.value.length;
    const head = el.value.slice(0, cursor);
    const tail = el.value.slice(cursor);
    // IMEMode keeps a lone trailing "n" until the next key decides ん/な/に…
    const converted = katakana ? toKatakana(head, { IMEMode: true }) : toKana(head, { IMEMode: true });
    if (converted !== head) {
      el.value = converted + tail;
      el.setSelectionRange(converted.length, converted.length);
    }
  };

  useImperativeHandle(ref, () => ({
    insert(text) {
      const el = input.current;
      if (!el) return;
      const at = el.selectionEnd ?? el.value.length;
      el.value = el.value.slice(0, at) + text + el.value.slice(at);
      el.focus();
      el.setSelectionRange(at + text.length, at + text.length);
      onType?.(el.value);
    },
    focus: () => input.current?.focus(),
  }));

  useEffect(() => {
    if (autoFocus && !disabled) input.current?.focus();
  }, [autoFocus, disabled]);

  const submit = () => {
    const el = input.current;
    if (!el) return;
    const text = (s.romaji ? (katakana ? toKatakana(el.value) : finishKana(el.value)) : el.value).trim();
    if (!text) return;
    onSubmit(text);
    el.value = '';
    onType?.('');
    el.focus();
  };

  return (
    <form
      className="kana-input"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        ref={input}
        lang="ja"
        type="text"
        enterKeyHint="send"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder={placeholder ?? (s.romaji ? '로마자 입력 (ka → か)' : '일본어로 입력')}
        disabled={disabled}
        onCompositionStart={() => (composing.current = true)}
        onCompositionEnd={() => {
          composing.current = false;
          convert();
        }}
        onInput={() => {
          if (!typed.current) {
            typed.current = true;
            onFirstKey?.();
          }
          if (!composing.current) convert();
          onType?.(input.current?.value ?? '');
        }}
      />
      <button type="submit" className="btn primary" disabled={disabled}>
        {submitLabel}
      </button>
    </form>
  );
});
