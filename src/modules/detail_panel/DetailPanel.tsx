import { t, tx } from '@/locale';
import { useAtlas } from '@/store/useAtlas';
import { EVENT_BY_ID } from '@/data/events';
import { FIGURE_BY_ID } from '@/data/figures';
import { LINEAGE_BY_ID } from '@/data/lineages';
import ScrollPanel from '@/modules/common/ScrollPanel';
import CountryCard from '@/modules/territory/CountryCard';
import EventCard from './EventCard';
import FigureCard from './FigureCard';

// 右侧挂轴：按模式展示大事、人物或疆域详情
export default function DetailPanel() {
  const mode = useAtlas((s) => s.mode);
  const eventId = useAtlas((s) => s.eventId);
  const figureId = useAtlas((s) => s.figureId);
  const lineageId = useAtlas((s) => s.lineageId);
  const { openEvent, openFigure, openLineage } = useAtlas.getState();

  const figure = mode === 'figure' && figureId ? FIGURE_BY_ID.get(figureId) : null;
  const lineage = mode === 'territory' && lineageId ? LINEAGE_BY_ID.get(lineageId) : null;
  const event = !figure && !lineage && eventId ? EVENT_BY_ID.get(eventId) : null;

  if (figure) {
    return (
      <ScrollPanel key={figure.id} side="right" label={tx(figure.name)} onClose={() => openFigure(null)} holdWhileReading>
        <FigureCard figure={figure} />
      </ScrollPanel>
    );
  }
  if (lineage) {
    return (
      <ScrollPanel key={lineage.id} side="right" label={tx(lineage.name)} onClose={() => openLineage(null)}>
        <CountryCard lineage={lineage} />
      </ScrollPanel>
    );
  }
  if (event) {
    return (
      <ScrollPanel key={event.id} side="right" label={tx(event.title)} onClose={() => openEvent(null)} holdWhileReading>
        <EventCard event={event} />
      </ScrollPanel>
    );
  }
  return mode === 'figure' || mode === 'territory' ? (
    <ScrollPanel side="right" label={t('panel_close')}>
      <p className="detail-hint">{mode === 'figure' ? t('panel_hint_figure') : t('panel_hint_country')}</p>
    </ScrollPanel>
  ) : null;
}
