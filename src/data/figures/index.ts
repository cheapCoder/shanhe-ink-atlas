import type { Figure } from '../../types.ts';
import { ANCIENT_FIGURES } from './ancient.ts';
import { MODERN_FIGURES } from './modern.ts';

export const FIGURES: Figure[] = [...ANCIENT_FIGURES, ...MODERN_FIGURES].sort((a, b) => a.birth - b.birth);

export const FIGURE_BY_ID = new Map(FIGURES.map((f) => [f.id, f]));
