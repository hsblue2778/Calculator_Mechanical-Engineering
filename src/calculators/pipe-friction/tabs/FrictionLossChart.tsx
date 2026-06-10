// 마찰손실선도 — 유량(L/min) × 단위 마찰손실(mmAq/m) log-log 평면에
// 표준 호칭경 관경선 + 등유속 곡선 + 운전점 표시 (참조: 배관 마찰손실수두 선도)
//
// Moody 선도가 보편 무차원 차트인 것과 달리 이 선도는 재질 ε·유체 ν·ρ에 종속된다 —
// 인쇄 선도를 그대로 옮기지 않고, 현재 입력 조건으로 엔진(frictionFactor)이 선군을 매번 재생성한다.

import { useMemo } from 'react';
import { PIPE_SIZE_MATERIALS } from '../../../data/pipeSizes';
import type { PFMaterialId } from '../../../data/pipeRoughness';
import { frictionFactor, type PipeFrictionResult } from '../engine.ts';
import type { PipeFrictionController } from '../usePipeFrictionState.ts';
import { C } from '../styles';
import { HALO, logRange, logTicks, tickCeil, tickFloor } from './chartUtils';

// 플롯 영역 (viewBox 720×420)
const W = 720, H = 420;
const X0 = 56, X1 = 700, Y0 = 22, Y1 = 372;

// 참조 선도의 눈금 체계 — x: 1,2,3,4,5,6,8 · y: 1,2,3,4,6,8 (×10ⁿ)
const MANT_X = [1, 2, 3, 4, 5, 6, 8] as const;
const MANT_Y = [1, 2, 3, 4, 6, 8] as const;

const V_CURVES = [0.3, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0];

// mmAq 환산 표준 중력 (결과 패널 압력 환산과 동일 기준)
const MMAQ = 9.80665;

// 재질 → 표준 치수표 (pipeSizes.ts 읽기 전용) — PVDF는 PVC Sch80 치수 대용
const SIZE_TABLE: Record<PFMaterialId, { tableId: string; substitute?: boolean }> = {
  steel:  { tableId: 'sgp' },
  sts304: { tableId: 'sts10s' },
  copper: { tableId: 'copper' },
  pvc:    { tableId: 'pvc-cpvc' },
  pvdf:   { tableId: 'pvc-cpvc', substitute: true },
};

