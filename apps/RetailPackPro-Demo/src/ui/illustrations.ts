/**
 * Genererede illustrationer til demoen (ingen fotos af rigtige varer).
 * Billed-URL'er på formen "illustration:<type>:<parameter>" tegnes her som SVG.
 * Det holder demodata små og gør det tydeligt, at billederne er eksempler.
 */
const svg = (body: string, vb = '0 0 200 150') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

const WOOD = '#c89b62';
const WOOD_D = '#9c7240';

function palletBase(x: number, y: number, w: number, depthX: number, depthY: number): string {
  // Simpel skråprojektion af en palle: dæk + klodser
  const h = 14;
  return `
    <polygon points="${x},${y} ${x + w},${y} ${x + w + depthX},${y - depthY} ${x + depthX},${y - depthY}" fill="${shade(WOOD, 20)}" stroke="${WOOD_D}" stroke-width="1.5"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${WOOD}" stroke="${WOOD_D}" stroke-width="1.5"/>
    <polygon points="${x + w},${y} ${x + w + depthX},${y - depthY} ${x + w + depthX},${y - depthY + h} ${x + w},${y + h}" fill="${WOOD_D}" stroke="${WOOD_D}" stroke-width="1.5"/>
    <rect x="${x + 6}" y="${y + 4}" width="${w * 0.18}" height="${h - 4}" fill="${WOOD_D}" opacity=".55"/>
    <rect x="${x + w / 2 - w * 0.09}" y="${y + 4}" width="${w * 0.18}" height="${h - 4}" fill="${WOOD_D}" opacity=".55"/>
    <rect x="${x + w - 6 - w * 0.18}" y="${y + 4}" width="${w * 0.18}" height="${h - 4}" fill="${WOOD_D}" opacity=".55"/>`;
}

function product(kind: string, color: string): string {
  const c = color || '#555';
  if (kind === 'bar') {
    return svg(`
      <rect x="0" y="0" width="200" height="150" fill="#f2f4f8"/>
      <g transform="rotate(-12 100 75)">
        <rect x="28" y="52" width="144" height="50" rx="4" fill="${c}"/>
        <rect x="28" y="52" width="18" height="50" fill="#c0c6d4"/><rect x="154" y="52" width="18" height="50" fill="#c0c6d4"/>
        <rect x="58" y="62" width="84" height="30" rx="3" fill="${shade(c, 60)}"/>
        <rect x="66" y="70" width="68" height="5" rx="2" fill="#fff" opacity=".85"/>
        <rect x="66" y="80" width="44" height="4" rx="2" fill="#fff" opacity=".6"/>
      </g>`);
  }
  if (kind === 'bag') {
    return svg(`
      <rect x="0" y="0" width="200" height="150" fill="#f2f4f8"/>
      <path d="M62 24 h76 l6 10 -6 6 q14 40 6 96 h-88 q-8 -56 6 -96 l-6 -6 z" fill="${c}"/>
      <rect x="62" y="24" width="76" height="10" fill="${shade(c, -25)}"/>
      <ellipse cx="100" cy="86" rx="28" ry="22" fill="${shade(c, 70)}"/>
      <circle cx="91" cy="84" r="7" fill="${shade(c, -30)}"/><circle cx="108" cy="90" r="7" fill="${shade(c, -10)}"/><circle cx="102" cy="78" r="6" fill="${shade(c, -45)}"/>`);
  }
  if (kind === 'box') {
    return svg(`
      <rect x="0" y="0" width="200" height="150" fill="#f2f4f8"/>
      <polygon points="40,58 120,58 160,38 80,38" fill="${shade(c, 45)}"/>
      <rect x="40" y="58" width="80" height="66" fill="${c}"/>
      <polygon points="120,58 160,38 160,104 120,124" fill="${shade(c, -35)}"/>
      <rect x="74" y="58" width="12" height="66" fill="${shade(c, 90)}" opacity=".8"/>
      <polygon points="74,58 86,58 126,38 114,38" fill="${shade(c, 110)}" opacity=".8"/>`);
  }
  return svg(`<rect width="200" height="150" fill="#f2f4f8"/><rect x="50" y="35" width="100" height="80" rx="8" fill="${c}"/>`);
}

function palletType(type: string): string {
  const w = type === 'half' ? 100 : type === 'quarter' ? 76 : 140;
  const dx = type === 'quarter' ? 34 : 46;
  const dy = type === 'quarter' ? 18 : 24;
  const x = (200 - w - dx) / 2;
  return svg(`<rect width="200" height="150" fill="#f2f4f8"/>${palletBase(x, 92, w, dx, dy)}`);
}

function carton(color: string): string {
  return svg(`
    <rect width="200" height="150" fill="#f2f4f8"/>
    <polygon points="50,60 120,60 152,44 82,44" fill="${shade(color, 30)}"/>
    <rect x="50" y="60" width="70" height="56" fill="${color}"/>
    <polygon points="120,60 152,44 152,100 120,116" fill="${shade(color, -30)}"/>
    <rect x="50" y="78" width="70" height="8" fill="${shade(color, -20)}" opacity=".6"/>
    <path d="M60 98 l6 -8 6 8 M66 90 v14" stroke="#3a2a12" stroke-width="2" fill="none"/>`);
}

