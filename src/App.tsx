import MapView from '@/modules/map_view/MapView';
import InkDefs from '@/modules/common/InkDefs';
import TitleSeal from '@/modules/title_bar/TitleSeal';
import YearBanner from '@/modules/title_bar/YearBanner';
import ModeTabs from '@/modules/title_bar/ModeTabs';
import Timeline from '@/modules/time_line/Timeline';
import SidePanel from '@/modules/side_panel/SidePanel';
import DetailPanel from '@/modules/detail_panel/DetailPanel';
import MapOverlay from '@/modules/map_overlay/MapOverlay';
import HoverTip from '@/modules/map_overlay/HoverTip';
import MapControls from '@/modules/map_overlay/MapControls';
import IntroScreen from '@/modules/intro/IntroScreen';
import DataNotes from '@/modules/data_notes/DataNotes';
import { usePlayback } from '@/modules/playback/usePlayback';
import { useHotkeys } from '@/modules/playback/useHotkeys';
import { usePanelPadding } from '@/modules/map_view/usePanelPadding';
import { useRoutePainter } from '@/modules/figure_route/useRoutePainter';
import { useTerritoryFraming } from '@/modules/territory/useTerritoryFraming';

export default function App() {
  usePlayback();
  useHotkeys();
  usePanelPadding();
  useRoutePainter();
  useTerritoryFraming();
  return (
    <div className="app">
      <InkDefs />
      <MapView />
      <MapOverlay />
      <HoverTip />
      <TitleSeal />
      <YearBanner />
      <ModeTabs />
      <SidePanel />
      <DetailPanel />
      <MapControls />
      <Timeline />
      <DataNotes />
      <IntroScreen />
    </div>
  );
}