export default function FrictionLossChart({ pf }: { pf: PipeFrictionController }) {
  const { res, st } = pf;
  const matId = st.materialId;
  const m = useMemo(() => (res ? buildModel(res, matId) : null), [res, matId]);
  if (!res || !m) return null;

  const chip = `Q = ${fmtVal(m.Qpt)} L/min · R = ${fmtVal(m.Rpt)} mmAq/m`;
  const chipRight = m.px > X1 - 190;
  const chipBelow = m.py < Y0 + 48;
  const chipX = chipRight ? m.px - 12 : m.px + 12;
  const chipY = chipBelow ? m.py + 22 : m.py - 26;

  return (
    <div style={{
      backgroundColor: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: '16px 20px',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.heading }}>
        마찰손실선도 <span style={{ fontSize: 11, fontWeight: 400, color: C.text }}>— 유량 × 단위 마찰손실</span>
      </div>
      <div style={{ fontSize: 11, color: C.text, margin: '2px 0 10px' }}>
        대각선 = 호칭경(내경 기준) · 역대각 곡선 = 유속 · ● 운전점 — 선군은 현재 조건(ε·ν·ρ)으로 재계산
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img" aria-label={`마찰손실선도 — 운전점 ${chip}`}>
        <defs>
          <clipPath id="pf-floss-clip"><rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} /></clipPath>
        </defs>

        {/* 격자 + 축 눈금 */}
        {m.xTicks.map(v => (
          <g key={`x${v}`}>
            <line x1={m.x(v)} y1={Y0} x2={m.x(v)} y2={Y1} stroke={C.border} opacity={Number.isInteger(Math.log10(v)) ? 1 : 0.5} />
            <text x={m.x(v)} y={Y1 + 14} textAnchor="middle" fontSize={9.5} fill={C.text}>{fmtTick(v)}</text>
          </g>
        ))}
        {m.yTicks.map(v => (
          <g key={`y${v}`}>
            <line x1={X0} y1={m.y(v)} x2={X1} y2={m.y(v)} stroke={C.border} opacity={Number.isInteger(Math.log10(v)) ? 1 : 0.5} />
            <text x={X0 - 5} y={m.y(v) + 3} textAnchor="end" fontSize={9.5} fill={C.text}>{fmtTick(v)}</text>
          </g>
        ))}
        <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} fill="none" stroke={C.borderInput} />

        {/* 축 제목 */}
        <text x={(X0 + X1) / 2} y={H - 6} textAnchor="middle" fontSize={11} fill={C.textDark}>단위 마찰손실 R (mmAq/m)</text>
        <text x={13} y={(Y0 + Y1) / 2} textAnchor="middle" fontSize={11} fill={C.textDark}
          transform={`rotate(-90 13 ${(Y0 + Y1) / 2})`}>유량 Q (L/min)</text>

        {/* 관경선 + 등유속 곡선 */}
        <g clipPath="url(#pf-floss-clip)">
          {m.dLines.map(l => (
            <polyline key={l.label} points={l.points} fill="none" stroke={C.borderInput} strokeWidth={1.1} />
          ))}
          {m.vCurves.map(l => (
            <polyline key={l.label} points={l.points} fill="none" stroke={C.borderInput} strokeWidth={0.8} opacity={0.75} />
          ))}
          {m.dLines.map(l => l.lab && (
            <text key={`dl${l.label}`} x={l.lab.x} y={l.lab.y - 4} textAnchor="middle" fontSize={9.5} fontWeight={600}
              fill={C.textDark} style={HALO} transform={`rotate(${l.lab.angle} ${l.lab.x} ${l.lab.y})`}>{l.label}</text>
          ))}
          {m.vCurves.map(l => l.lab && (
            <text key={`vl${l.label}`} x={l.lab.x} y={l.lab.y - 4} textAnchor="middle" fontSize={9}
              fill={C.text} style={HALO} transform={`rotate(${l.lab.angle} ${l.lab.x} ${l.lab.y})`}>{l.label}</text>
          ))}
        </g>

        {/* 운전점 — 크로스헤어 + 마커 + 라벨 */}
        <line x1={X0} y1={m.py} x2={m.px} y2={m.py} stroke={C.navy} strokeDasharray="3 3" opacity={0.55} />
        <line x1={m.px} y1={m.py} x2={m.px} y2={Y1} stroke={C.navy} strokeDasharray="3 3" opacity={0.55} />
        <circle cx={m.px} cy={m.py} r={5} fill={C.navy} stroke={C.surface} strokeWidth={2} />
        <text x={chipX} y={chipY} textAnchor={chipRight ? 'end' : 'start'} fontSize={11.5} fontWeight={600}
          fill={C.heading} style={HALO}>{chip}</text>
        <text x={chipX} y={chipY + 14} textAnchor={chipRight ? 'end' : 'start'} fontSize={10}
          fill={C.text} style={HALO}>
          V = {res.V_ms.toFixed(2)} m/s{res.fMethod === 'override' ? ' · 수동 f — 선군과 무관' : ''}
        </text>
      </svg>

      <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 8 }}>
        관경선 = {m.tableNote} 내경 기준{m.substitute ? ' (PVDF는 PVC Sch80 치수 대용)' : ''} · ε = {res.eps_mm} mm ·
        현재 유체 ν·ρ 반영 — 재질·유체·온도 변경 시 선군 전체가 다시 계산됩니다.
        임의 내경 입력 시 운전점은 관경선 사이에 위치할 수 있습니다.
      </div>
    </div>
  );
}

function fmtVal(v: number): string {
  return v >= 1000 ? Math.round(v).toLocaleString() : String(parseFloat(v.toPrecision(3)));
}

function fmtTick(v: number): string {
  return v >= 1000 ? v.toLocaleString() : String(parseFloat(v.toPrecision(3)));
}

