// 政权设色：相邻不同色，同一国家谱系的历代本体沿用同一颜料。主线程与代理纹理线程共用，结果一致
import { assignColors } from './palette';
import { familyColor } from '@/modules/territory/lineage';

export function politicalColors(polities: { name: string; area: number }[], neighbors: number[][], snapshotYear: number): number[] {
  return assignColors(
    polities.map((p) => p.name),
    polities.map((p) => p.area),
    neighbors,
    (name) => familyColor(name, snapshotYear),
  );
}