function divider(color: string): string {
  return svg(`
    <rect width="200" height="150" fill="#f2f4f8"/>
    <polygon points="30,96 140,96 176,70 66,70" fill="${color}" stroke="${shade(color, -40)}" stroke-width="2"/>
    <polygon points="30,96 140,96 140,102 30,102" fill="${shade(color, -30)}"/>
    <polygon points="140,96 176,70 176,76 140,102" fill="${shade(color, -50)}"/>`);
}

function corner(color: string): string {
  return svg(`
    <rect width="200" height="150" fill="#f2f4f8"/>
    ${[60, 100, 140]
      .map(
        (x) =>
          `<polygon points="${x - 14},20 ${x},28 ${x},132 ${x - 14},124" fill="${color}"/><polygon points="${x},28 ${x + 14},20 ${x + 14},124 ${x},132" fill="${shade(color, -30)}"/>`,
      )
      .join('')}`);
}

function labelDiagram(side: string): string {
  const lx = side === 'right' ? 118 : side === 'left' ? 46 : 82;
  return svg(`
    <rect width="200" height="150" fill="#f2f4f8"/>
    ${palletBase(34, 118, 116, 30, 16)}
    <rect x="34" y="34" width="116" height="84" fill="#d8b98a" stroke="#9c7240" stroke-width="1.5"/>
    <polygon points="150,34 180,18 180,102 150,118" fill="#b8956a" stroke="#9c7240" stroke-width="1.5"/>
    <polygon points="34,34 150,34 180,18 64,18" fill="#e6caa0" stroke="#9c7240" stroke-width="1.5"/>
    <rect x="${lx}" y="${side === 'center' ? 66 : 42}" width="28" height="22" fill="#fff" stroke="#14213d" stroke-width="2"/>
    <path d="M${lx + 4} ${(side === 'center' ? 66 : 42) + 6} h20 M${lx + 4} ${(side === 'center' ? 66 : 42) + 11} h14 M${lx + 4} ${(side === 'center' ? 66 : 42) + 16} h18" stroke="#14213d" stroke-width="2"/>
    <circle cx="${lx + 14}" cy="${(side === 'center' ? 66 : 42) + 11}" r="22" fill="none" stroke="#f5b800" stroke-width="4"/>`);
}

function layerPattern(countRaw: string): string {
  const count = Math.max(1, Math.min(30, Number(countRaw) || 8));
  const { cols, rows } = gridFor(count);
  const W = 160;
  const H = 110;
  const cw = W / cols;
  const ch = H / rows;
  let cells = '';
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    cells += `<rect x="${20 + c * cw + 2}" y="${20 + r * ch + 2}" width="${cw - 4}" height="${ch - 4}" rx="3" fill="#d8b98a" stroke="#9c7240" stroke-width="1.5"/>`;
  }
  return svg(`<rect width="200" height="150" fill="#f2f4f8"/><rect x="18" y="18" width="164" height="114" fill="${shade(WOOD, 20)}" stroke="${WOOD_D}" stroke-width="2"/>${cells}`);
}

export function gridFor(count: number): { cols: number; rows: number } {
  if (count <= 1) return { cols: 1, rows: 1 };
  let best = { cols: count, rows: 1 };
  let bestScore = Infinity;
  for (let rows = 1; rows <= count; rows++) {
    const cols = Math.ceil(count / rows);
    if (cols < rows) break;
    const waste = cols * rows - count;
    const score = waste * 3 + Math.abs(cols / rows - 1.6);
    if (score < bestScore) {
      best = { cols, rows };
      bestScore = score;
    }
  }
  return best;
}

export function illustrationSvg(spec: string): string | null {
  const [, type, param = ''] = spec.split(':');
  switch (type) {
    case 'bar':
    case 'bag':
    case 'box':
      return product(type, param);
    case 'pallet':
      return palletType(param);
    case 'carton':
      return carton(param || '#b08850');
    case 'divider':
      return divider(param || '#c9a96e');
    case 'corner':
      return corner(param || '#8c6d3f');
    case 'label':
      return labelDiagram(param);
    case 'layer':
      return layerPattern(param);
    default:
      return null;
  }
}

export function illustrationDataUri(spec: string): string | null {
  const s = illustrationSvg(spec);
  return s ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}` : null;
}

export const PRODUCT_ILLUSTRATIONS = [
  { value: 'illustration:bar:#4a2c1d', label: 'Chokoladebar · mørk' },
  { value: 'illustration:bar:#8a5a3b', label: 'Chokoladebar · lys' },
  { value: 'illustration:bag:#d13b5a', label: 'Pose · rød' },
  { value: 'illustration:bag:#1f1f24', label: 'Pose · sort' },
  { value: 'illustration:bag:#b5651d', label: 'Pose · brun' },
  { value: 'illustration:box:#c8862a', label: 'Æske · orange' },
  { value: 'illustration:box:#2f6b3a', label: 'Æske · grøn' },
  { value: 'illustration:box:#6d2e46', label: 'Æske · bordeaux' },
];
