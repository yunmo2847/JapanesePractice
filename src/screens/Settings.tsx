import { useState } from 'react';
import { initialState, useSettings, useStore, type OutputMode } from '../lib/store';
import { speak, ttsSupported, useJapaneseVoices } from '../lib/tts';

export function Settings() {
  const [s, set] = useSettings();
  const { update } = useStore();
  const voices = useJapaneseVoices();
  const [tested, setTested] = useState(false);

  return (
    <div className="stack settings">
      <h1>설정</h1>

      <section className="panel stack">
        <h3>학습</h3>
        <label className="field">시작일 (Day 1)
          <input type="date" value={s.startDate} onChange={(e) => e.target.value && set({ startDate: e.target.value })} />
        </label>
        <Choice label="하루 학습 시간" value={s.minutes} options={[[30, '30분'], [60, '60분']]} onChange={(v) => set({ minutes: v })} />
        <Choice<OutputMode> label="카드 기본 출력 방식" value={s.output} options={[['typing', '타이핑'], ['blocks', '블록 조립'], ['silent', '속으로 말하기']]} onChange={(v) => set({ output: v })} />
        <Toggle label="로마자 → 가나 자동 변환" hint="tabemasu → たべます. 일본어 키보드를 쓰면 꺼도 돼요." value={s.romaji} onChange={(v) => set({ romaji: v })} />
        <Toggle label="후리가나 표시" value={s.furigana} onChange={(v) => set({ furigana: v })} />
      </section>

      <section className="panel stack">
        <h3>소리</h3>
        <Toggle label="이어폰 모드 (소리 사용)" hint="끄면 모든 소리를 멈추고 텍스트만으로 진행해요." value={s.sound} onChange={(v) => set({ sound: v })} />
        <Toggle label="정답 자동 재생" value={s.autoplay} onChange={(v) => set({ autoplay: v })} />
        <Choice label="기본 속도" value={s.rate} options={[[0.7, '0.7×'], [0.85, '0.85×'], [1, '1.0×'], [1.2, '1.2×']]} onChange={(v) => set({ rate: v })} />
        <label className="field">음성
          <select value={s.voice} onChange={(e) => set({ voice: e.target.value })}>
            <option value="">자동 (첫 번째 일본어 음성)</option>
            {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
          </select>
        </label>
        <div className="row wrap">
          <button className="btn" onClick={() => { setTested(true); speak('こんにちは、よろしくお願いします。', { rate: s.rate, voice: s.voice }); }}>
            🔊 음성 테스트
          </button>
          {tested && <span className="small muted">들리지 않거나 한국어/영어 발음이면 아래 방법으로 일본어 음성을 설치하세요.</span>}
        </div>
        {(!ttsSupported || voices.length === 0) && (
          <div className="notice" role="alert">
            <b>일본어 음성이 없어요.</b> 갤럭시 탭에서 설치하기:
            <ol>
              <li>설정 → 일반 → <b>텍스트 음성 변환(TTS)</b></li>
              <li>기본 엔진을 <b>Google 음성 인식 및 합성</b>으로 선택</li>
              <li>엔진 옆 ⚙ → <b>음성 데이터 설치</b> → <b>日本語</b> 다운로드</li>
              <li>이 앱으로 돌아와 새로고침</li>
            </ol>
            <span className="small muted">삼성 TTS 엔진에 일본어가 있으면 그대로 써도 돼요.</span>
          </div>
        )}
      </section>

      <section className="panel stack">
        <h3>화면</h3>
        <Choice label="테마" value={s.theme} options={[['system', '시스템'], ['light', '라이트'], ['dark', '다크']]} onChange={(v) => set({ theme: v })} />
      </section>

      <section className="panel stack">
        <h3>도움말</h3>
        <details>
          <summary>삼성 키보드에서 입력이 이상할 때</summary>
          <ul className="small">
            <li>글자가 두 번 찍히거나 영어 단어로 바뀌면: 삼성 키보드 설정 → <b>예측 텍스트</b>를 끄세요.</li>
            <li>일본어 자판을 직접 쓰려면: 설정 → 일반 → 삼성 키보드 설정 → 언어 및 키보드 형식 → 입력 언어 관리 → <b>日本語</b> 추가, 그리고 위의 로마자 자동 변환을 끄세요.</li>
          </ul>
        </details>
        <details>
          <summary>키보드 단축키 (북커버 키보드 · DeX)</summary>
          <ul className="small">
            <li><kbd>Enter</kbd> 제출 / 다음</li>
            <li><kbd>Tab</kbd> 카드 정답 보기</li>
            <li><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> 바로 말함 / 떠올리긴 함 / 못 함</li>
            <li><kbd>R</kbd> 다시 듣기</li>
          </ul>
        </details>
      </section>

      <section className="panel stack">
        <h3>데이터</h3>
        <p className="muted small">진도 백업은 진도 화면 맨 아래에 있어요.</p>
        <button className="btn bad" onClick={() => {
          if (window.confirm('모든 진도와 설정을 지울까요? 되돌릴 수 없어요.')) update(() => initialState());
        }}>모든 기록 초기화</button>
      </section>
    </div>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span>{label}{hint && <span className="muted small block">{hint}</span>}</span>
      <input type="checkbox" role="switch" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Choice<T extends string | number>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string][]; onChange: (v: T) => void;
}) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="seg">
        {options.map(([v, text]) => (
          <button key={String(v)} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{text}</button>
        ))}
      </div>
    </div>
  );
}
