import InkDefs from '@/modules/common/InkDefs';
import type { SpriteKind } from '@/types';
import InkSprite from './InkSprite';

const KINDS: SpriteKind[] = ['ship', 'horse', 'camel', 'walker', 'rocket', 'battle', 'cannon', 'fire', 'mushroom', 'plague', 'volcano', 'scroll', 'printing', 'temple', 'pyramid', 'wall', 'wreath', 'seal', 'crown', 'flag', 'steam', 'atom'];

// 开发用：精灵图鉴（地址加 ?sprites 打开），逐个检查造型与动画
export default function SpriteGallery() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, padding: 24, background: 'var(--paper)', height: '100%', overflow: 'auto' }}>
      <InkDefs />
      {KINDS.map((k) => (
        <figure key={k} style={{ margin: 0, textAlign: 'center', background: 'var(--paper-light)', boxShadow: '0 0 0 1px rgba(0,0,0,.08)' }}>
          <InkSprite kind={k} size={170} />
          <figcaption style={{ fontSize: 12, color: 'var(--ink-3)' }}>{k}</figcaption>
        </figure>
      ))}
    </div>
  );
}
