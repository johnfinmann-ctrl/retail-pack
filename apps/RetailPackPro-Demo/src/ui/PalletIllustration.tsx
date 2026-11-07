/**
 * Tegner den færdigpakkede palle ud fra pakkevejledningens tal:
 * antal lag, kolli pr. lag, folie, labelplacering og maks. højde.
 * Bruges, når admin ikke har uploadet et foto af en færdig palle — så
 * medarbejderen altid ser et billede, der passer til de aktuelle regler.
 */
import { gridFor } from './illustrations';

export interface PalletIllustrationProps {
  layers: number | null;
  unitsPerLayer: number | null;
  maxHeightCm: number | null;
  foil: string | null;
  labelPosition: string | null;
  palletKind?: 'eur' | 'half' | 'quarter';
  cornerProtectors?: boolean;
  dividers?: boolean;
}

const BOX = '#d8b98a';
const BOX_TOP = '#e8cfa7';
const BOX_SIDE = '#b8956a';
const EDGE = '#8f6a3c';
const WOOD = '#c89b62';
const WOOD_D = '#9c7240';

export function PalletIllustration(p: PalletIllustrationProps) {
  const layers = Math.max(1, Math.min(12, p.layers ?? 4));
  const units = Math.max(1, Math.min(40, p.unitsPerLayer ?? 8));
  const { cols, rows } = gridFor(units);

  const kind = p.palletKind ?? 'eur';
  const W = kind === 'quarter' ? 110 : kind === 'half' ? 150 : 190; // front (kortside)
  const DX = kind === 'quarter' ? 60 : 84; // dybde (langside), skrå
  const DY = DX * 0.5;
  const baseY = 270;
  const x0 = (400 - W - DX) / 2 + 10;
  const totalH = 190;
  const lh = Math.min(34, totalH / layers);
  const topY = baseY - layers * lh;

  const label = (p.labelPosition ?? '').toLowerCase();
  const onSide = label.includes('langside') && !label.includes('kortside');
  const both = label.includes('langside') && label.includes('kortside');
  const right = label.includes('højre');
  const left = label.includes('venstre');
  const top = label.includes('øverst');

  const front: JSX.Element[] = [];
  const side: JSX.Element[] = [];
  for (let l = 0; l < layers; l++) {
    const y = baseY - (l + 1) * lh;
    for (let c = 0; c < cols; c++) {
      front.push(
        <rect key={`f${l}-${c}`} x={x0 + (c * W) / cols} y={y} width={W / cols} height={lh} fill={BOX} stroke={EDGE} strokeWidth={1.2} />,
      );
    }
    for (let r = 0; r < rows; r++) {
      const sx = x0 + W + (r * DX) / rows;
      const sy = y - (r * DY) / rows;
      const w = DX / rows;
      const h = DY / rows;
      side.push(
        <polygon
          key={`s${l}-${r}`}
          points={`${sx},${sy} ${sx + w},${sy - h} ${sx + w},${sy - h + lh} ${sx},${sy + lh}`}
          fill={BOX_SIDE}
          stroke={EDGE}
          strokeWidth={1.2}
        />,
      );
    }
    if (p.dividers && l > 0) {
      side.push(<line key={`d${l}`} x1={x0} y1={y + lh} x2={x0 + W} y2={y + lh} stroke="#fff" strokeWidth={2.4} opacity={0.9} />);
    }
  }

  const topCells: JSX.Element[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ax = x0 + (c * W) / cols + (r * DX) / rows;
      const ay = topY - (r * DY) / rows;
      const w = W / cols;
      const dx = DX / rows;
      const dy = DY / rows;
      topCells.push(
        <polygon
          key={`t${r}-${c}`}
          points={`${ax},${ay} ${ax + w},${ay} ${ax + w + dx},${ay - dy} ${ax + dx},${ay - dy}`}
          fill={BOX_TOP}
          stroke={EDGE}
          strokeWidth={1.2}
        />,
      );
    }
  }

  // Label
  const LW = 34;
  const LH = 26;
  const labelY = top ? topY + 6 : baseY - lh * Math.min(layers, 2) + 4;
  const frontLabelX = right ? x0 + W - LW - 8 : left ? x0 + 8 : x0 + W / 2 - LW / 2;
  const sideLabelX = x0 + W + DX / 2 - LW / 2;
  const sideLabelY = labelY - DY / 2;
  const labelRect = (x: number, y: number, k: string, skew: boolean) => (
    <g key={k} transform={skew ? `translate(${x} ${y}) skewY(-26.5)` : `translate(${x} ${y})`}>
      <rect width={LW} height={LH} fill="#fff" stroke="#14213d" strokeWidth={2} />
      <path d="M5 7h24M5 13h16M5 19h20" stroke="#14213d" strokeWidth={2} />
    </g>
  );

  const hasFoil = !!p.foil;
  const darkFoil = (p.foil ?? '').toLowerCase().includes('sort');
  const foilFill = darkFoil ? 'rgba(20,24,32,0.38)' : 'rgba(170,210,255,0.28)';
  const outline = `${x0},${baseY} ${x0 + W},${baseY} ${x0 + W + DX},${baseY - DY} ${x0 + W + DX},${topY - DY} ${x0 + DX},${topY - DY} ${x0},${topY}`;

  return (
    <svg viewBox="0 0 400 320" role="img" aria-label="Illustration af færdigpakket palle">
      <rect width="400" height="320" fill="#f2f4f8" />
      {/* Palle */}
      <polygon points={`${x0},${baseY} ${x0 + W},${baseY} ${x0 + W + DX},${baseY - DY} ${x0 + DX},${baseY - DY}`} fill={WOOD} stroke={WOOD_D} strokeWidth={1.5} />
      <rect x={x0} y={baseY} width={W} height={18} fill={WOOD} stroke={WOOD_D} strokeWidth={1.5} />
      <polygon points={`${x0 + W},${baseY} ${x0 + W + DX},${baseY - DY} ${x0 + W + DX},${baseY - DY + 18} ${x0 + W},${baseY + 18}`} fill={WOOD_D} />
      {[0.04, 0.41, 0.78].map((f) => (
        <rect key={f} x={x0 + W * f} y={baseY + 5} width={W * 0.18} height={13} fill={WOOD_D} opacity={0.6} />
      ))}
      {front}
      {side}
      {topCells}
      {hasFoil && <polygon points={outline} fill={foilFill} stroke={darkFoil ? '#222' : '#7fb3ef'} strokeWidth={1.5} />}
      {hasFoil &&
        Array.from({ length: 5 }, (_, i) => {
          const y = topY + ((baseY - topY) * (i + 0.6)) / 5.2;
          return (
            <path
              key={`fl${i}`}
              d={`M${x0} ${y} L${x0 + W} ${y - 10} L${x0 + W + DX} ${y - 10 - DY}`}
              stroke={darkFoil ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.8)'}
              strokeWidth={2}
              fill="none"
            />
          );
        })}
      {p.cornerProtectors && (
        <>
          <rect x={x0 - 3} y={topY} width={7} height={baseY - topY} fill="#6f5530" />
          <rect x={x0 + W - 4} y={topY} width={7} height={baseY - topY} fill="#6f5530" />
          <polygon points={`${x0 + W + DX - 4},${topY - DY} ${x0 + W + DX + 3},${topY - DY} ${x0 + W + DX + 3},${baseY - DY} ${x0 + W + DX - 4},${baseY - DY}`} fill="#5d4626" />
        </>
      )}
      {(!onSide || both) && labelRect(frontLabelX, labelY, 'lf', false)}
      {(onSide || both) && labelRect(sideLabelX, sideLabelY, 'ls', true)}

      {/* Højdemål */}
      {p.maxHeightCm !== null && (
        <g>
          <line x1={x0 - 26} y1={baseY + 18} x2={x0 - 26} y2={topY} stroke="#14213d" strokeWidth={2} />
          <path d={`M${x0 - 32} ${topY + 8} L${x0 - 26} ${topY} L${x0 - 20} ${topY + 8}`} stroke="#14213d" strokeWidth={2} fill="none" />
          <line x1={x0 - 34} y1={baseY + 18} x2={x0 - 18} y2={baseY + 18} stroke="#14213d" strokeWidth={2} />
          <text x={x0 - 30} y={(topY + baseY) / 2} transform={`rotate(-90 ${x0 - 30} ${(topY + baseY) / 2})`} textAnchor="middle" fontFamily="Barlow Semi Condensed, Arial Narrow, sans-serif" fontWeight={700} fontSize={18} fill="#14213d">
            maks. {p.maxHeightCm} cm
          </text>
        </g>
      )}
      <text x={x0 + W / 2} y={312} textAnchor="middle" fontFamily="Atkinson Hyperlegible, sans-serif" fontSize={14} fill="#44506a">
        {layers} lag × {units} kolli
      </text>
    </svg>
  );
}
