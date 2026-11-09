// 开篇的水墨远山：三层山影由远及近、由淡及浓，山腰以留白作云雾
const LAYERS = [
  { d: 'M0 300 C120 210 200 250 290 190 C360 150 420 200 500 170 C600 130 660 200 760 160 C860 120 930 190 1040 150 C1120 120 1200 170 1280 150 L1280 420 L0 420 Z', fill: 'rgba(40, 36, 30, 0.08)', delay: 0 },
  { d: 'M0 330 C80 280 160 300 230 250 C290 210 350 260 420 240 C520 210 560 280 660 250 C740 225 800 270 880 240 C980 200 1040 270 1140 245 C1200 230 1240 250 1280 240 L1280 420 L0 420 Z', fill: 'rgba(40, 36, 30, 0.14)', delay: 0.3 },
  { d: 'M0 380 C70 340 140 360 210 330 C300 290 340 350 430 330 C520 310 580 360 680 340 C780 318 840 370 930 350 C1030 326 1100 372 1180 352 C1230 340 1260 350 1280 348 L1280 420 L0 420 Z', fill: 'rgba(30, 27, 23, 0.26)', delay: 0.6 },
];

export default function InkMountains() {
  return (
    <svg className="intro__mountains" viewBox="0 0 1280 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="intro-mist" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4ecdb" stopOpacity="0" />
          <stop offset="0.55" stopColor="#f4ecdb" stopOpacity="0.85" />
          <stop offset="1" stopColor="#f4ecdb" stopOpacity="0" />
        </linearGradient>
      </defs>
      {LAYERS.map((l, i) => (
        <path key={i} d={l.d} fill={l.fill} filter="url(#ink-bleed)" className="intro__ridge" style={{ animationDelay: `${l.delay}s` }} />
      ))}
      <rect x="-120" y="250" width="1520" height="90" fill="url(#intro-mist)" className="intro__mist" />
      <circle cx="1040" cy="150" r="30" fill="rgba(178, 58, 43, 0.75)" filter="url(#ink-bleed)" className="intro__sun" />
    </svg>
  );
}
