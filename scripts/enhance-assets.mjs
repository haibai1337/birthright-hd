import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

// Historical M1D-0 studies. M1D-0B rejects complex-material redraws in restorations.json.
// Current raster review: node scripts/review-restorations.mjs. Originals are never written.
const sourceRoot = path.resolve('reference/assets');
const output = path.join(sourceRoot, 'enhanced');
const original = JSON.parse(readFileSync(path.join(sourceRoot, 'manifest.json'), 'utf8'));
const assets = {};
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const put = (file, content) => {
  const target = path.resolve(output, file);
  if (!target.startsWith(output + path.sep)) throw Error('Output outside enhanced directory');
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
};
const bitmap = (id) => {
  const asset = original.assets[id];
  if (!asset) throw Error('Missing original asset ' + id);
  return { ...asset, bytes: readFileSync(path.join(sourceRoot, asset.file)) };
};
const pngData = (id) => 'data:image/png;base64,' + bitmap(id).bytes.toString('base64');

const defs = `<defs>
 <linearGradient id="gold" x2=".3" y2="1"><stop stop-color="#fff0ac"/><stop offset=".23" stop-color="#e7ba48"/><stop offset=".48" stop-color="#936221"/><stop offset=".65" stop-color="#f6d978"/><stop offset="1" stop-color="#714317"/></linearGradient>
 <linearGradient id="steel" x2=".3" y2="1"><stop stop-color="#e9eaeb"/><stop offset=".3" stop-color="#8c979e"/><stop offset=".55" stop-color="#3c464f"/><stop offset=".8" stop-color="#abb0b3"/><stop offset="1" stop-color="#41464b"/></linearGradient>
 <linearGradient id="paper" x2=".2" y2="1"><stop stop-color="#ead5ae"/><stop offset=".45" stop-color="#e1c598"/><stop offset="1" stop-color="#b99768"/></linearGradient>
 <linearGradient id="wood" x2="0" y2="1"><stop stop-color="#775839"/><stop offset=".23" stop-color="#4f3623"/><stop offset=".62" stop-color="#5a412b"/><stop offset="1" stop-color="#261d16"/></linearGradient>
 <linearGradient id="stone" x2=".65" y2="1"><stop stop-color="#b0afad"/><stop offset=".45" stop-color="#878987"/><stop offset="1" stop-color="#a2a2a0"/></linearGradient>
 <linearGradient id="purple" x2="1" y2="1"><stop stop-color="#a443bf"/><stop offset=".5" stop-color="#622c86"/><stop offset="1" stop-color="#3c235d"/></linearGradient>
 <linearGradient id="blue" x2="1" y2="1"><stop stop-color="#647fc7"/><stop offset=".5" stop-color="#304f9c"/><stop offset="1" stop-color="#243763"/></linearGradient>
 <radialGradient id="olive"><stop stop-color="#c1ad4c"/><stop offset="1" stop-color="#64581d"/></radialGradient>
 <filter id="stone-texture" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".018 .029" numOctaves="4" seed="17" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="table" tableValues=".26 .38 .54 .62 .46 .58 .69 .75"/><feFuncG type="table" tableValues=".28 .40 .55 .63 .48 .59 .70 .76"/><feFuncB type="table" tableValues=".27 .39 .54 .62 .47 .58 .69 .75"/></feComponentTransfer></filter>
 <filter id="paper-grit" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".4" numOctaves="3" seed="8" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
 <pattern id="fibers" width="71" height="53" patternUnits="userSpaceOnUse"><path d="M3 8q12-3 26 1m11 13 21-2M9 38l19 1m17 11 19-2M36 4l8 2" fill="none" stroke="#7e582c" stroke-opacity=".08" stroke-width=".65"/><path d="M12 11l14-1m11 22 25-2M3 46l21-1" stroke="#fff5d4" stroke-opacity=".25" fill="none" stroke-width=".6"/></pattern>
 <pattern id="grain" width="29" height="40" patternUnits="userSpaceOnUse"><path d="M3 0q5 10 0 20t1 20M8-8q-6 10-1 20t0 24M15-9q-4 14 1 29t-1 25M23-5q7 15 2 26t-1 26" fill="none" stroke="#130e0b" stroke-opacity=".27" stroke-width=".65"/><path d="M5-2q4 18 0 27m15-20q-3 19 1 33" fill="none" stroke="#c39a66" stroke-opacity=".17" stroke-width=".55"/></pattern>
 <pattern id="marble" width="180" height="180" patternUnits="userSpaceOnUse"><rect width="180" height="180" fill="url(#stone)"/><path d="M-15 44Q36 15 55 58T117 108T193 125M18-12Q51 43 30 91T35 192M118-8Q137 44 114 75T142 163T166 190" fill="none" stroke="#626965" stroke-width="12" opacity=".12"/><path d="M-9 40Q34 18 55 59T121 108T193 123M21-9Q52 45 31 92T37 189M117-9Q136 45 115 77T143 165" fill="none" stroke="#dde0db" stroke-width="2.2" opacity=".24"/><path d="m42 44-17-8m41 48 14-13m37 9 22-3m-2 67 19-8M34 139l-13 13" fill="none" stroke="#555e58" stroke-opacity=".18" stroke-width="1"/></pattern>
 <pattern id="weave" width="64" height="64" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="64" height="64" fill="#412718"/><path d="M0 0H32V32H0ZM32 32H64V64H32Z" fill="#87603c"/><path d="M32 0H64V32H32ZM0 32H32V64H0Z" fill="#694527"/><path d="M2 2H30V29M34 34H62V61" stroke="#bc8a54" stroke-opacity=".55" fill="none" stroke-width="2"/><path d="M2 31H31V2M34 63H63V34" stroke="#28190e" fill="none" stroke-width="2"/><path d="M3 7H29M3 12H29M3 17H29M35 39H61M35 44H61M35 49H61" stroke="#b18552" stroke-opacity=".19"/><path d="M39 3V29M44 3V29M49 3V29M7 35V61M12 35V61M17 35V61" stroke="#c19861" stroke-opacity=".17"/></pattern>
</defs>`;
const svg = (w, h, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">${defs}${extra}${body}</svg>`;
const frame = (w, h, body, metal = 'steel') =>
  `<path d="M.6.6H${w - 0.6}V${h - 0.6}H.6Z" fill="#151918"/><path d="M1.3 1.3H${w - 1.3}V${h - 1.3}H1.3Z" fill="url(#${metal})"/><path d="M3 3H${w - 3}V${h - 3}H3Z" fill="#262a28"/>${body}<path d="M1 1H${w - 1}M1 1V${h - 1}" stroke="#e1e0d1" stroke-opacity=".6" fill="none" stroke-width=".6"/>`;
const gothicB = `<path d="m8 25 3-4V7L8 4l9-3 6 5-2 7 5 4v8l-9 6-5-3-9 1Zm7-18v8l4-3V9Zm0 13-3 3 7 4v-5Z" fill="#9f1511" fill-rule="evenodd" stroke="url(#gold)" stroke-width="1.05" stroke-linejoin="miter"/><path d="m11 7 1 1v12l-4 5m10-21 4 3m-3 20 4-3" fill="none" stroke="#f2c755" stroke-width=".38"/>`;
const braid = `<rect width="28" height="56" fill="#50351f"/><path d="M2 0v56M26 0v56" stroke="#e5c47d" stroke-width="1.3"/><path d="M6-14c0 14 16 14 16 28S6 28 6 42s16 14 16 28M22-14c0 14-16 14-16 28s16 14 16 28S6 56 6 70" fill="none" stroke="#302417" stroke-width="8"/><path d="M6-14c0 14 16 14 16 28S6 28 6 42s16 14 16 28M22-14c0 14-16 14-16 28s16 14 16 28S6 56 6 70" fill="none" stroke="url(#gold)" stroke-width="5"/><path d="M8 20q6 5 12 12M8 48q6 5 12 12" fill="none" stroke="#32251a" stroke-width="7"/><path d="M8 20q6 5 12 12M8 48q6 5 12 12" fill="none" stroke="#d9b76b" stroke-width="4.5"/><path d="M5 1q1 9 8 13M20 33q-1 8-7 13" fill="none" stroke="#fff0b5" stroke-opacity=".6" stroke-width=".8"/>`;
put(
  'materials/parchment.svg',
  svg(
    284,
    212,
    '<rect width="284" height="212" fill="#dec296"/><rect width="284" height="212" fill="url(#fibers)"/><rect width="284" height="212" filter="url(#paper-grit)" opacity=".055"/>',
  ),
);
put(
  'materials/marble.svg',
  svg(
    256,
    256,
    '<rect width="256" height="256" fill="#92938f"/><rect width="256" height="256" filter="url(#stone-texture)"/>',
  ),
);
const weavePeriod = 128 * Math.SQRT2;
put(
  'materials/weave-tile.svg',
  svg(
    weavePeriod,
    weavePeriod,
    `<rect width="${weavePeriod}" height="${weavePeriod}" fill="url(#weave)"/>`,
  ),
);
put('ornaments/braid.svg', svg(28, 56, braid));

function add(id, file, title, category, display, method, content, options = {}) {
  const source = bitmap(id),
    key = options.key ?? id;
  if (content !== null) put(file, content);
  if (!existsSync(path.join(output, file))) throw Error('Missing artwork master: ' + file);
  const master = readFileSync(path.join(output, file));
  const nativeSize = file.endsWith('.png')
    ? { width: master.readUInt32BE(16), height: master.readUInt32BE(20) }
    : undefined;
  assets[key] = {
    originalId: id,
    title,
    category,
    file,
    sourceFile: source.file,
    sourceWidth: source.width,
    sourceHeight: source.height,
    sourceSha256: sha(source.bytes),
    masterSha256: sha(master),
    nativeSize,
    display,
    method,
    status: 'candidate',
    ...options,
  };
}

function woodButton(w = 290, pressed = false) {
  return svg(
    w,
    24,
    `<rect x=".5" y=".5" width="${w - 1}" height="23" rx="1" fill="#1e1510"/><rect x="2" y="2" width="${w - 4}" height="20" fill="url(#wood)"/><rect x="2" y="2" width="${w - 4}" height="20" fill="url(#grain)"/><path d="M2 21V2H${w - 2}" fill="none" stroke="${pressed ? '#21160e' : '#aa8150'}" stroke-width="1.3"/><path d="M2 22H${w - 2}V2" fill="none" stroke="${pressed ? '#9a7448' : '#1a120b'}" stroke-width="1.2"/>${pressed ? `<rect x="3" y="3" width="${w - 6}" height="18" fill="#120c06" opacity=".18"/>` : ''}`,
  );
}
for (const [letter, pressed] of [
  ['A', false],
  ['B', true],
])
  add(
    `UI/MENBTN1${letter}.PCX`,
    `buttons/MENBTN1${letter}.svg`,
    `Menu plank · ${letter} face`,
    'buttons',
    { width: 580, height: 48 },
    'Redrawn wood grain and separate carved bevels; fixed corners through nine-slice CSS.',
    woodButton(290, pressed),
    {
      nineSlice: [4, 5, 4, 5],
      treatment: 'button',
      limitations: 'A/B visual faces preserved; interaction semantics are an HD treatment.',
    },
  );
function scrollButton(color) {
  const ribbon = color
    ? `<path d="M60 .5h9v23l-4.5-2.6-4.5 2.6Z" fill="${color}" stroke="#28160f" stroke-width=".55"/><path d="M61 1v18m6-18v18" stroke="#ffffff" stroke-opacity=".22" stroke-width=".6"/><circle cx="64.5" cy="5.8" r="2.6" fill="url(#gold)" stroke="#6c4519" stroke-width=".55"/><circle cx="64.5" cy="5.8" r="1.05" fill="${color}"/>`
    : '';
  return svg(
    128,
    24,
    `<path d="M4 1.5h120l3 4-1 14-3 3H5l-4-3 1-14Z" fill="#553c22"/><path d="M5 3h117l3 3-2 12-2 3H7l-4-3 1-11Z" fill="url(#paper)"/><path d="M5 3h117l3 3-2 12-2 3H7l-4-3 1-11Z" fill="url(#fibers)"/><path d="m6 5 114-.4M7 19l113 .1" stroke="#fff0cc" stroke-width=".75" opacity=".75" fill="none"/><path d="M4 6q8 1 3 6T5 18m117-12q-8 1-3 6t2 6" stroke="#916841" fill="none" stroke-width=".8"/><path d="M8 8q50-1 110 1M8 15q52 1 110 0" fill="none" stroke="#a68255" opacity=".26" stroke-width=".6"/>${ribbon}`,
  );
}
for (const [n, color] of [
  [0, null],
  [1, '#712b91'],
  [2, '#9d261e'],
])
  add(
    `UI/SCRLBTN${n}.PCX`,
    `buttons/SCRLBTN${n}.svg`,
    ['Scroll button', 'Scroll button · purple ribbon', 'Scroll button · red ribbon'][n],
    'buttons',
    { width: 256, height: 48 },
    'Redrawn rolled parchment, fiber strokes, clean alpha and original ribbon color.',
    scrollButton(color),
    {
      nineSlice: [6, 10, 6, 10],
      treatment: 'button',
      limitations: n ? 'Ribbon variant, not a verified disabled/hover state.' : '',
    },
  );

function coin(x, y, r = 3.2) {
  return `<path d="M${x - r} ${y}v2.8a${r} 1.7 0 0 0 ${r * 2} 0V${y}" fill="#ac7621" stroke="#6f4d19" stroke-width=".4"/><ellipse cx="${x}" cy="${y + 2.8}" rx="${r}" ry="1.6" fill="url(#gold)"/><path d="M${x - r + 0.6} ${y + 0.6}v1.7m1.2-1.4v1.9m1.2-1.8v1.9m1.2-1.7v1.9" stroke="#e8c063" stroke-width=".35"/><ellipse cx="${x}" cy="${y}" rx="${r}" ry="1.7" fill="url(#gold)" stroke="#f4dc81" stroke-width=".45"/><ellipse cx="${x}" cy="${y}" rx="${r - 1}" ry=".9" fill="none" stroke="#8d5c19" stroke-width=".4"/>`;
}
add(
  'UI/GOLD01_A.PCX',
  'icons/GOLD01_A.svg',
  'Gold · small amount',
  'icons',
  { width: 46, height: 32 },
  'Hand-drawn coin contours, metal highlights and transparent silhouette.',
  svg(
    26,
    18,
    `${coin(9, 8, 4.2)}${coin(14, 6, 4.2)}<path d="M16 8q-1 6 6 8l1-3q-5-1-4-7" fill="url(#gold)" stroke="#81571b" stroke-width=".45"/><path d="M6 2v5M3.5 4.5h5" stroke="#fff3c0" stroke-width=".8"/>`,
  ),
);
add(
  'UI/GOLD03_A.PCX',
  'icons/GOLD03_A.svg',
  'Gold · three stacks',
  'icons',
  { width: 46, height: 32 },
  'Individually redrawn stacked coins, consistent highlights and clean alpha.',
  svg(
    26,
    18,
    `${coin(5.2, 11)}${coin(5.2, 8)}${coin(13, 7)}${coin(13, 4)}${coin(21, 11)}${coin(21, 8)}${coin(21, 5)}<path d="M9.5 1v4M7.5 3h4" stroke="#fff1bf" stroke-width=".65"/>`,
  ),
);
const crownShape = `<path d="m3 6 4 3 2-7 4 6 4-6 2 7 4-3-2 9H5Z" fill="url(#gold)" stroke="#6f4716" stroke-width=".65"/><path d="m5 8 2 4 2-7 4 6 4-6 2 7 2-4M5 14h16" fill="none" stroke="#fff0a1" stroke-width=".65"/><path d="M6 16h14" stroke="#8a591c" stroke-width="1.1"/><circle cx="13" cy="11.5" r="1.1" fill="#992d24"/><circle cx="8" cy="12.5" r=".6" fill="#5e3430"/><circle cx="18" cy="12.5" r=".6" fill="#5e3430"/>`;
add(
  'UI/CROWNA_A.PCX',
  'icons/CROWNA_A.svg',
  'Crown / regency symbol',
  'icons',
  { width: 46, height: 32 },
  'Reconstructed crown profile and restrained red/gold inlays; no enlarged pixels.',
  svg(26, 18, crownShape),
);
add(
  'UI/CROWN_TL.PCX',
  'ornaments/CROWN_TL.svg',
  'Embossed crown tile',
  'ornaments',
  { width: 48, height: 48 },
  'Redrawn brass relief and diagonal brushed highlights, matching the olive/gold original.',
  svg(
    72,
    72,
    `<rect width="72" height="72" fill="url(#olive)"/><path d="M-10 72 72-10M-10 44 44-10M17 82 82 17" stroke="#e5cb62" stroke-opacity=".18" stroke-width="10"/><g transform="translate(6 10) scale(2.3)"><path d="m3 8 4 3 2-7 4 6 4-6 2 7 4-3-2 8H5Z" fill="#423b0e" transform="translate(0 1)"/>${crownShape}</g>`,
  ),
);
add(
  'UI/LOGO.PCX',
  'icons/LOGO.svg',
  'Gothic B and sword',
  'ornaments',
  { width: 48, height: 48 },
  'Hand-traced letter silhouette, negative counters and sword; vector metal bevel.',
  svg(
    32,
    32,
    `<path d="M2 29 29 2l1 4L5 30Z" fill="url(#steel)" stroke="#202522" stroke-width=".8"/><path d="m1 26 5 5m-4-4 3 3" stroke="#50815a" stroke-width="1.8"/>${gothicB}`,
  ),
);
const shield = `<path d="M4 3h40v22q-1 14-20 20Q5 39 4 25Z" fill="#1d2228" stroke="url(#gold)" stroke-width="1.4"/><path d="M6 5h18v19H6Zm18 19h18v1q-2 13-18 18Z" fill="url(#purple)"/><path d="M24 5h18v19H24ZM6 24h18v19Q8 37 6 25Z" fill="url(#blue)"/><path d="M24 5v38M6 24h36" fill="none" stroke="#747c82" stroke-width="1.4"/><path d="M6 5h36v19q-2 14-18 19Q8 37 6 24Z" fill="none" stroke="#d2d8d2" stroke-opacity=".42" stroke-width=".8"/>`;
add(
  'UI/DSHLD_IC.PCX',
  'icons/DSHLD_IC.svg',
  'Quartered purple/blue shield',
  'heraldry',
  { width: 48, height: 48 },
  'Reconstructed curved shield, quartered fields and raised dividing bars.',
  svg(48, 48, shield),
  { limitations: 'Original generic heraldic symbol; no unverified realm assignment.' },
);
add(
  'UI/BANNER_A.PCX',
  'icons/BANNER_A.svg',
  'Winged heraldic badge',
  'heraldry',
  { width: 46, height: 32 },
  'Redrawn symmetrical wing profile and red/gold shield silhouette.',
  svg(
    26,
    18,
    `<path d="M2 3h22q-2 10-11 13Q4 13 2 3Z" fill="#781f20" stroke="url(#gold)" stroke-width=".8"/><path d="m13 5-2 3L4 5l2 4 5 2 2 3 2-3 5-2 2-4-7 3Z" fill="url(#gold)" stroke="#513915" stroke-width=".4"/><path d="m7 7 4 3m-3-1 3 2m8-4-4 3m3-1-3 2" stroke="#63431a" stroke-width=".55"/><circle cx="13" cy="5.5" r="1.2" fill="#eac967"/>`,
  ),
  { limitations: 'Preserves an original badge; realm/regent mapping remains unverified.' },
);

function marble(w, h) {
  return svg(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="#92938f"/><rect width="${w}" height="${h}" filter="url(#stone-texture)"/><path d="M1 ${h - 1}V1H${w - 1}l-5 5H6v${h - 12}Z" fill="#d8d9d4" opacity=".78"/><path d="M${w - 1} 1v${h - 2}H1l5-5h${w - 12}V6Z" fill="#4a504c" opacity=".7"/><rect x="6" y="6" width="${w - 12}" height="${h - 12}" fill="none" stroke="#747c75" stroke-width=".75"/><path d="M7 ${h - 8}V7H${w - 8}" fill="none" stroke="#e6e5df" stroke-opacity=".4" stroke-width=".8"/>`,
  );
}
for (const [n, w, h, dw, dh] of [
  ['01', 150, 304, 300, 380],
  ['05', 622, 91, 800, 112],
  ['06', 320, 264, 420, 320],
])
  add(
    `UI/MARBLE${n}.PCX`,
    `frames/MARBLE${n}.svg`,
    `Marble ${n} · scalable ${n === '05' ? 'header' : 'window'}`,
    'frames',
    { width: dw, height: dh },
    'Rebuilt stone with continuous fractal grain and sculpted bevels; tiled material and nine-slice corners scale independently.',
    marble(w, h),
    { nineSlice: [8, 8, 8, 8], treatment: 'frame' },
  );
add(
  'UI/DTURN_BK.PCX',
  'panels/DTURN_BK.svg',
  'Council parchment and braided border',
  'surfaces',
  { width: 300, height: 520 },
  'Rebuilt parchment, vector Gothic watermark and independent repeating braid; CSS keeps their proportions.',
  svg(
    352,
    480,
    `<rect width="352" height="480" fill="url(#paper)"/><rect width="352" height="480" fill="url(#fibers)"/><g opacity=".1" transform="translate(28 63) scale(10)">${gothicB}</g><rect x="320" width="4" height="480" fill="#8e402b"/><svg x="324" width="28" height="480"><defs><pattern id="braid-repeat" width="28" height="56" patternUnits="userSpaceOnUse">${braid}</pattern></defs><rect width="28" height="480" fill="url(#braid-repeat)"/></svg>`,
  ),
  { treatment: 'council', cssClass: 'br-hd-council' },
);
add(
  'UI/FILLPANL.PCX',
  'materials/FILLPANL.svg',
  'Woven brown background',
  'surfaces',
  { width: 480, height: 360 },
  'Reconstructed interlocking weave with separate light/dark edges; repeatable vector material.',
  svg(640, 480, '<rect width="640" height="480" fill="url(#weave)"/>'),
  { treatment: 'weave', cssClass: 'br-hd-weave' },
);

function actionIcon(kind) {
  let body = '';
  if (kind === 'ledger')
    body = `<rect x="3" y="3" width="38" height="38" fill="#4a3228"/><path d="m8 11 24-5 9 25-25 8-9-23Z" fill="#59361c" stroke="#d4b47f" stroke-width=".7"/><path d="m7 9 24-5 8 24-24 8Z" fill="#c4ab79" stroke="#6e4e2b" stroke-width=".6"/><path d="m9 10 20-4 7 20-21 7Z" fill="#98845b"/>${Array.from({ length: 6 }, (_, y) => Array.from({ length: 6 }, (_, x) => `<path d="m${10 + x * 3.25 + y * 0.8} ${11 + y * 3.1} 1.4-.35" stroke="${(x + y) % 3 ? '#3c3020' : '#81532e'}" stroke-width=".9"/>`).join('')).join('')}<path d="m21 13 3 10 8-2 1.4 3.7-8 2.4-4.8 1.2-4-13Z" fill="#a92d27" stroke="#cf7960" stroke-width=".55"/>`;
  if (kind === 'province')
    body = `<rect x="3" y="3" width="38" height="38" fill="#15452a"/><path d="m4 8 9-2 8 7 17-4-7 14 10 13-18-3-7 7-8-11 8-9Z" fill="#285a36"/><path d="M4 5 13 16 20 20 17 31 24 39M8 39 14 23 26 15 39 16 41 23 30 24 22 20M17 31l14 2 9-10M20 20l9-7M22 20l2 12m-8-2 16-1m-7 10 4-6" fill="none" stroke="#6475c7" stroke-width="3.2"/><path d="M4 5 13 16 20 20 17 31 24 39M8 39 14 23 26 15 39 16 41 23 30 24 22 20M17 31l14 2 9-10M20 20l9-7M22 20l2 12m-8-2 16-1m-7 10 4-6" fill="none" stroke="#e5f1ee" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (kind === 'army')
    body = `<rect x="3" y="3" width="38" height="38" fill="#183e25"/>${[0, 1, 2, 3, 4, 5, 6]
      .map((i) => {
        const x = 7 + i * 4.7,
          y = 6 + (i % 3) * 3.7;
        return `<path d="M${x} ${y}v24" stroke="#b8ae8d" stroke-width=".65"/><path d="m${x} ${y} 3 1.3v6.5l-3-1Z" fill="${i % 2 ? '#354fa4' : '#9e3437'}"/><path d="m${x - 1.3} ${y + 14}v13m2.6-13v13" stroke="#627759" stroke-width=".8"/><circle cx="${x}" cy="${y + 12}" r="1.35" fill="#a6aaa2"/>`;
      })
      .join('')}<path d="m22 16 1 6 6 2-6 1-2 8-1-8-6-2 6-1Z" fill="#d4deb3" opacity=".8"/>`;
  return svg(44, 44, frame(44, 44, body));
}
for (const [kind, y, title] of [
  ['ledger', 138, 'Action tile · red-sealed ledger'],
  ['province', 184, 'Action tile · province network'],
  ['army', 322, 'Action tile · army formation'],
])
  add(
    'UI/DACTN_IC.PCX',
    `icons/DACTN-${kind}.svg`,
    title,
    'icons',
    { width: 48, height: 48 },
    'Hand-redrawn miniature preserving the original object, palette and silver tile frame.',
    actionIcon(kind),
    {
      key: `UI/DACTN_IC.PCX@0,${y},44,44`,
      sourceRect: [0, y, 44, 44],
      limitations:
        'Original atlas has 44px frames on a 46px pitch; no assumption about final action binding.',
    },
  );

const tile = (color, body) =>
  frame(32, 46, `<rect x="3" y="3" width="26" height="40" fill="${color}"/>${body}`);
const toolbar = [
  [
    'standards',
    22,
    tile(
      '#50331d',
      `<path d="m6 9 19 27M25 9 6 36" stroke="url(#steel)" stroke-width="1.7"/><path d="M8 7v31m16-31v31" stroke="#a59061" stroke-width=".7"/><path d="m8 6 8 3-2 5-6-3Z" fill="#365eb3"/><path d="m24 6-8 3 2 5 6-3Z" fill="#a6382c"/><path d="m7 23 18-3m-19 7 19 3" stroke="#d6d2bd" stroke-width="1.3"/><path d="m7 29 6 3v7l-6-4m18-6-6 3v7l6-4" fill="#3c6d42"/>`,
    ),
  ],
  [
    'fort',
    56,
    tile(
      '#133d26',
      `<path d="M7 22h18v18H7Zm2-11h15v13H9Z" fill="#a49b7c" stroke="#423d2d" stroke-width=".7"/><path d="M8 11V8h3v3h3V8h3v3h3V8h4v7H8ZM6 25v-4h4v3h3v-3h4v3h4v-3h5v7Z" fill="#c0ad82" stroke="#625541" stroke-width=".6"/><path d="M13 40V29q3-5 6 0v11" fill="#21241d"/><path d="M10 16h11M10 20h11M8 32h4m8 0h4m-16 4h4m8 0h4" stroke="#726c55" stroke-width=".65"/>`,
    ),
  ],
  [
    'town',
    90,
    tile(
      '#681f1d',
      `<path d="M6 23h20v17H6Z" fill="#d6c49a" stroke="#7a5536" stroke-width=".6"/><path d="M4 23 11 16l6 7Zm12 0 6-7 7 7Z" fill="#a44e31"/><path d="M12 14h8v26h-8Z" fill="#e2cda2" stroke="#775532" stroke-width=".6"/><path d="m11 14 5-5 5 5Z" fill="#985735"/><path d="M14 40V32q2-3 4 0v8M8 27v3m15-3v3m-9-10h4m-4 5h4" stroke="#785334" stroke-width="1.2"/>`,
    ),
  ],
  [
    'temple',
    124,
    tile(
      '#44225d',
      `<path d="M5 40h23v-3H5Zm2-5h19v-2H7Zm-2-12h23v-3H5Zm1-4 10-7 11 7Z" fill="url(#steel)" stroke="#34373b" stroke-width=".5"/><path d="M12 14V9q4-6 8 0v5" fill="#b5bdc0" stroke="#596273" stroke-width=".5"/><path d="M15 8h3v3h-3Z" fill="#b64e83"/><path d="M15 11h3v3h-3Z" fill="#5274bb"/>${[8, 13, 18, 23].map((x) => `<path d="M${x} 23v10" stroke="#c2c7c6" stroke-width="2"/><path d="M${x + 0.7} 23v10" stroke="#647078" stroke-width=".7"/>`).join('')}`,
    ),
  ],
  [
    'source',
    158,
    tile(
      '#1c254a',
      `<path d="M5 35q11-6 23 0m-22 3q10-4 21 0" stroke="#43886f" fill="none" stroke-width="1.2"/><path d="M9 18h5v16H9Zm11 0h5v16h-5Z" fill="#858e91" stroke="#333c45" stroke-width=".8"/><path d="M5 15 9 12h16l3 4-2 3H7Z" fill="url(#steel)" stroke="#38424a" stroke-width=".7"/><path d="m17 22 1.2 5.1 5 1-5 1.3-1.2 5.5-1.3-5.5-4.9-1.3 4.9-1Z" fill="#d9e3ff" stroke="#788ee0" stroke-width="1"/>`,
    ),
  ],
  [
    'map',
    192,
    frame(
      48,
      46,
      `<rect x="3" y="3" width="42" height="40" fill="#bda376"/><image href="${pngData('MAP/SMMAP.PCX')}" x="5" y="4" width="38" height="38" preserveAspectRatio="xMidYMid meet"/><path d="m4 6 1-2 5 1m28 36 5 1-1-4" stroke="#e4d3a8" fill="none" stroke-width="1.1"/>`,
    ),
  ],
];
const toolbarBody = toolbar
  .map(([name, x, body]) => {
    const w = name === 'map' ? 48 : 32;
    put(`icons/DMAP-${name}.svg`, svg(w, 46, body));
    return `<g transform="translate(${x} 0)">${body}</g>`;
  })
  .join('');
add(
  'UI/DMAP_IC.PCX',
  'icons/DMAP_IC.svg',
  'Strategic toolbar · six glyphs',
  'icons',
  { width: 360, height: 72 },
  'Redrawn standards, fort, town, temple and source; map inset uses the larger original SMMAP.',
  svg(240, 48, toolbarBody),
  {
    components: toolbar.map(([name, x]) => ({
      name,
      file: `icons/DMAP-${name}.svg`,
      sourceRect: [x, 0, name === 'map' ? 48 : 32, 46],
    })),
    additionalSources: [
      {
        originalId: 'MAP/SMMAP.PCX',
        file: bitmap('MAP/SMMAP.PCX').file,
        sha256: sha(bitmap('MAP/SMMAP.PCX').bytes),
      },
    ],
  },
);

for (const [id, file, title, w, h] of [
  ['UI/MAINPANL.PCX', 'panels/MAINPANL.png', 'Shield menu illustration', 672, 768],
  ['UI/LGLORDF2.PCX', 'portraits/LGLORDF2.png', 'Female noble · original art type', 192, 300],
  ['UI/LGLORDM1.PCX', 'portraits/LGLORDM1.png', 'Male noble · original art type', 192, 300],
])
  add(
    id,
    file,
    title,
    id.includes('MAINPANL') ? 'menu' : 'portraits',
    { width: w, height: h },
    'AI-assisted redraw from this exact source; palette, costume and composition constrained.',
    null,
    {
      status: 'manual-review',
      limitations: id.includes('MAINPANL')
        ? 'Review lettering, individual figures and button-row alignment before UI adoption.'
        : 'Facial detail is an interpretation, not recovered canonical identity. Shared original art type; no unique regent likeness is claimed.',
    },
  );

put(
  'mapping.json',
  JSON.stringify(
    {
      version: 1,
      base: '/original/enhanced/',
      originalAssetCount: original.records.length,
      assets,
    },
    null,
    2,
  ) + '\n',
);
put(
  'controls.css',
  readFileSync(new URL('../packages/import-tools/enhanced-controls.css', import.meta.url), 'utf8'),
);
put(
  'index.html',
  readFileSync(
    new URL('../packages/import-tools/enhancement-gallery.html', import.meta.url),
    'utf8',
  ),
);
if (!existsSync(path.join(output, 'restorations.json')))
  put(
    'README.md',
    `# M1D-0 artwork studies\n\n24 historical proposals. Originals remain untouched. Open /original/enhanced/index.html. mapping.json preserves source IDs and hashes. Three PNG illustrations and their imagegen prompts are preserved locally. The studies require art review; sharper geometric material redraws are not assumed to improve fidelity.\n`,
  );
for (const asset of Object.values(assets)) {
  if (sha(readFileSync(path.join(sourceRoot, asset.sourceFile))) !== asset.sourceSha256)
    throw Error('Original source changed: ' + asset.originalId);
}
console.log('Created', Object.keys(assets).length, 'curated enhancements in', output);
