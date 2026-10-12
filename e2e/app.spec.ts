import { expect, test, type Page } from '@playwright/test';
import cards from '../src/content/cards.json' with { type: 'json' };
import { reading } from '../src/lib/furigana';

// Galaxy Tab S-series sized touch screen (CSS px).
const TAB_LANDSCAPE = { viewport: { width: 1280, height: 800 }, hasTouch: true, isMobile: true };

async function seed(page: Page, settings: Record<string, unknown>) {
  await page.addInitScript((s) => {
    if (!localStorage.getItem('nihongo21')) localStorage.setItem('nihongo21', JSON.stringify({ settings: s }));
  }, settings);
}

test.describe('Day 1 session on a tablet', () => {
  test.use(TAB_LANDSCAPE);

  test('runs cards → pattern → free talk and marks the day done, without sound', async ({ page }) => {
    await seed(page, { sound: false, minutes: 30 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Day 1/ })).toBeVisible();
    await page.getByRole('button', { name: '오늘 학습 시작' }).click();

    // F2 cards: the first one typed in romaji to exercise the in-app kana conversion (F0).
    const day1 = cards.filter((c) => c.day === 1);
    const input = page.locator('.kana-input input');
    await input.pressSequentially('hajimemashite');
    await expect(input).toHaveValue('はじめまして');
    await page.getByRole('button', { name: '확인' }).click();
    await expect(page.getByText('정답!')).toBeVisible();
    await page.getByRole('button', { name: '다음' }).click();

    for (const card of day1.slice(1)) {
      await input.fill(reading(card.ja));
      await page.getByRole('button', { name: '확인' }).click();
      await expect(page.getByText('정답!')).toBeVisible();
      await page.getByRole('button', { name: '다음' }).click();
    }
    await expect(page.getByText('카드 완료')).toBeVisible();
    await page.getByRole('button', { name: '다음으로' }).click();

    // F7 patterns
    await expect(page.getByRole('heading', { name: 'A는 B예요' })).toBeVisible();
    await page.getByRole('button', { name: '다음으로' }).click();

    // F1 free talk
    await page.getByRole('button', { name: '30초' }).click();
    await page.getByRole('button', { name: '시작하기' }).click();
    const talk = page.locator('.talk-input input');
    for (const line of ['はじめまして。キムです。', 'かんこくからきました。でも、にほんごはまだしょしんしゃです。', 'ユイさんもがくせいですか？']) {
      await talk.fill(line);
      await talk.press('Enter');
    }
    await expect(page.locator('.bubble.me')).toHaveCount(3);
    // Tablet landscape keeps the survival panel visible beside the chat.
    await expect(page.locator('.talk-side')).toBeVisible();
    await page.getByRole('button', { name: '끝내기' }).click();

    await expect(page.getByRole('heading', { name: /리포트/ })).toBeVisible();
    await expect(page.locator('.stat', { hasText: '문장 (목표 3)' })).toContainText('5');
    await expect(page.locator('.stat', { hasText: '되묻기' })).toContainText('했음');
    await expect(page.locator('.stat', { hasText: '접속 표현' })).toContainText('1');
    await page.getByRole('button', { name: '완료' }).click();

    await expect(page.getByText('Day 1 완료')).toBeVisible();
    await page.getByRole('button', { name: '홈으로' }).click();
    await expect(page.getByRole('button', { name: '오늘 학습 다시 보기' })).toBeVisible();

    // Progress survives a reload (localStorage).
    await page.reload();
    await expect(page.locator('.days-bar li.done')).toHaveCount(1);
  });

  test('wrong answers are re-asked and near misses go to self-assessment', async ({ page }) => {
    await seed(page, { sound: false });
    await page.goto('/#/practice/1/cards');
    const input = page.locator('.kana-input input');
    await input.fill('ぜんぜんちがう');
    await page.getByRole('button', { name: '확인' }).click();
    await expect(page.getByText('다시 한번')).toBeVisible();
    await expect(page.locator('.diff .miss').first()).toBeVisible();
    await page.getByRole('button', { name: /다시 나와요/ }).click();
    await expect(page.getByText('2 / 11')).toBeVisible(); // the missed card was appended

    await input.fill('よろしくおねがいしまう'); // one kana off
    await page.getByRole('button', { name: '확인' }).click();
    await expect(page.getByText('거의 정답')).toBeVisible();
    await expect(page.getByRole('button', { name: '바로 말함' })).toBeVisible();
  });

  test('block assembly and silent recall', async ({ page }) => {
    await seed(page, { sound: false, output: 'blocks' });
    await page.goto('/#/practice/1/cards');
    // Card 1 has a single block, so it falls back to typing.
    await expect(page.locator('.kana-input input')).toBeVisible();
    await page.locator('.kana-input input').fill('はじめまして');
    await page.getByRole('button', { name: '확인' }).click();
    await page.getByRole('button', { name: '다음' }).click();

    // Card 2: よろしく | お願いします — tap in order.
    await page.locator('.block-pool .block', { hasText: 'よろしく' }).click();
    await page.locator('.block-pool .block', { hasText: '願' }).click();
    await expect(page.getByText('정답!')).toBeVisible();
    await page.getByRole('button', { name: '다음' }).click();

    await page.getByRole('button', { name: '속으로' }).click();
    await page.getByRole('button', { name: '정답 보기' }).click();
    await page.getByRole('button', { name: '떠올리긴 함' }).click();
    await expect(page.getByText('4 / 10')).toBeVisible();
  });

  test('free talk waits for the spoken question before the timer starts', async ({ page }) => {
    await seed(page, { sound: true });
    await page.goto('/#/practice/1/talk/t-intro');
    await page.getByRole('button', { name: '시작하기' }).click();
    // The test browser has no Japanese voice: speech ends at once (or via the guard timer) and the clock starts.
    await expect(page.getByText('질문을 듣는 중')).toBeHidden({ timeout: 30_000 });
    // 10 s without typing → stalling phrases appear; tapping one inserts it.
    await expect(page.getByText('막혔다면:')).toBeVisible({ timeout: 15_000 });
    await page.locator('.stuck .chip').first().click();
    await expect(page.locator('.talk-input input')).toHaveValue('えっと…');
  });

  test('chain drill, dialogue with dictation and quiz', async ({ page }) => {
    await seed(page, { sound: false });
    await page.goto('/#/practice/3/chain');
    await expect(page.getByText('답변 확장 공식')).toBeVisible();
    await page.locator('.kana-input input').fill('らーめんがすきです');
    await page.getByRole('button', { name: '이어 쓰기' }).click();
    await expect(page.getByText('내 문장: らーめんがすきです')).toBeVisible();

    await page.goto('/#/practice/3/listen');
    await page.getByRole('button', { name: /받아쓰기/ }).click();
    const first = page.locator('.turn').first();
    await first.locator('input').fill('ゆいさん、すきなたべものはなんですか');
    await first.getByRole('button', { name: '채점' }).click();
    await expect(first.locator('.tag')).toHaveText('정답');

    await page.getByRole('button', { name: '대답하기 (20초)' }).click();
    await page.locator('.panel .kana-input input').last().fill('はい、すきです');
    await page.getByRole('button', { name: '대답', exact: true }).click();
    await expect(page.getByText('내 대답: はい、すきです')).toBeVisible();

    await page.getByRole('button', { name: '매운 걸 좋아해서' }).click();
    await page.getByRole('button', { name: '매운 음식' }).click();
    await page.goto('/#/progress');
    await expect(page.getByText('진도 · 리포트')).toBeVisible();
  });

  test('progress export code round-trips through import', async ({ page }) => {
    await seed(page, { sound: false });
    await page.goto('/#/progress');
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: '코드 복사' }).click();
    const code = await page.locator('textarea').inputValue();
    expect(code.length).toBeGreaterThan(20);
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: '코드로 가져오기' }).click();
    await expect(page.getByText('가져오기 완료!')).toBeVisible();
  });
});

