// 国家与科技类精灵：印章、王冠、旗帜、蒸汽机车、原子
import { t } from '@/locale';

export function Seal({ label }: { label?: string }) {
  const [a, b] = [...(label ?? t('sprite_seal_text'))];
  return (
    <g className="spr-seal">
      <g className="spr-seal__imprint">
        <rect x="38" y="50" width="44" height="44" rx="3" className="cinnabar-fill rough" />
        <rect x="42" y="54" width="36" height="36" rx="1.5" className="seal-inner" />
        <text x="60" y="70" className="seal-text">
          {a}
        </text>
        <text x="60" y="88" className="seal-text">
          {b}
        </text>
      </g>
      <g className="spr-seal__stone">
        <path d="M40 18 L80 18 L80 46 L40 46 Z" className="stone-fill" />
        <path d="M46 18 C46 8 54 4 60 4 C66 4 74 8 74 18 Z" className="stone-fill" />
        <path d="M52 12 C56 9 64 9 68 12" className="ink-stroke hair paper" />
        <path d="M40 40 L80 40" className="ink-stroke hair paper" />
      </g>
      <g className="spr-seal__dots">
        <circle cx="30" cy="92" r="1.6" className="cinnabar-fill" />
        <circle cx="90" cy="88" r="1.3" className="cinnabar-fill" />
        <circle cx="34" cy="60" r="1.1" className="ink-fill" />
      </g>
    </g>
  );
}

export function Crown() {
  return (
    <g className="spr-crown">
      <g className="spr-crown__rays">
        {[-60, -35, -12, 12, 35, 60].map((a) => (
          <path key={a} d="M0 -30 L0 -44" transform={`translate(60 66) rotate(${a})`} className="ink-stroke hair" />
        ))}
      </g>
      <g className="spr-crown__body">
        <path d="M30 76 L25 42 L44 58 L60 30 L76 58 L95 42 L90 76 Z" className="gold-fill ink-stroke" />
        <path d="M30 76 L90 76 L88 86 L32 86 Z" className="ink-fill" />
        {[
          [25, 42],
          [60, 30],
          [95, 42],
        ].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="3.6" className="cinnabar-fill spr-crown__gem" />
        ))}
        <circle cx="46" cy="81" r="2.2" className="paper-fill" />
        <circle cx="60" cy="81" r="2.6" className="cinnabar-fill" />
        <circle cx="74" cy="81" r="2.2" className="paper-fill" />
      </g>
      <ellipse cx="60" cy="96" rx="30" ry="3.5" className="ink-wash" />
    </g>
  );
}

const FLAG_A = 'M38 22 C52 17 66 28 88 21 L88 51 C66 58 52 46 38 51 Z';
const FLAG_B = 'M38 22 C54 27 68 17 88 26 L88 55 C68 47 54 56 38 51 Z';

export function Flag() {
  return (
    <g className="spr-flag">
      <ellipse cx="44" cy="96" rx="24" ry="3.5" className="ink-wash" />
      <path d={FLAG_A} className="cinnabar-fill">
        <animate attributeName="d" dur="1.8s" repeatCount="indefinite" values={`${FLAG_A};${FLAG_B};${FLAG_A}`} calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" keyTimes="0;0.5;1" />
      </path>
      <path d="M38 16 L38 96" className="ink-stroke pole" />
      <circle cx="38" cy="14" r="3" className="ink-fill" />
    </g>
  );
}

// 蒸汽机车：轮辐旋转，烟囱喷汽
export function Steam() {
  return (
    <g className="spr-steam">
      <g className="spr-steam__puffs">
        <circle cx="90" cy="28" r="6" />
        <circle cx="80" cy="20" r="8" />
        <circle cx="66" cy="14" r="9" />
      </g>
      <path d="M4 92 L116 92" className="ink-stroke thin" />
      {[10, 26, 42, 58, 74, 90, 106].map((x) => (
        <path key={x} d={`M${x} 92 L${x - 3} 96`} className="ink-stroke hair" />
      ))}
      <g className="spr-steam__loco">
        <path d="M34 52 L86 52 L86 74 L34 74 Z" className="ink-fill" />
        <path d="M86 56 L95 56 L95 74 L86 74 Z" className="ink-fill" />
        <path d="M86 54 L84 36 L98 36 L94 54 Z" className="ink-fill" />
        <path d="M82 34 L100 34" className="ink-stroke" />
        <path d="M18 40 L38 40 L38 76 L20 76 Z" className="ink-fill" />
        <rect x="23" y="45" width="10" height="9" className="paper-fill" />
        <path d="M95 74 L102 82 L95 82 Z" className="ink-fill" />
        {[
          [44, 80, 10],
          [68, 80, 10],
          [90, 84, 6],
        ].map(([cx, cy, r]) => (
          <g key={cx} className="spr-steam__wheel" style={{ transformOrigin: `${cx}px ${cy}px` }}>
            <circle cx={cx} cy={cy} r={r} className="paper-fill ink-stroke" />
            <path d={`M${cx - r} ${cy} L${cx + r} ${cy} M${cx} ${cy - r} L${cx} ${cy + r}`} className="ink-stroke hair" />
          </g>
        ))}
        <path d="M44 80 L68 80" className="cinnabar-stroke" />
      </g>
    </g>
  );
}

const ORBIT = 'M20 60 A40 14 0 1 1 100 60 A40 14 0 1 1 20 60';

export function Atom() {
  return (
    <g className="spr-atom">
      {[0, 60, 120].map((a, i) => (
        <g key={a} transform={`rotate(${a} 60 60)`}>
          <path d={ORBIT} className="ink-stroke thin" />
          <circle r="3.2" className={i === 1 ? 'cinnabar-fill' : 'ink-fill'}>
            <animateMotion dur={`${2.4 + i * 0.5}s`} repeatCount="indefinite" path={ORBIT} />
          </circle>
        </g>
      ))}
      <circle cx="57" cy="58" r="5" className="cinnabar-fill" />
      <circle cx="63" cy="61" r="5" className="ink-fill" />
      <circle cx="61" cy="55" r="4" className="ochre-fill" />
    </g>
  );
}
