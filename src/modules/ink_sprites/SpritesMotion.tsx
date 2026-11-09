// 行旅类精灵：帆船、奔马、骆驼、负笈行者、火箭。坐标系统一为 120×120
import { useId } from 'react';

const WAVE = 'q5 -4 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0';

export function Ship() {
  const clip = `ship-clip-${useId().replace(/:/g, '')}`;
  return (
    <g className="spr-ship">
      <clipPath id={clip}>
        <rect x="4" y="80" width="112" height="30" />
      </clipPath>
      <ellipse cx="60" cy="95" rx="46" ry="5" className="ink-wash" />
      <g className="spr-ship__boat">
        <path d="M12 74 Q22 72 30 77 L92 77 Q101 72 109 67 L101 85 Q62 97 24 88 Z" className="ink-fill" />
        <path d="M30 77 L92 77" className="ink-stroke hair" />
        <path d="M50 77 L49 21" className="ink-stroke" />
        <path d="M76 77 L76 33" className="ink-stroke" />
        <path d="M49 23 Q66 25 72 30 L71 73 L49 73 Z" className="sail" />
        {[33, 43, 53, 63].map((y) => (
          <path key={y} d={`M49 ${y} L71.6 ${y + 1.4}`} className="ink-stroke hair" />
        ))}
        <path d="M76 35 Q88 37 94 41 L93 71 L76 71 Z" className="sail" />
        {[45, 54, 63].map((y) => (
          <path key={y} d={`M76 ${y} L93.4 ${y + 1}`} className="ink-stroke hair" />
        ))}
        <path d="M49 21 L61 17 L49 13 Z" className="cinnabar-fill">
          <animate attributeName="d" dur="1.1s" repeatCount="indefinite" values="M49 21 L61 17 L49 13 Z;M49 21 L60 19.5 L49 14 Z;M49 21 L61 17 L49 13 Z" />
        </path>
      </g>
      <g clipPath={`url(#${clip})`}>
        <g className="spr-ship__waves">
          <path d={`M-20 92 ${WAVE}`} className="ink-stroke wave" />
          <path d={`M-14 101 ${WAVE}`} className="ink-stroke wave faint" />
        </g>
      </g>
    </g>
  );
}

export function Horse() {
  return (
    <g className="spr-horse">
      <ellipse cx="60" cy="92" rx="40" ry="4" className="ink-wash" />
      <g className="spr-horse__dust">
        <circle cx="22" cy="84" r="4" />
        <circle cx="12" cy="80" r="3" />
        <circle cx="30" cy="88" r="2.5" />
      </g>
      <g className="spr-horse__body">
        <path d="M31 56 C24 54 19 58 16 66 C15 69 17 70 18 67 C21 61 25 59 31 59 Z" className="ink-fill" />
        <g className="spr-horse__legs-a">
          <path d="M84 60 L92 70 L99 76 M80 64 L84 74 L82 82 M40 64 L30 72 L23 76 M46 66 L44 76 L40 83" className="ink-stroke leg" />
        </g>
        <g className="spr-horse__legs-b">
          <path d="M84 60 L86 70 L80 77 M80 64 L76 74 L78 82 M40 64 L44 74 L50 79 M46 66 L52 74 L58 80" className="ink-stroke leg" />
        </g>
        <path d="M30 58 C34 50 46 47 58 48 C66 48.5 72 47 78 44 C82 40 85 34 89 30 C91 28 95 27 98 28 L104 31 C105 33 103 35 100 35 C98 36 96 38 95 41 C93 47 90 52 86 56 C84 62 80 66 72 67 C62 69 50 69 42 67 C36 66 31 63 30 58 Z" className="ink-fill" />
        <path d="M95 28 L97 22 L99 28 Z" className="ink-fill" />
        <path d="M79 43 C82 38 84 34 88 30 M76 45 C78 41 80 38 83 35" className="ink-stroke hair paper" />
        <path d="M58 47 L61 56 L57 61" className="ink-stroke" />
        <path d="M58 48 C60 42 62 37 63 32" className="ink-stroke torso" />
        <circle cx="64" cy="27.5" r="3.8" className="ink-fill" />
        <path d="M62 37 L70 6" className="ink-stroke thin" />
        <path d="M70 6 L84 10 L70 16 Z" className="cinnabar-fill">
          <animate attributeName="d" dur="0.9s" repeatCount="indefinite" values="M70 6 L84 10 L70 16 Z;M70 6 L83 12 L70 16 Z;M70 6 L84 10 L70 16 Z" />
        </path>
      </g>
    </g>
  );
}