// ── 좌표 모델 (조건 변경 시에만 재계산) ──────────────────────────
function buildModel(res: PipeFrictionResult, matId: PFMaterialId) {
  const spec = SIZE_TABLE[matId];
  const table = PIPE_SIZE_MATERIALS.find(t => t.id === spec.tableId)!;
  const nu = res.nu_m2s, rho = res.rho_kgm3;
  const eps_m = res.eps_mm / 1000;

  // 단위 마찰손실 [mmAq/m] — 엔진과 동일한 영역별 f 사용
  const unitLoss = (D_m: number, V: number): number => {
    const Re = V * D_m / nu;
    const f = frictionFactor(Re, eps_m / D_m).f;
    return (f * rho * V * V) / (2 * D_m) / MMAQ;
  };

  // 운전점 + 도메인 (기본 x 1~400 · y 1~10,000 — 참조 선도와 동일, 운전점 포함하도록 확장)
  const Rpt = res.deltaP_per_m_Pa / MMAQ;
  const Qpt = res.Q_m3s * 60000;
  const xMin = Math.min(1, tickFloor(Rpt * 0.6, MANT_X));
  const xMax = Math.max(400, tickCeil(Rpt * 1.5, MANT_X));
  const yMin = Math.min(1, tickFloor(Qpt * 0.6, MANT_Y));
  const yMax = Math.max(10000, tickCeil(Qpt * 1.5, MANT_Y));

  const lx0 = Math.log10(xMin), lx1 = Math.log10(xMax);
  const ly0 = Math.log10(yMin), ly1 = Math.log10(yMax);
  const x = (r: number) => X0 + ((Math.log10(r) - lx0) / (lx1 - lx0)) * (X1 - X0);
  const y = (q: number) => Y1 - ((Math.log10(q) - ly0) / (ly1 - ly0)) * (Y1 - Y0);

  const toPx = (pts: [number, number][]) => pts.map(([r, q]) => [x(r), y(q)] as [number, number]);
  const toStr = (pts: [number, number][]) => pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');

  // 관경선: 호칭경별 내경 고정, Q를 y도메인 전체로 스윕
  const qSweep = logRange(yMin, yMax, 40).map(q => q / 60000);
  const dLines = table.sizes.map(s => {
    const D = s.id_mm / 1000;
    const px = toPx(qSweep.map(Q => {
      const V = (4 * Q) / (Math.PI * D * D);
      return [unitLoss(D, V), Q * 60000] as [number, number];
    }));
    return { label: `${s.nominalA}A`, points: toStr(px), lab: lineLabel(px, 'anti') };
  });
  const dLabs = dLines.map(l => l.lab).filter(l => l !== null);

  // 등유속 곡선: V 고정, D 스윕 (4~800mm) — 라벨은 관경선 라벨을 피해 배치
  const dSweep = logRange(0.004, 0.8, 55);
  const vCurves = V_CURVES.map(V => {
    const px = toPx(dSweep.map(D => {
      const Q = (Math.PI * D * D * V) / 4;
      return [unitLoss(D, V), Q * 60000] as [number, number];
    }));
    return { label: `V=${V.toFixed(1)}`, points: toStr(px), lab: lineLabel(px, 'main', dLabs) };
  });

  return {
    x, y, dLines, vCurves, Rpt, Qpt,
    px: x(Rpt), py: y(Qpt),
    xTicks: logTicks(xMin, xMax, MANT_X),
    yTicks: logTicks(yMin, yMax, MANT_Y),
    tableNote: table.description,
    substitute: !!spec.substitute,
  };
}

// 라벨 위치: 선이 플롯 대각선을 지나는 지점에 선 기울기로 회전 배치
// anti = ↘ 대각선(관경선용) · main = ↗ 대각선(등유속선용) — 두 선군이 서로 수직 교차하므로 자연스럽게 분산됨
// 두 대각선이 중앙에서 만나 라벨이 겹치지 않도록 어긋나게 배치하고, avoid(기배치 라벨) 30px 이내는 회피
function lineLabel(ptsPx: [number, number][], diag: 'anti' | 'main', avoid: { x: number; y: number }[] = []) {
  let best = -1, bestScore = Infinity;
  ptsPx.forEach(([px, py], i) => {
    if (px < X0 + 16 || px > X1 - 16 || py < Y0 + 16 || py > Y1 - 16) return;
    const u = (px - X0) / (X1 - X0), w = (py - Y0) / (Y1 - Y0);
    let score = diag === 'anti' ? Math.abs(u - w + 0.12) : Math.abs(u + w - 1.18);
    if (avoid.some(a => Math.hypot(px - a.x, py - a.y) < 30)) score += 10;
    if (score < bestScore) { bestScore = score; best = i; }
  });
  if (best < 0) return null;
  const a = ptsPx[Math.max(0, best - 1)], b = ptsPx[Math.min(ptsPx.length - 1, best + 1)];
  let angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  return { x: ptsPx[best][0], y: ptsPx[best][1], angle };
}
