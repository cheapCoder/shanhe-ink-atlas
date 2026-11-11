import { Fragment } from 'react';
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
import { useLocale } from '@/locale';
import { usePlayback } from '@/modules/playback/usePlayback';
import { useHotkeys } from '@/modules/playback/useHotkeys';
import { usePanelPadding } from '@/modules/map_view/usePanelPadding';
import { useRoutePainter } from '@/modules/figure_route/useRoutePainter';
import { useTerritoryFraming } from '@/modules/territory/useTerritoryFraming';
import { useUrlState } from '@/modules/share/urlState';
import { useAmbience } from '@/modules/sound/useAmbience';

export default function App() {
  const lang = useLocale((s) => s.lang);
  usePlayback();
  useHotkeys();
  usePanelPadding();
  useRoutePainter();
  useTerritoryFraming();
  useUrlState();
  useAmbience();
  return (
    <div className={`app app--${lang}`}>
      <InkDefs />
      <MapView />
      {/* 切换语言时界面整体重挂，各处文案随之更新；地图引擎不在其内，只换标注 */}
      <Fragment key={lang}>
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
      </Fragment>
    </div>
  );
}
