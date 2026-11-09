// 谱系查询：某切片年份的谱系成员、政权的高亮级别、家族色与疆域面积序列
import type { Lineage, LineageMember } from '@/types';
import { DEPENDENT_PATTERNS, LINEAGES } from '@/data/lineages';
import { PIGMENTS } from '@/modules/map_view/engine/palette';

export type Level = 0 | 1 | 2;

export function memberAt(lineage: Lineage, snapshotYear: number): LineageMember | null {
  return lineage.members.find((m) => snapshotYear >= m.from && snapshotYear <= m.to) ?? null;
}

export function levelOf(lineage: Lineage, name: string, subj: string | undefined, snapshotYear: number): Level {
  const m = memberAt(lineage, snapshotYear);
  if (!m) return 0;
  if (m.names.includes(name)) return 1;
  if (m.related?.includes(name)) return 2;
  if (m.dependents) {
    if (subj && m.names.includes(subj)) return 2;
    if (DEPENDENT_PATTERNS[lineage.id]?.test(name)) return 2;
  }
  return 0;
}

const pigmentOf = (hex: string) => {
  const i = (PIGMENTS as readonly string[]).indexOf(hex);
  return i >= 0 ? i : null;
};

// 家族色：同一谱系的历代本体政权沿用同一颜料，便于在纵览中辨认延续
export function familyColor(name: string, snapshotYear: number): number | null {
  for (const l of LINEAGES) {
    const m = memberAt(l, snapshotYear);
    if (m?.names.includes(name)) return pigmentOf(l.color);
  }
  return null;
}

export interface AreaPoint {
  year: number;
  core: number;
  related: number;
  label: string;
}

export function areaSeries(lineage: Lineage, areas: Record<string, [number, number][]>, snapshotYears: number[]): AreaPoint[] {
  const at = (name: string, year: number) => areas[name]?.find(([y]) => y === year)?.[1] ?? 0;
  const points: AreaPoint[] = [];
  for (const year of snapshotYears) {
    const m = memberAt(lineage, year);
    if (!m) continue;
    const core = m.names.reduce((s, n) => s + at(n, year), 0);
    const related = (m.related ?? []).reduce((s, n) => s + at(n, year), 0);
    if (core > 0) points.push({ year, core, related, label: m.label });
  }
  return points;
}

export function lineageSpan(lineage: Lineage): [number, number] {
  return [lineage.members[0].from, lineage.members[lineage.members.length - 1].to];
}

// 谱系在现有切片中的全部时期（切片年份）
export function lineagePeriods(lineage: Lineage, snapshotYears: number[]): number[] {
  return snapshotYears.filter((y) => memberAt(lineage, y));
}
