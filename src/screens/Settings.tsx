import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { initialState, useSettings, useStore, type OutputMode } from '../lib/store';
import { speak, ttsSupported, useVoices } from '../lib/tts';

export function Settings() {
  const [s, set] = useSettings();
  const { update } = useStore();
  const allVoices = useVoices();
  const voices = allVoices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('ja'));
  const [status, setStatus] = useState('');

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
          <button className="btn" onClick={() => {
            setStatus('준비 중…');
            speak('こんにちは、よろしくお願いします。', { rate: s.rate, voice: s.voice, onStatus: setStatus });
          }}>
            <Volume2 size={18} aria-hidden /> 음성 테스트
          </button>
          {status && <span className="small" role="status">{status}</span>}
        </div>
        <details>
          <summary className="small">소리가 안 날 때 진단 정보</summary>
          <ul className="small">
            <li>브라우저가 알려준 음성: <b>{allVoices.length}개</b> (일본어 <b>{voices.length}개</b>)</li>
            {voices.map((v) => <li key={v.voiceURI}>{v.name} · {v.lang}{v.localService ? '' : ' · 온라인'}</li>)}
            <li>{!ttsSupported ? '이 브라우저는 음성 재생을 지원하지 않아요. 크롬으로 열어 주세요.'
              : allVoices.length === 0 ? '음성 목록이 비어 있어요. 시스템 기본 일본어 음성으로 재생을 시도해요.'
              : voices.length === 0 ? '음성은 있지만 일본어가 없어요. 아래 설치 방법을 따른 뒤 크롬을 완전히 껐다 켜세요.'
              : '일본어 음성이 보여요. 테스트에서 "오류"가 나오면 그 내용을 알려주세요.'}</li>
          </ul>
        </details>
        <div className="notice">
          <b>소리가 안 나면 순서대로 확인하세요</b>
          <ol>
            <li>태블릿 <b>미디어 볼륨</b>이 켜져 있는지 (볼륨 버튼 → 미디어), 이어폰 연결 확인</li>
            <li>설정 → 일반 → <b>텍스트 음성 변환(TTS)</b> → 기본 엔진 <b>Google 음성 인식 및 합성</b></li>
            <li>엔진 옆 ⚙ → <b>음성 데이터 설치</b> → <b>日本語</b> 다운로드</li>
            <li><b>크롬을 완전히 종료</b>(최근 앱 버튼 → 크롬을 위로 밀어 닫기)한 뒤 다시 열기 — 크롬은 껐다 켜야 새로 설치한 음성을 인식해요</li>
            <li>위의 음성 테스트를 다시 누르기</li>
          </ol>
        </div>
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
