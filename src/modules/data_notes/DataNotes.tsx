import { t, type LocaleKey } from '@/locale';
import { useAtlas } from '@/store/useAtlas';
import { SOURCES, type SourceEntry } from '@/data/sources';
import { useEngine } from '@/modules/map_view/useMapState';
import { formatYear } from '@/utils/year';
import './dataNotes.css';

const GROUPS: { id: SourceEntry['group']; key: LocaleKey }[] = [
  { id: 'borders', key: 'data_borders' },
  { id: 'basemap', key: 'data_basemap' },
  { id: 'content', key: 'data_content' },
  { id: 'images', key: 'data_images' },
];

const OP_LABEL: Record<string, LocaleKey> = {
  rename: 'data_op_rename',
  merge: 'data_op_merge',
  splitByLine: 'data_op_split',
  borrow: 'data_op_borrow',
  claimLand: 'data_op_land',
  transfer: 'data_op_transfer',
  synthetic: 'data_op_synthetic',
};

// 数据说明：来源与许可、处理方法、逐条校勘记与免责声明
export default function DataNotes() {
  const open = useAtlas((s) => s.notesOpen);
  const setNotesOpen = useAtlas((s) => s.setNotesOpen);
  const engine = useEngine();
  if (!open) return null;
  const corrections = engine?.store.corrections ?? [];

  return (
    <div className="notes" role="dialog" aria-modal="true" aria-label={t('data_title')} onClick={() => setNotesOpen(false)}>
      <div className="notes__sheet" onClick={(e) => e.stopPropagation()}>
        <header className="notes__head">
          <h2 className="panel-title">{t('data_title')}</h2>
          <button className="ink-button ink-button--ghost" onClick={() => setNotesOpen(false)}>
            {t('data_close')}
          </button>
        </header>
        <p className="notes__disclaimer">{t('data_disclaimer')}</p>
        <div className="notes__grid">
          {GROUPS.map((g) => (
            <section key={g.id}>
              <h3 className="panel-section">{t(g.key)}</h3>
              {SOURCES.filter((s) => s.group === g.id).map((s) => (
                <div key={s.name} className="notes__source">
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.name}
                  </a>
                  <span className="notes__license">{s.license}</span>
                  <p>{s.detail}</p>
                </div>
              ))}
            </section>
          ))}
        </div>
        <h3 className="panel-section">
          {t('data_corrections')}
          <span className="notes__count">{corrections.length}</span>
        </h3>
        <table className="notes__table">
          <thead>
            <tr>
              <th>{t('data_col_year')}</th>
              <th>{t('data_col_op')}</th>
              <th>{t('data_col_change')}</th>
              <th>{t('data_method')}</th>
              <th>{t('data_source')}</th>
            </tr>
          </thead>
          <tbody>
            {corrections.map((c, i) => (
              <tr key={i}>
                <td>{formatYear(c.year)}</td>
                <td>{OP_LABEL[c.op] ? t(OP_LABEL[c.op]) : c.op}</td>
                <td>
                  {c.target} → {c.result}
                </td>
                <td>{c.note}</td>
                <td>
                  <a href={c.source} target="_blank" rel="noreferrer">
                    {t('data_wiki')}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