const LAYOUTS = [
  { name: 'phone', viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true },
  { name: 'tab-portrait', viewport: { width: 800, height: 1280 }, hasTouch: true, isMobile: true },
  { name: 'tab-landscape', ...TAB_LANDSCAPE },
  { name: 'pc', viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false },
];

for (const layout of LAYOUTS) {
  test.describe(`layout: ${layout.name}`, () => {
    test.use({ viewport: layout.viewport, hasTouch: layout.hasTouch, isMobile: layout.isMobile });

    test('picks the right navigation, never scrolls sideways, keeps the chat input on screen', async ({ page }) => {
      await seed(page, { sound: false });

      // Free talk first: full-page screenshots below reset Playwright's touch emulation.
      await page.goto('/#/practice/3/talk/t-food');
      // Bottom tab bar on every device: near the bottom edge, never wider than the screen.
      const nav = await page.locator('.nav').boundingBox();
      expect(nav!.y + nav!.height).toBeGreaterThan(layout.viewport.height - 30);
      expect(nav!.y + nav!.height).toBeLessThanOrEqual(layout.viewport.height);
      expect(nav!.width).toBeLessThanOrEqual(Math.min(760, layout.viewport.width));

      await page.getByRole('button', { name: '시작하기' }).click();
      await page.locator('.talk-input input').fill('ラーメンがすきです。');
      await page.locator('.talk-input input').press('Enter');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      // The input must be on screen, above the tab bar, without scrolling.
      const box = await page.locator('.talk-input input').boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(nav!.y);
      // Wide landscape screens keep the survival panel beside the chat; narrow ones use the sheet button.
      const wide = layout.viewport.width >= 900 && layout.viewport.width > layout.viewport.height;
      await expect(page.locator('.talk-side')).toBeVisible({ visible: wide });
      await page.screenshot({ path: `e2e/screenshots/${layout.name}-talk.png` });

      for (const [shot, path] of [
        ['home', '/'],
        ['practice', '/#/practice/1'],
        ['cards', '/#/practice/1/cards'],
        ['pattern', '/#/practice/3/pattern'],
        ['dialogue', '/#/practice/6/listen'],
        ['survival', '/#/survival'],
        ['katakana', '/#/katakana'],
        ['survival-home', '/#/survival'],
        ['structures', '/#/structures/verb'],
        ['katakana-quiz', '/#/katakana/chars'],
        ['progress', '/#/progress'],
        ['settings', '/#/settings'],
      ]) {
        await page.goto(path);
        await page.waitForTimeout(150);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${layout.name}/${shot} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
        await page.screenshot({ path: `e2e/screenshots/${layout.name}-${shot}.png`, fullPage: true });
      }
    });
  });
}