export function Camel() {
  return (
    <g className="spr-camel">
      <path d="M0 93 Q30 85 60 93 T120 93" className="ink-stroke hair" />
      <g className="spr-camel__body">
        <g className="spr-camel__legs-a">
          <path d="M80 58 L82 74 L80 87 M75 60 L73 74 L75 87 M36 61 L34 74 L36 87 M42 62 L44 74 L42 87" className="ink-stroke leg" />
        </g>
        <g className="spr-camel__legs-b">
          <path d="M80 58 L78 74 L82 87 M75 60 L77 74 L72 87 M36 61 L38 74 L33 87 M42 62 L40 74 L46 87" className="ink-stroke leg" />
        </g>
        <path d="M26 60 C26 50 32 44 40 44 C44 36 50 34 54 40 C58 36 64 36 68 42 C72 44 76 46 80 44 C84 40 86 34 88 30 C89 27 92 26 95 27 L100 29 C101 31 99 33 96 33 C94 36 92 42 90 48 C88 54 84 58 76 60 C66 62 46 63 36 63 C30 63 26 62 26 60 Z" className="ink-fill" />
        <path d="M44 50 L48 66 L58 66 L56 50 Z" className="ochre-fill" />
        <path d="M54 39 L55 29" className="ink-stroke torso" />
        <circle cx="55.6" cy="25.5" r="3.4" className="ink-fill" />
        <path d="M51.5 23.5 Q55.6 19.5 59.6 23.5" className="ink-stroke thin" />
      </g>
    </g>
  );
}

// 仿《玄奘负笈图》：斗笠、负笈、执杖的行脚僧
export function Walker() {
  return (
    <g className="spr-walker">
      <ellipse cx="56" cy="92" rx="30" ry="3.5" className="ink-wash" />
      <g className="spr-walker__steps">
        <ellipse cx="22" cy="92" rx="3" ry="1.2" />
        <ellipse cx="32" cy="94" rx="3" ry="1.2" />
        <ellipse cx="42" cy="92" rx="3" ry="1.2" />
      </g>
      <g className="spr-walker__body">
        <path d="M62 26 L77 24 L80 70 L65 72 Z" className="ink-stroke thin ochre-fill" />
        {[36, 46, 56, 64].map((y) => (
          <path key={y} d={`M63.5 ${y} L79 ${y - 1.6}`} className="ink-stroke hair" />
        ))}
        <path d="M56 22 C64 14 78 14 88 21" className="ink-stroke" />
        <path d="M86 21 L86 28" className="ink-stroke hair" />
        <circle cx="86" cy="30" r="1.8" className="cinnabar-fill" />
        <path d="M49 44 C45 56 43 70 41 86 L67 86 C65 70 63 56 61 44 Z" className="robe" />
        <path d="M52 47 C50 60 49 72 48 85 M58 47 C59 60 60 72 61 85" className="ink-stroke hair" />
        <path d="M44 29 L64 29 L54 22 Z" className="ink-fill" />
        <circle cx="54" cy="35" r="5" className="ink-fill" />
        <g className="spr-walker__staff">
          <path d="M47 52 L33 92" className="ink-stroke" />
        </g>
        <g className="spr-walker__feet-a">
          <path d="M45 86 L41 90 M62 86 L66 90" className="ink-stroke thin" />
        </g>
        <g className="spr-walker__feet-b">
          <path d="M45 86 L48 90 M62 86 L59 90" className="ink-stroke thin" />
        </g>
      </g>
    </g>
  );
}

export function Rocket() {
  return (
    <g className="spr-rocket">
      <g className="spr-rocket__smoke">
        <circle cx="44" cy="96" r="9" />
        <circle cx="62" cy="99" r="11" />
        <circle cx="80" cy="96" r="8" />
      </g>
      <g className="spr-rocket__ship">
        <path d="M58 80 C59 90 61 96 62 104 C63 96 65 90 66 80 Z" className="cinnabar-fill spr-rocket__flame" />
        <path d="M56 22 C58 12 66 12 68 22 L68 76 L56 76 Z" className="paper-fill ink-stroke thin" />
        <path d="M56 34 L68 34 M56 52 L68 52 M56 66 L68 66" className="ink-stroke hair" />
        <path d="M56 22 C58 12 66 12 68 22 Z" className="ink-fill" />
        <path d="M56 64 L47 80 L56 77 Z M68 64 L77 80 L68 77 Z" className="ink-fill" />
        <path d="M58 76 L66 76 L64 81 L60 81 Z" className="ink-fill" />
      </g>
    </g>
  );
}
