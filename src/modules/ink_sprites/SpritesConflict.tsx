// 战事与灾异类精灵：交锋、火炮、烈焰、蘑菇云、瘟疫、火山
function Sword() {
  return (
    <g>
      <path d="M0 -2.4 L70 -1 L78 0 L70 1 L0 2.4 Z" className="ink-fill" />
      <path d="M6 0 L66 0" className="ink-stroke hair paper" />
      <path d="M-3 -9 L1 -9 L1 9 L-3 9 Z" className="ink-fill" />
      <path d="M-17 -2.4 L-3 -2.4 L-3 2.4 L-17 2.4 Z" className="ochre-fill ink-stroke hair" />
      <circle cx="-19" cy="0" r="3.2" className="cinnabar-fill" />
    </g>
  );
}

export function Battle() {
  return (
    <g className="spr-battle">
      <ellipse cx="60" cy="96" rx="34" ry="4" className="ink-wash" />
      <g className="spr-battle__a">
        <g transform="translate(20 88) rotate(-40)">
          <Sword />
        </g>
      </g>
      <g className="spr-battle__b">
        <g transform="translate(100 88) rotate(-140) scale(1 -1)">
          <Sword />
        </g>
      </g>
      <g className="spr-battle__burst">
        {[0, 40, 80, 130, 175, 220, 265, 310].map((a) => (
          <path key={a} d="M0 -7 L0 -19" transform={`translate(60 54) rotate(${a})`} className="ink-stroke thin" />
        ))}
        <circle cx="47" cy="44" r="2.6" className="cinnabar-fill" />
        <circle cx="75" cy="41" r="2" className="cinnabar-fill" />
        <circle cx="72" cy="66" r="1.8" className="ink-fill" />
        <circle cx="46" cy="64" r="1.6" className="ink-fill" />
      </g>
    </g>
  );
}

export function Cannon() {
  return (
    <g className="spr-cannon">
      <ellipse cx="54" cy="94" rx="40" ry="4" className="ink-wash" />
      <g className="spr-cannon__smoke">
        <circle cx="100" cy="50" r="6" />
        <circle cx="106" cy="44" r="5" />
        <circle cx="96" cy="42" r="4" />
      </g>
      <path d="M26 82 L70 72 L76 80 L32 90 Z" className="ochre-fill ink-stroke thin" />
      <g className="spr-cannon__barrel">
        <path d="M36 74 L94 52 L98 59 L40 82 Z" className="ink-fill" />
        <path d="M90 53 L95 62" className="ink-stroke paper" />
        <path d="M99 50 L112 45 L104 55 L114 58 L101 59 Z" className="cinnabar-fill spr-cannon__flash" />
      </g>
      <g className="spr-cannon__wheel">
        <circle cx="44" cy="82" r="12" className="ink-stroke" />
        <path d="M44 70 L44 94 M32 82 L56 82 M35.5 73.5 L52.5 90.5 M52.5 73.5 L35.5 90.5" className="ink-stroke hair" />
      </g>
      <path d="M8 52 Q30 26 70 34" className="ink-stroke dotted" />
    </g>
  );
}

const FLAMES = [
  [
    'M42 66 C34 60 36 52 40 46 C40 50 42 52 44 50 C44 46 46 42 46 38 C52 44 54 52 52 58 C54 56 54 54 56 52 C58 58 54 64 42 66 Z',
    'M42 66 C33 60 37 50 39 44 C41 49 43 51 45 48 C45 44 48 40 49 35 C53 43 54 51 51 57 C54 55 55 53 57 50 C59 57 55 64 42 66 Z',
  ],
  [
    'M60 66 C50 60 50 48 56 40 C56 46 60 48 60 44 C60 36 64 30 62 22 C70 30 74 40 70 48 C72 46 74 44 74 40 C80 48 76 60 60 66 Z',
    'M60 66 C48 60 52 48 54 42 C56 46 58 48 60 46 C60 38 66 32 66 24 C72 32 74 42 70 50 C73 47 76 46 76 42 C80 50 74 62 60 66 Z',
  ],
  [
    'M78 66 C86 60 84 52 80 46 C80 50 78 52 76 50 C76 46 74 42 74 38 C68 44 66 52 68 58 C66 56 66 54 64 52 C62 58 66 64 78 66 Z',
    'M78 66 C87 60 83 50 81 44 C79 49 77 51 75 48 C75 44 72 40 71 35 C67 43 66 51 69 57 C66 55 65 53 63 50 C61 57 65 64 78 66 Z',
  ],
];

