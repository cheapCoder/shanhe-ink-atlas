// 文化类精灵：卷轴、印刷、宝塔、金字塔、长城、橄榄冠
import { useId } from 'react';

const COLUMNS = [86, 78, 70, 62, 54, 46];

export function Scroll() {
  const clip = `scroll-clip-${useId().replace(/:/g, '')}`;
  return (
    <g className="spr-scroll">
      <ellipse cx="60" cy="94" rx="40" ry="3.5" className="ink-wash" />
      <clipPath id={clip}>
        <rect x="22" y="30" height="60" width="0">
          <animate attributeName="width" from="0" to="76" dur="1.3s" fill="freeze" calcMode="spline" keySplines="0.22 0.61 0.36 1" keyTimes="0;1" />
        </rect>
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect x="22" y="34" width="76" height="52" className="scroll-paper" />
        {COLUMNS.map((x, i) => (
          <path key={x} d={`M${x} 40 L${x} ${70 + (i % 3) * 5}`} className="ink-stroke calli" style={{ animationDelay: `${1.3 + i * 0.22}s` }} />
        ))}
        <rect x="27" y="72" width="9" height="9" className="cinnabar-fill spr-scroll__seal" />
      </g>
      <rect x="17" y="30" width="6" height="60" rx="2" className="rod" />
      <g>
        <animateTransform attributeName="transform" type="translate" from="0 0" to="76 0" dur="1.3s" fill="freeze" calcMode="spline" keySplines="0.22 0.61 0.36 1" keyTimes="0;1" />
        <rect x="20" y="30" width="6" height="60" rx="2" className="rod" />
      </g>
    </g>
  );
}

export function Printing() {
  return (
    <g className="spr-printing">
      <path d="M26 94 L26 18 M94 94 L94 18 M20 18 L100 18 M20 94 L100 94" className="ink-stroke" />
      <path d="M60 18 L60 34" className="ink-stroke thin" />
      <path d="M52 22 L68 22 M52 28 L68 28" className="ink-stroke hair" />
      <g className="spr-printing__platen">
        <path d="M36 34 L84 34 L84 44 L36 44 Z" className="ochre-fill ink-stroke thin" />
      </g>
      <rect x="34" y="70" width="52" height="16" className="scroll-paper" />
      <g className="spr-printing__lines">
        <path d="M38 75 L80 75 M38 79 L76 79 M38 83 L70 83" className="ink-stroke hair" />
      </g>
      <path d="M30 86 L90 86 L90 90 L30 90 Z" className="ink-fill" />
    </g>
  );
}

// 宝塔与穹顶：佛塔、陵寝、神庙等宗教与纪念建筑的通称
export function Temple() {
  return (
    <g className="spr-temple">
      <circle cx="60" cy="60" r="34" className="spr-temple__halo" />
      <path d="M16 94 L104 94 L98 86 L22 86 Z" className="ink-fill" />
      <path d="M34 86 C34 60 86 60 86 86 Z" className="ink-wash-fill" />
      <path d="M34 86 C34 60 86 60 86 86" className="ink-stroke" />
      <path d="M55 64 L65 64 L65 58 L55 58 Z" className="ink-fill" />
      <path d="M60 58 L60 28" className="ink-stroke" />
      <path d="M53 50 L67 50 M54.5 44 L65.5 44 M56 38 L64 38 M57.5 33 L62.5 33" className="ink-stroke thin" />
      <path d="M22 86 L22 58 L26 54 L30 58 L30 86 M90 86 L90 58 L94 54 L98 58 L98 86" className="ink-stroke thin" />
      <path d="M60 28 L72 31 L60 34 Z" className="cinnabar-fill">
        <animate attributeName="d" dur="1.3s" repeatCount="indefinite" values="M60 28 L72 31 L60 34 Z;M60 28 L71 33 L60 34 Z;M60 28 L72 31 L60 34 Z" />
      </path>
      <g className="spr-temple__smoke">
        <path d="M48 84 C44 76 50 70 46 62" className="ink-stroke hair" />
        <path d="M72 84 C76 76 70 70 74 62" className="ink-stroke hair" />
      </g>
    </g>
  );
}

export function Pyramid() {
  return (
    <g className="spr-pyramid">
      <g className="spr-pyramid__sun">
        <circle cx="84" cy="34" r="16" className="sun-halo" />
        <circle cx="84" cy="34" r="10" className="cinnabar-fill" />
      </g>
      <path d="M18 94 L52 44 L86 94 Z" className="ink-wash-fill" />
      <path d="M52 44 L86 94 L62 94 Z" className="ink-fill soft" />
      <path d="M72 94 L90 66 L108 94 Z" className="ink-wash-fill" />
      <path d="M90 66 L108 94 L96 94 Z" className="ink-fill soft" />
      <path d="M2 94 L12 80 L22 94 Z" className="ink-wash-fill" />
      <path d="M0 94 L120 94" className="ink-stroke thin" />
      <path d="M8 100 Q40 96 70 100 T120 100" className="ink-stroke hair" />
    </g>
  );
}

export function Wall() {
  return (
    <g className="spr-wall">
      <path d="M0 84 Q18 62 36 72 T72 60 T120 70 L120 100 L0 100 Z" className="ink-wash-fill light" />
      <path d="M0 92 Q24 76 46 86 T92 78 T120 84" className="ink-stroke hair" />
      <path d="M4 80 L20 70 L34 74 L50 62 L66 66 L80 55 L96 61 L116 56" className="ink-stroke wall-body" pathLength="100" />
      <path d="M4 76 L20 66 L34 70 L50 58 L66 62 L80 51 L96 57 L116 52" className="ink-stroke wall-merlons" pathLength="100" />
      <g className="spr-wall__tower" style={{ animationDelay: '1s' }}>
        <path d="M46 62 L46 50 L55 50 L55 62 Z" className="ink-fill" />
        <path d="M43 51 Q50.5 45 58 51 Z" className="ink-fill" />
      </g>
      <g className="spr-wall__tower" style={{ animationDelay: '1.6s' }}>
        <path d="M76 55 L76 43 L85 43 L85 55 Z" className="ink-fill" />
        <path d="M73 44 Q80.5 38 88 44 Z" className="ink-fill" />
      </g>
    </g>
  );
}

const LEAVES = Array.from({ length: 7 }, (_, i) => i);

// 橄榄冠：古代奥运会优胜者的桂冠
export function Wreath() {
  return (
    <g className="spr-wreath">
      {[1, -1].map((side) => (
        <g key={side} transform={side === 1 ? undefined : 'translate(120 0) scale(-1 1)'}>
          <path d="M58 92 C34 84 26 60 38 30" className="ink-stroke thin" />
          {LEAVES.map((i) => {
            const t = i / 6;
            const x = 58 - 22 * Math.sin(t * 2.2) - t * 4;
            const y = 90 - t * 58;
            return (
              <ellipse key={i} cx={x} cy={y} rx="7" ry="3" transform={`rotate(${-50 - t * 40} ${x} ${y})`} className="leaf" style={{ animationDelay: `${i * 0.12}s` }} />
            );
          })}
        </g>
      ))}
      <path d="M52 92 L60 86 L68 92 L64 100 L60 94 L56 100 Z" className="cinnabar-fill" />
    </g>
  );
}
