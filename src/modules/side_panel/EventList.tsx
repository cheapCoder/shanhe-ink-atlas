import { useMemo, useState } from 'react';
import { t } from '@/locale';
import type { EventCategory } from '@/types';
import { useAtlas } from '@/store/useAtlas';
import { EVENTS } from '@/data/events';
import { formatYear } from '@/utils/year';
import { CATEGORIES } from '@/modules/common/categories';
import { presentEvent } from '@/modules/playback/usePlayback';
import './sidePanel.css';

const ORDERED = [...EVENTS].sort((a, b) => a.year - b.year);

// 纪事列表：关键字检索 + 类别筛选，点选即飞往事件发生地
export default function EventList() {
  const eventId = useAtlas((s) => s.eventId);
  const setPlaying = useAtlas((s) => s.setPlaying);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<EventCategory | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ORDERED.filter((e) => {
      if (category && e.category !== category) return false;
      if (!q) return true;
      return [e.title, e.titleEn, e.place, e.summary].some((s) => s.toLowerCase().includes(q));
    });
  }, [query, category]);

  return (
    <section className="side-list">
      <h2 className="panel-section side-list__title">
        {t('mode_events')}
        <span className="side-list__count">
          {list.length} {t('events_count')}
        </span>
      </h2>
      <input className="side-list__search" type="search" placeholder={t('events_search')} value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="side-list__filters">
        <button className={category === null ? 'is-active' : ''} onClick={() => setCategory(null)}>
          {t('events_all')}
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.id} className={category === c.id ? 'is-active' : ''} onClick={() => setCategory(c.id)}>
            {t(c.key)}
          </button>
        ))}
      </div>
      {list.length === 0 && <p className="side-list__empty">{t('events_empty')}</p>}
      <ul className="event-list">
        {list.map((e) => (
          <li key={e.id}>
            <button
              className={`event-list__item${e.id === eventId ? ' is-active' : ''}`}
              onClick={() => {
                setPlaying(false);
                presentEvent(e, false);
              }}
            >
              <span className={`event-list__dot is-${e.importance}`} />
              <span className="event-list__year">
                {e.approx ? t('year_approx') : ''}
                {formatYear(e.year)}
              </span>
              <span className="event-list__title">{e.title}</span>
              <span className="event-list__place">{e.place}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
