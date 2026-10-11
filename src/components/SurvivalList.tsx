import { survival, SURVIVAL_LABEL, type SurvivalCategory } from '../content';
import { plain } from '../lib/furigana';
import { useStore } from '../lib/store';
import { Ja, SpeakButton, Tag } from './ui';

const REGISTER = { polite: '정중', casual: '반말', both: '공통' } as const;

/** Survival expressions grouped by category, favorites first. `onPick` inserts into the chat input. */
export function SurvivalList({ onPick, compact }: { onPick?: (text: string) => void; compact?: boolean }) {
  const { state, update } = useStore();
  const favs = new Set(state.favorites);
  const toggle = (id: string) =>
    update((s) => ({
      ...s,
      favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id],
    }));

  const groups: [string, typeof survival][] = [];
  const favList = survival.filter((x) => favs.has(x.id));
  if (favList.length) groups.push(['★ 즐겨찾기', favList]);
  for (const cat of Object.keys(SURVIVAL_LABEL) as SurvivalCategory[]) {
    groups.push([SURVIVAL_LABEL[cat], survival.filter((x) => x.cat === cat)]);
  }

  return (
    <div className="survival">
      {groups.map(([label, items]) => (
        <section key={label}>
          <h4>{label}</h4>
          <ul>
            {items.map((x) => (
              <li key={x.id} className="survival-item">
                <button
                  className="survival-main"
                  onClick={() => onPick?.(plain(x.ja).replace(/〜|〇〇/g, ''))}
                  disabled={!onPick}
                  aria-label={onPick ? `${plain(x.ja)} 입력창에 넣기` : undefined}
                >
                  <Ja text={x.ja} />
                  <span className="muted small">{x.ko}</span>
                </button>
                {!compact && (
                  <div className="row wrap">
                    <Tag>{REGISTER[x.register]}</Tag>
                    <SpeakButton text={x.ja} small />
                    {x.example && (
                      <span className="small">
                        예) <Ja text={x.example.ja} /> <span className="muted">{x.example.ko}</span>
                      </span>
                    )}
                  </div>
                )}
                <button className={`star ${favs.has(x.id) ? 'on' : ''}`} onClick={() => toggle(x.id)} aria-label="즐겨찾기">
                  {favs.has(x.id) ? '★' : '☆'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
