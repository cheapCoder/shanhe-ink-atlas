import { useAtlas } from '@/store/useAtlas';
import { formatYearShort } from '@/utils/year';
import { yearToT } from './timeScale';

// 游标单独订阅年份，播放时只有它逐帧重绘
export default function TimelineCursor() {
  const year = useAtlas((s) => s.year);
  return (
    <div className="timeline__cursor" style={{ left: `${(yearToT(year) * 100).toFixed(3)}%` }}>
      <span className="timeline__knob seal">{formatYearShort(year)}</span>
    </div>
  );
}