/** Replaces speechSynthesis with a fake that records what was spoken and with which voice. */
async function fakeSpeech(page: Page, voices: { name: string; lang: string }[], loadDelayMs: number, speakMs = 10) {
  await page.addInitScript(({ voices, loadDelayMs, speakMs }) => {
    const w = window as unknown as { __spoken: { text: string; voice?: string; lang: string }[] };
    w.__spoken = [];
    let list: SpeechSynthesisVoice[] = [];
    const target = new EventTarget();
    const synth = {
      getVoices: () => list,
      speaking: false,
      pending: false,
      speak(u: SpeechSynthesisUtterance) {
        w.__spoken.push({ text: u.text, voice: u.voice?.name, lang: u.lang });
        setTimeout(() => u.onstart?.(new Event('start') as SpeechSynthesisEvent), 5);
        setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), speakMs);
      },
      cancel() {},
      resume() {},
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth });
    // The real utterance only accepts real voice objects.
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
      text: string; lang = ''; voice?: SpeechSynthesisVoice; rate = 1; pitch = 1;
      onstart?: (e: Event) => void; onend?: (e: Event) => void; onerror?: (e: Event) => void;
      constructor(text: string) { this.text = text; }
    };
    setTimeout(() => {
      list = voices.map((v) => ({ ...v, voiceURI: v.name, default: false, localService: true }) as SpeechSynthesisVoice);
      target.dispatchEvent(new Event('voiceschanged'));
    }, loadDelayMs);
  }, { voices, loadDelayMs, speakMs });
}

const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: { text: string; voice?: string; lang: string }[] }).__spoken);