// 城楼烈焰：火攻、革命、城陷
export function Fire() {
  return (
    <g className="spr-fire">
      <g className="spr-fire__smoke">
        <path d="M44 30 C40 22 48 16 44 8" className="ink-stroke thin" />
        <path d="M66 24 C62 16 70 10 66 2" className="ink-stroke thin" />
      </g>
      <path d="M18 94 L18 68 L102 68 L102 94 Z" className="ink-wash-fill" />
      <path d="M52 94 L52 80 Q60 72 68 80 L68 94 Z" className="paper-fill" />
      <path d="M32 68 L32 56 L88 56 L88 68 Z" className="ink-fill" />
      <path d="M24 57 Q60 44 96 57 L90 52 Q60 40 30 52 Z" className="ink-fill" />
      {FLAMES.map(([a, b], i) => (
        <path key={i} d={a} className={i === 1 ? 'cinnabar-fill' : 'flame-fill'}>
          <animate attributeName="d" dur={`${0.7 + i * 0.15}s`} repeatCount="indefinite" values={`${a};${b};${a}`} />
        </path>
      ))}
    </g>
  );
}

export function Mushroom() {
  return (
    <g className="spr-mushroom">
      <ellipse cx="60" cy="96" rx="20" ry="3" className="spr-mushroom__ring" />
      <path d="M8 96 L112 96" className="ink-stroke hair" />
      <g className="spr-mushroom__cloud">
        <path d="M55 96 C56 80 54 66 52 52 L68 52 C66 66 64 80 65 96 Z" className="ink-wash-fill" />
        <circle cx="60" cy="40" r="20" className="ink-wash-fill dark" />
        <circle cx="44" cy="44" r="13" className="ink-wash-fill" />
        <circle cx="76" cy="44" r="13" className="ink-wash-fill" />
        <circle cx="60" cy="26" r="13" className="ink-wash-fill" />
        <ellipse cx="60" cy="56" rx="24" ry="5" className="ink-wash-fill" />
      </g>
    </g>
  );
}

export function Plague() {
  return (
    <g className="spr-plague">
      <path d="M8 94 L8 74 L18 64 L28 74 L28 94 M30 94 L30 68 L42 56 L54 68 L54 94 M56 94 L56 72 L66 62 L76 72 L76 94 M78 94 L78 64 L90 52 L102 64 L102 94" className="ink-stroke" />
      <path d="M38 94 L38 82 L46 82 L46 94 M86 94 L86 80 L94 80 L94 94" className="ink-fill" />
      {[
        [30, 40, 0],
        [62, 46, 0.6],
        [90, 36, 1.2],
        [48, 22, 1.8],
      ].map(([cx, cy, d]) => (
        <circle key={`${cx}`} cx={cx} cy={cy} r="12" className="spr-plague__blot" style={{ animationDelay: `${d}s` }} />
      ))}
      <g className="spr-plague__crows">
        <path d="M20 20 l5 3 l5 -3 M34 14 l4 2.5 l4 -2.5" className="ink-stroke thin" />
      </g>
    </g>
  );
}

export function Volcano() {
  return (
    <g className="spr-volcano">
      <g className="spr-volcano__plume">
        <circle cx="58" cy="34" r="8" />
        <circle cx="62" cy="30" r="7" />
        <circle cx="56" cy="30" r="6" />
      </g>
      <path d="M6 96 L46 44 Q58 38 70 44 L114 96 Z" className="ink-wash-fill" />
      <path d="M46 44 Q58 38 70 44 L78 54 Q58 50 40 52 Z" className="ink-fill" />
      <ellipse cx="58" cy="42" rx="10" ry="3" className="cinnabar-fill" />
      <path d="M52 46 C50 58 44 66 40 78 M64 46 C68 56 72 62 80 72" className="cinnabar-stroke spr-volcano__lava" />
    </g>
  );
}
