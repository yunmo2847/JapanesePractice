import { useEffect } from 'react';
import { useSettings } from './lib/store';
import { useRoute } from './lib/router';
import { Home } from './screens/Home';
import { Session } from './screens/Session';
import { Practice } from './screens/Practice';
import { Progress } from './screens/Progress';
import { Settings } from './screens/Settings';
import { SurvivalList } from './components/SurvivalList';

const NAV = [
  { path: '', icon: '🏠', label: '홈' },
  { path: 'practice', icon: '✏️', label: '연습' },
  { path: 'survival', icon: '🆘', label: '표현집' },
  { path: 'progress', icon: '📈', label: '진도' },
  { path: 'settings', icon: '⚙️', label: '설정' },
];

export function App() {
  const route = useRoute();
  const [settings] = useSettings();
  const section = route[0] ?? '';

  useEffect(() => {
    if (settings.theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

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
            <p className="muted">프리토킹 중 막혔을 때 꺼내 쓰는 표현. ☆로 즐겨찾기하면 채팅 화면 맨 위에 나와요.</p>
            <div className="panel"><SurvivalList /></div>
          </div>
        );
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
      <nav className="nav" aria-label="메뉴">
        <span className="brand">니혼고 21</span>
        {NAV.map((n) => (
          <a key={n.label} href={`#/${n.path}`} className={section === n.path || (n.path === '' && section === 'session') ? 'on' : ''}>
            <span className="nav-icon" aria-hidden>{n.icon}</span>
            <span className="nav-label">{n.label}</span>
          </a>
        ))}
      </nav>
      <main className="main">{screen}</main>
    </div>
  );
}
