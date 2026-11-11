// 历史人物及其生平行迹，按时代分文件存放；撰写约定见 docs/content-guide.md
import type { Figure } from '../../types.ts';
import { FIGURES_ANTIQUITY } from './f1_antiquity.ts';
import { FIGURES_CLASSICAL } from './f2_classical.ts';
import { FIGURES_MEDIEVAL } from './f3_medieval.ts';
import { FIGURES_RENAISSANCE } from './f4_renaissance.ts';
import { FIGURES_MODERN_ERA } from './f6_modern.ts';
import { LEGACY_FIGURES } from './legacy.ts';

const REWRITTEN: Figure[] = [...FIGURES_ANTIQUITY, ...FIGURES_CLASSICAL, ...FIGURES_MEDIEVAL, ...FIGURES_RENAISSANCE, ...FIGURES_MODERN_ERA];
const done = new Set(REWRITTEN.map((f) => f.id));

export const FIGURES: Figure[] = [...REWRITTEN, ...LEGACY_FIGURES.filter((f) => !done.has(f.id))].sort((a, b) => a.birth - b.birth);

export const FIGURE_BY_ID = new Map(FIGURES.map((f) => [f.id, f]));
