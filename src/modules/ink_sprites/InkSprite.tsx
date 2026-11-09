import { memo, type JSX } from 'react';
import type { SpriteKind } from '@/types';
import { Camel, Horse, Rocket, Ship, Walker } from './SpritesMotion';
import { Battle, Cannon, Fire, Mushroom, Plague, Volcano } from './SpritesConflict';
import { Printing, Pyramid, Scroll, Temple, Wall, Wreath } from './SpritesCulture';
import { Atom, Crown, Flag, Seal, Steam } from './SpritesState';
import './sprites.css';

const SPRITES: Record<SpriteKind, (props: { label?: string }) => JSX.Element> = {
  ship: Ship,
  horse: Horse,
  camel: Camel,
  walker: Walker,
  rocket: Rocket,
  battle: Battle,
  cannon: Cannon,
  fire: Fire,
  mushroom: Mushroom,
  plague: Plague,
  volcano: Volcano,
  scroll: Scroll,
  printing: Printing,
  temple: Temple,
  pyramid: Pyramid,
  wall: Wall,
  wreath: Wreath,
  seal: Seal,
  crown: Crown,
  flag: Flag,
  steam: Steam,
  atom: Atom,
};

interface Props {
  kind: SpriteKind;
  size?: number;
  label?: string;
}

// 水墨动画精灵：入场时墨迹由虚到实洇开，之后按各自的动作循环
function InkSprite({ kind, size = 120, label }: Props) {
  const Sprite = SPRITES[kind] ?? Scroll;
  return (
    <svg className={`ink-sprite ink-sprite--${kind}`} viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
      <g filter="url(#ink-brush)">
        <Sprite label={label} />
      </g>
    </svg>
  );
}

// 精灵是静态 SVG，所在印记随地图逐帧移动时无需重建
export default memo(InkSprite);
