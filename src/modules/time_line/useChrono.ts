import { useAtlas } from '@/store/useAtlas';
import { FIGURE_BY_ID } from '@/data/figures';
import { CHRONOLOGIES } from '@/data/chronology';

// 时间轴第二行与顶部纪年显示哪一国的年表：
// 疆域模式随所选国家，人物模式随人物所属的国家，其余情况用读者自己挑选的一国
export function useChrono(): { id: string; auto: boolean } {
  const mode = useAtlas((s) => s.mode);
  const lineageId = useAtlas((s) => s.lineageId);
  const figureId = useAtlas((s) => s.figureId);
  const picked = useAtlas((s) => s.chronoId);
  if (mode === 'territory' && lineageId && CHRONOLOGIES[lineageId]) return { id: lineageId, auto: true };
  const figureLineage = mode === 'figure' && figureId ? FIGURE_BY_ID.get(figureId)?.lineage : undefined;
  if (figureLineage && CHRONOLOGIES[figureLineage]) return { id: figureLineage, auto: true };
  return { id: CHRONOLOGIES[picked] ? picked : 'china', auto: false };
}