test.describe('TTS speaks Japanese only', () => {
  test.use(TAB_LANDSCAPE);

  test('with only a Korean voice nothing is spoken and a notice appears', async ({ page }) => {
    await seed(page, { sound: true });
    await fakeSpeech(page, [{ name: 'Samsung Korean', lang: 'ko_KR' }], 50);
    await page.goto('/#/practice/3/pattern');
    await page.getByRole('button', { name: '듣기', exact: true }).first().click();
    await expect(page.getByText('일본어 음성이 없어서 소리를 내지 않았어요')).toBeVisible();
    expect(await spoken(page)).toEqual([]);
  });

  test('waits for a late-loading Japanese voice and uses it', async ({ page }) => {
    await seed(page, { sound: true });
    await fakeSpeech(page, [{ name: 'Samsung Korean', lang: 'ko-KR' }, { name: 'Google 日本語', lang: 'ja_JP' }], 800);
    await page.goto('/#/practice/3/pattern');
    await page.getByRole('button', { name: '듣기', exact: true }).first().click();
    await expect.poll(() => spoken(page)).toHaveLength(1);
    const [u] = await spoken(page);
    // lang stays a valid tag even though Android reports the voice as ja_JP.
    expect(u).toEqual({ text: 'ラーメンが好きです。', voice: 'Google 日本語', lang: 'ja-JP' });
  });

  test('with no voice list at all it still speaks, asking the system for ja-JP', async ({ page }) => {
    await seed(page, { sound: true });
    await fakeSpeech(page, [], 60_000); // list never arrives within the test
    await page.goto('/#/practice/3/pattern');
    await page.getByRole('button', { name: '듣기', exact: true }).first().click();
    await expect.poll(() => spoken(page), { timeout: 5000 }).toHaveLength(1);
    expect((await spoken(page))[0]).toEqual({ text: 'ラーメンが好きです。', voice: undefined, lang: 'ja-JP' });
    await expect(page.getByText('일본어 음성이 없어서')).toBeHidden();
  });

  test('settings voice test reports progress and the voices it sees', async ({ page }) => {
    await seed(page, { sound: true });
    await fakeSpeech(page, [{ name: 'Samsung Korean', lang: 'ko_KR' }, { name: 'Google 日本語', lang: 'ja_JP' }], 0);
    await page.goto('/#/settings');
    await page.getByRole('button', { name: '음성 테스트' }).click();
    await expect(page.getByRole('status').filter({ hasText: '재생 끝' })).toBeVisible();
    await page.getByText('소리가 안 날 때 진단 정보').click();
    await expect(page.getByText('브라우저가 알려준 음성: 2개 (일본어 1개)')).toBeVisible();
  });

  test('does not read Korean typed into a free-talk answer', async ({ page }) => {
    await seed(page, { sound: false });
    await fakeSpeech(page, [{ name: 'Google 日本語', lang: 'ja-JP' }], 0);
    await page.goto('/#/practice/3/talk/t-food');
    await page.getByRole('button', { name: '시작하기' }).click();
    const talk = page.locator('.talk-input input');
    await talk.fill('ラーメンがすきです。');
    await talk.press('Enter');
    await talk.fill('라면 좋아');
    await talk.press('Enter');
    await page.getByRole('button', { name: '끝내기' }).click();
    await page.getByRole('button', { name: '내 문장 듣기' }).click();
    await expect.poll(() => spoken(page)).toHaveLength(1);
    expect((await spoken(page))[0].text).toBe('ラーメンがすきです。');
  });
});

test.describe('katakana', () => {
  test.use(TAB_LANDSCAPE);

  test('chart, character quiz, reading and writing loanwords', async ({ page }) => {
    await seed(page, { sound: false });
    await page.goto('/#/practice');
    await page.getByRole('button', { name: 'カ 가타카나' }).click();
    await expect(page.locator('.kana-cell', { hasText: 'ア' }).first()).toBeVisible();
    await expect(page.locator('.kana-cell')).toHaveCount(46 + 25 + 33 + 13);

    // Character quiz: pick the right romaji using the chart data.
    await page.getByRole('tab', { name: '글자 퀴즈' }).click();
    const { allKana } = await import('../src/content/katakana');
    const romajiOf = new Map(allKana().map((k) => [k.kana, k.romaji]));
    const shown = (await page.locator('.kana-quiz').textContent())!;
    await page.getByRole('button', { name: romajiOf.get(shown)!, exact: true }).click();
    await expect(page.locator('.quiz-options .btn.good')).toHaveText(romajiOf.get(shown)!);
    await page.getByRole('button', { name: '다음' }).click();
    await expect(page.getByText('2 / 20')).toBeVisible();

    // Writing: romaji typed in the katakana box turns into katakana.
    await page.getByRole('tab', { name: '외래어 쓰기' }).click();
    const input = page.locator('.kana-input input');
    await input.pressSequentially('ko-hi-');
    await expect(input).toHaveValue('コーヒー');

    // Reading: type the reading of the word shown.
    await page.getByRole('tab', { name: '외래어 읽기' }).click();
    const word = (await page.locator('.kana-word').textContent())!;
    // Katakana → hiragana keeping ー, as typing "ko-hi-" produces.
    const asTyped = word.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
    await page.locator('.kana-input input').fill(asTyped);
    await page.getByRole('button', { name: '확인' }).click();
    await expect(page.getByText('정답!')).toBeVisible();
  });
});

