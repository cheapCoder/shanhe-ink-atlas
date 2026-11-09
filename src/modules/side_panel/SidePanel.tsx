import { useAtlas } from '@/store/useAtlas';
import ScrollPanel from '@/modules/common/ScrollPanel';
import CountryList from '@/modules/territory/CountryList';
import FigureList from './FigureList';
import EventList from './EventList';

// 左侧挂轴：疆域、人物、纪事三种模式各自的检索列表；纵览模式不占画面
export default function SidePanel() {
  const mode = useAtlas((s) => s.mode);
  const open = useAtlas((s) => s.panelOpen);
  const setPanelOpen = useAtlas((s) => s.setPanelOpen);
  if (mode === 'overview' || !open) return null;
  return (
    <ScrollPanel key={mode} side="left" label={mode} onClose={() => setPanelOpen(false)}>
      {mode === 'territory' && <CountryList />}
      {mode === 'figure' && <FigureList />}
      {mode === 'events' && <EventList />}
    </ScrollPanel>
  );
}
