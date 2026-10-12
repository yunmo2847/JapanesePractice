import { STRUCTURE_SECTIONS, structures, type Structure } from '../content';
import { navigate } from '../lib/router';
import { Ja, SpeakButton, Tag } from '../components/ui';

/** Sentence-structure book: #/structures[/section] */
export function Structures({ section = STRUCTURE_SECTIONS[0].id }: { section?: string }) {
  const items = structures.filter((x) => x.section === section);
  return (
    <div className="stack">
      <h1>문장 구조</h1>
      <p className="muted">문장을 만드는 틀을 모았어요. 예문을 탭해 듣고, 틀에 단어만 바꿔 말해 보세요.</p>
      <div className="cat-chips sticky-chips" role="tablist" aria-label="문장 구조 분류">
        {STRUCTURE_SECTIONS.map((s) => (
          <button key={s.id} role="tab" aria-selected={s.id === section} className={`chip ${s.id === section ? 'on' : ''}`}
            onClick={() => navigate(`/structures/${s.id}`)}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="structure-grid">
        {items.map((x) => <StructureCard key={x.id} item={x} />)}
      </div>
    </div>
  );
}

function StructureCard({ item: x }: { item: Structure }) {
  return (
    <article className="panel stack structure">
      <div className="row between wrap">
        <h2>{x.title}</h2>
        <Tag tone="accent">{x.meaning}</Tag>
      </div>
      <p className="structure-form" lang="ja">{x.form}</p>
      <p className="small">{x.note}</p>
      {x.table && (
        <table className="conj">
          <tbody>
            {x.table.map(([label, ja]) => (
              <tr key={label}>
                <th scope="row"><Ja text={label} /></th>
                <td><Ja text={ja} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ul className="examples">
        {x.examples.map((e) => (
          <li key={e.ja}>
            <div><Ja text={e.ja} /><br /><span className="muted small">{e.ko}</span></div>
            <SpeakButton text={e.ja} small />
          </li>
        ))}
      </ul>
    </article>
  );
}