test.describe('free-talk back-and-forth with ユイ', () => {
  test.use(TAB_LANDSCAPE);

  test('ユイ reacts after a pause, follows up, answers when asked back, and it all lands in the report', async ({ page }) => {
    await seed(page, { sound: false });
    await page.goto('/#/practice/3/talk/t-food');
    await page.getByRole('button', { name: '시작하기' }).click();
    const talk = page.locator('.talk-input input');
    const yui = page.locator('.bubble.them');

    await talk.fill('ラーメンがすきです。');
    await talk.press('Enter');
    // While the learner keeps typing, ユイ waits.
    await talk.fill('おいし');
    await page.waitForTimeout(5000);
    await expect(yui).toHaveCount(1);
    await talk.fill('おいしいから。');
    await talk.press('Enter');
    // After a 4 s pause she reacts and asks the first follow-up (one bubble each).
    await expect(yui).toHaveCount(3, { timeout: 8000 });
    await expect(yui.nth(1)).toContainText('いいですね');
    await expect(yui.nth(2)).toContainText('요리는 해요?');

    // Asking back + the manual button: she answers about herself, then asks the next one.
    await talk.fill('はい。ユイさんは？');
    await talk.press('Enter');
    await page.getByRole('button', { name: 'ユイ 차례' }).click();
    await expect(page.getByText('저는 초밥을 좋아해요. 하지만 매운 건 잘 못 먹어요.')).toBeVisible();
    await expect(page.getByText('한국에서 추천하는 음식은 뭐예요?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'ユイ 차례' })).toBeDisabled();

    await page.getByRole('button', { name: '끝내기' }).click();
    await expect(page.getByRole('heading', { name: '대화 기록' })).toBeVisible();
    await expect(page.locator('.transcript li.them')).toHaveCount(6); // question + 2 + 3
    await expect(page.locator('.transcript li.me')).toHaveCount(3);
    // Only the learner's lines are scored.
    await expect(page.locator('.stat', { hasText: '문장 (목표 3)' })).toContainText('4');
  });

  test('the clock stops while ユイ is speaking', async ({ page }) => {
    await seed(page, { sound: true });
    await fakeSpeech(page, [{ name: 'Google 日本語', lang: 'ja-JP' }], 0, 2500); // each sentence takes 2.5 s
    await page.goto('/#/practice/3/talk/t-food');
    await page.getByRole('button', { name: '시작하기' }).click();
    await expect(page.getByText('질문을 듣는 중')).toBeHidden({ timeout: 10_000 });
    const talk = page.locator('.talk-input input');
    await talk.fill('ラーメンがすきです。');
    await talk.press('Enter');
    await page.getByRole('button', { name: 'ユイ 차례' }).click();
    await expect(page.getByText('ユイ가 말하는 중 · 타이머 멈춤')).toBeVisible();
    const before = await page.locator('.timebar-text').textContent();
    await page.waitForTimeout(3000);
    expect(await page.locator('.timebar-text').textContent()).toBe(before);
    await expect(page.getByText('ユイ가 말하는 중 · 타이머 멈춤')).toBeHidden({ timeout: 10_000 });
  });
});

test.describe('books', () => {
  test.use(TAB_LANDSCAPE);

  test('expression book: sections, category filter, homestay phrases, favorites tab', async ({ page }) => {
    await seed(page, { sound: false });
    await page.goto('/#/survival');
    await expect(page.getByRole('tab', { name: '대화 생존' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: '홈스테이' }).click();
    await expect(page.locator('.survival-group h4')).toHaveText(['인사', '식사', '부탁·허락', '생활·감사']);
    await expect(page.getByText('잘 먹겠습니다. (먹기 전)')).toBeVisible();
    // First greeting a guest says at the door, with the local tip.
    const first = page.locator('.survival-item').first();
    await expect(first).toContainText('실례하겠습니다. (남의 집에 들어갈 때)');
    await expect(first.locator('.tip')).toContainText("직역은 '방해하겠습니다'");
    await page.locator('.cat-chips').getByRole('button', { name: '식사' }).click();
    await expect(page.locator('.survival-group h4')).toHaveText(['식사']);
    await page.locator('.survival-item', { hasText: '잘 먹겠습니다' }).getByRole('button', { name: '즐겨찾기' }).click();
    await page.getByRole('tab', { name: '즐겨찾기 1' }).click();
    await expect(page.locator('.survival-item')).toHaveCount(1);
  });

  test('sentence-structure book: sections, tables and examples', async ({ page }) => {
    await seed(page, { sound: false });
    await page.goto('/');
    await page.locator('.nav').getByRole('link', { name: /문장 구조/ }).click();
    await expect(page.getByRole('heading', { name: '문장 구조' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '기본 어순' })).toBeVisible();
    await page.getByRole('tab', { name: '동사' }).click();
    await expect(page.getByRole('heading', { name: 'て형 만들기' })).toBeVisible();
    await expect(page.locator('.structure', { hasText: 'て형 만들기' }).locator('.conj tr')).toHaveCount(7);
    await expect(page.locator('.nav a.on')).toContainText('문장 구조');
  });
});
