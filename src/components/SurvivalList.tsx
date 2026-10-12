import { useState } from 'react';
import { survival, SURVIVAL_LABEL, SURVIVAL_SECTIONS, type SurvivalCategory } from '../content';
import { plain } from '../lib/furigana';
import { useStore } from '../lib/store';
import { Ja, SpeakButton, Tag } from './ui';

const REGISTER = { polite: '정중', casual: '반말', both: '공통' } as const;
const FAVORITES = 'fav';

/**
 * Expression book, split into section tabs (대화 생존 / 홈스테이 / ★) with category filters.
 * `onPick` inserts the expression into the chat input.
 */
export function SurvivalList({ onPick, compact }: { onPick?: (text: string) => void; compact?: boolean }) {
  const { state, update } = useStore();
  const favs = new Set(state.favorites);
  const [section, setSection] = useState(SURVIVAL_SECTIONS[0].id);
  const [cat, setCat] = useState<SurvivalCategory | 'all'>('all');
  const toggle = (id: string) =>
    update((s) => ({
      ...s,
      favorites: s.favorites.includes(id) ? s.favorites.filter((f) => f !== id) : [...s.favorites, id],
    }));

  const current = SURVIVAL_SECTIONS.find((s) => s.id === section);
  const groups: [string, typeof survival][] =
    section === FAVORITES
      ? [['★ 즐겨찾기', survival.filter((x) => favs.has(x.id))]]
      : (current?.cats ?? [])
          .filter((c) => cat === 'all' || c === cat)
          .map((c) => [SURVIVAL_LABEL[c], survival.filter((x) => x.cat === c)]);

  const pickSection = (id: string) => {
    setSection(id);
    setCat('all');
  };

  return (
    <div className={`survival ${compact ? 'compact' : ''}`}>
      <div className="seg section-tabs" role="tablist" aria-label="표현집 섹션">
        {SURVIVAL_SECTIONS.map((s) => (
          <button key={s.id} role="tab" aria-selected={section === s.id} className={section === s.id ? 'on' : ''} onClick={() => pickSection(s.id)}>
            {s.label}
          </button>
        ))}
        <button role="tab" aria-selected={section === FAVORITES} className={section === FAVORITES ? 'on' : ''} onClick={() => pickSection(FAVORITES)}>
          ★ {favs.size}
        </button>
      </div>

      {current && (
        <div className="cat-chips" role="group" aria-label="분류">
          <button className={`chip ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>전체</button>
          {current.cats.map((c) => (
            <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>
              {SURVIVAL_LABEL[c]}
            </button>
          ))}
        </div>
      )}

      {section === FAVORITES && favs.size === 0 && (
        <p className="muted small">☆를 눌러 자주 쓰는 표현을 모아 두세요.</p>
      )}

      {groups.map(([label, items]) => (
        <section key={label} className="survival-group">
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
