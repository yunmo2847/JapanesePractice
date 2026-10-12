import { useEffect, useState, type CSSProperties } from 'react';
import { useSettings } from './lib/store';
import { useRoute } from './lib/router';
import { Home } from './screens/Home';
import { Session } from './screens/Session';
import { Practice } from './screens/Practice';
import { Progress } from './screens/Progress';
import { Settings } from './screens/Settings';
import { Katakana } from './screens/Katakana';
import { Structures } from './screens/Structures';
import { SurvivalList } from './components/SurvivalList';
import { Splash } from './components/Splash';
import { NO_JA_VOICE } from './lib/tts';
import { ChartColumn, House, MessageSquareText, PenLine, Puzzle, Settings as SettingsIcon } from 'lucide-react';

const NAV = [
  { path: '', icon: House, label: '홈' },
  { path: 'practice', icon: PenLine, label: '연습' },
  { path: 'survival', icon: MessageSquareText, label: '표현집' },
  { path: 'structures', icon: Puzzle, label: '문장 구조' },
  { path: 'progress', icon: ChartColumn, label: '진도' },
  { path: 'settings', icon: SettingsIcon, label: '설정' },
];

export function App() {
  const route = useRoute();
  const [settings] = useSettings();
  const section = route[0] ?? '';
  const [noVoice, setNoVoice] = useState(false);

  useEffect(() => {
    const on = () => setNoVoice(true);
    window.addEventListener(NO_JA_VOICE, on);
    return () => window.removeEventListener(NO_JA_VOICE, on);
  }, []);

  useEffect(() => {
    if (settings.theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  const isActive = (path: string) =>
    section === path || (path === '' && section === 'session') || (path === 'practice' && section === 'katakana');
  const activeIndex = NAV.findIndex((n) => isActive(n.path));

  const screen = (() => {
    switch (section) {
      case 'session':
        return <Session key={route[1]} day={Number(route[1]) || 1} />;
      case 'practice':
        return <Practice key={route.join('/')} route={route} />;
      case 'survival':
        return (
          <div className="stack">
            <h1>생존 표현집</h1>
            <p className="muted">대화가 막힐 때 꺼내 쓰는 표현과 홈스테이 생활 표현.</p>
            <SurvivalList />
          </div>
        );
      case 'katakana':
        return <Katakana tab={route[1]} />;
      case 'structures':
        return <Structures section={route[1]} />;
      case 'progress':
        return <Progress />;
      case 'settings':
        return <Settings />;
      default:
        return <Home />;
    }
  })();

  return (
    <div className={`app ${section === 'session' ? 'in-session' : ''}`}>
      <Splash />
      <nav className="nav" aria-label="메뉴" style={{ '--count': NAV.length } as CSSProperties}>
        {activeIndex >= 0 && <span className="nav-indicator" style={{ '--i': activeIndex } as CSSProperties} aria-hidden />}
        {NAV.map((n) => (
          <a key={n.label} href={`#/${n.path}`} className={isActive(n.path) ? 'on' : ''}>
            <n.icon className="nav-icon" size={20} strokeWidth={1.75} aria-hidden />
            <span className="nav-label">{n.label}</span>
          </a>
        ))}
      </nav>
      <main className="main">
        {noVoice && (
          <div className="notice voice-notice" role="alert">
            <span>
              일본어 음성이 없어서 소리를 내지 않았어요. (한국어 음성으로 읽으면 발음이 틀어져요)
            </span>
            <div className="row wrap">
              <a className="btn sm" href="#/settings" onClick={() => setNoVoice(false)}>설치 방법 보기</a>
              <button className="btn ghost sm" onClick={() => setNoVoice(false)}>닫기</button>
            </div>
          </div>
        )}
        {/* Re-keyed per route so every screen change replays the entrance animation. */}
        <div className="page" key={route.join('/')}>{screen}</div>
      </main>
    </div>
  );
}
