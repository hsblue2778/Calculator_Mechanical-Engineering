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

// 물 배관(0.3~3 m/s)뿐 아니라 공기·가스 배관의 실무 권장유속(10~20 m/s대)까지 커버.
// 도메인 밖 곡선은 클립으로 잘리므로 물 케이스에서는 고속 곡선이 보이지 않는다.
const V_CURVES = [0.3, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10, 15, 20, 30];

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
        대각선 = 호칭경(내경 기준) · 역대각 곡선 = 유속 · ● 운전점 · 음영 = 층류·천이 영역 — 선군은 현재 조건(ε·ν·ρ)으로 재계산
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

        {/* 층류·천이 영역 음영 + Re=2,300·4,000 경계 점선 — 이 영역에서 선군이 곡선으로 꺾임 */}
        <g clipPath="url(#pf-floss-clip)">
          <polygon points={m.lamPoly} fill={C.border} fillOpacity={0.35} />
          <polygon points={m.transPoly} fill={C.border} fillOpacity={0.18} />
          <polyline points={m.c23} fill="none" stroke={C.borderInput} strokeWidth={1} strokeDasharray="5 4" />
          <polyline points={m.c40} fill="none" stroke={C.borderInput} strokeWidth={1} strokeDasharray="2 4" />
          {m.lamLab && (
            <text x={m.lamLab.x} y={m.lamLab.y + 12} textAnchor="middle" fontSize={8.5} fontWeight={600}
              fill={C.text} style={HALO} transform={`rotate(${m.lamLab.angle} ${m.lamLab.x} ${m.lamLab.y + 12})`}>
              층류 영역 (Re&lt;2,300)
            </text>
          )}
          {m.transLab && (
            <text x={m.transLab.x} y={m.transLab.y + 11} textAnchor="middle" fontSize={8}
              fill={C.text} style={HALO} transform={`rotate(${m.transLab.angle} ${m.transLab.x} ${m.transLab.y + 11})`}>
              천이
            </text>
          )}
        </g>

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
        음영 영역(Re&lt;4,000)은 층류(64/Re)·천이(3차 보간) 영역으로, f 공식이 바뀌어 이 구간의 선군은 직선이 아닌
        곡선으로 꺾여 보입니다 (점선 경계 = Re 2,300 · 4,000).
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

  // 단위 마찰손실 [mmAq/m] + Re — 엔진과 동일한 영역별 f 사용
  const loss = (D_m: number, V: number) => {
    const Re = (V * D_m) / nu;
    const f = frictionFactor(Re, eps_m / D_m).f;
    return { R: (f * rho * V * V) / (2 * D_m) / MMAQ, Re };
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

  // 관경선: 호칭경별 내경 고정, Q를 y도메인 전체로 스윕 — 라벨은 난류(직선) 구간 우선
  const qSweep = logRange(yMin, yMax, 40).map(q => q / 60000);
  const dLines = table.sizes.map(s => {
    const D = s.id_mm / 1000;
    const samples = qSweep.map(Q => {
      const V = (4 * Q) / (Math.PI * D * D);
      const { R, Re } = loss(D, V);
      return { pt: [R, Q * 60000] as [number, number], turb: Re >= 4000 };
    });
    const px = toPx(samples.map(s2 => s2.pt));
    return { label: `${s.nominalA}A`, points: toStr(px), lab: lineLabel(px, 'anti', [], samples.map(s2 => s2.turb)) };
  });
  const dLabs = dLines.map(l => l.lab).filter(l => l !== null);

  // 등유속 곡선: V 고정, D 스윕 (4~800mm) — 라벨은 관경선 라벨 회피 + 난류 구간 우선
  const dSweep = logRange(0.004, 0.8, 55);
  const vCurves = V_CURVES.map(V => {
    const samples = dSweep.map(D => {
      const Q = (Math.PI * D * D * V) / 4;
      const { R, Re } = loss(D, V);
      return { pt: [R, Q * 60000] as [number, number], turb: Re >= 4000 };
    });
    const px = toPx(samples.map(s2 => s2.pt));
    const label = `V=${V >= 10 ? V.toFixed(0) : V.toFixed(1)}`;
    return { label, points: toStr(px), lab: lineLabel(px, 'main', dLabs, samples.map(s2 => s2.turb)) };
  });
  const vLabs = vCurves.map(l => l.lab).filter(l => l !== null);

  // 층류·천이 영역 — Re=2,300·4,000 등Re 경계선(D 스윕 매개변수화) 아래가 해당 영역.
  // 이 영역에서는 f 공식이 바뀌어(64/Re·3차 보간) 선군이 곡선으로 꺾인다.
  const bSweep = logRange(0.002, 1.2, 60);
  const reCurve = (ReT: number) => bSweep.map(D => {
    const V = (ReT * nu) / D;
    return [loss(D, V).R, ((Math.PI * D * D * V) / 4) * 60000] as [number, number];
  });
  const c23 = toPx(reCurve(2300));   // D 오름차순: 우하 → 좌상
  const c40 = toPx(reCurve(4000));
  const yAt = (c: [number, number][], i: number) => c[i][1];
  const lamPoly = [
    ...c23,
    [X0 - 40, yAt(c23, c23.length - 1)], [X0 - 40, Y1 + 40],
    [X1 + 40, Y1 + 40], [X1 + 40, yAt(c23, 0)],
  ] as [number, number][];
  const transPoly = [...c23, ...[...c40].reverse()];
  const lamLab = lineLabel(c23, 'main', [...dLabs, ...vLabs]);
  const transLab = lineLabel(c40, 'main', [...dLabs, ...vLabs, ...(lamLab ? [lamLab] : [])]);

  return {
    x, y, dLines, vCurves, Rpt, Qpt,
    c23: toStr(c23), c40: toStr(c40),
    lamPoly: toStr(lamPoly), transPoly: toStr(transPoly),
    lamLab, transLab,
    px: x(Rpt), py: y(Qpt),
    xTicks: logTicks(xMin, xMax, MANT_X),
    yTicks: logTicks(yMin, yMax, MANT_Y),
    tableNote: table.description,
    substitute: !!spec.substitute,
  };
}

// 라벨 위치: 선이 플롯 대각선을 지나는 지점에 선 기울기로 회전 배치
// anti = ↘ 대각선(관경선용) · main = ↗ 대각선(등유속선용) — 두 선군이 서로 수직 교차하므로 자연스럽게 분산됨
// 두 대각선이 중앙에서 만나 라벨이 겹치지 않도록 어긋나게 배치하고, avoid(기배치 라벨) 30px 이내는 회피.
// eligible(난류 구간 여부)이 주어지면 직선 구간을 우선하고, 전부 비적격이면 전체에서 선택
function lineLabel(
  ptsPx: [number, number][], diag: 'anti' | 'main',
  avoid: { x: number; y: number }[] = [], eligible?: boolean[],
) {
  let best = -1, bestScore = Infinity;
  ptsPx.forEach(([px, py], i) => {
    if (px < X0 + 16 || px > X1 - 16 || py < Y0 + 16 || py > Y1 - 16) return;
    const u = (px - X0) / (X1 - X0), w = (py - Y0) / (Y1 - Y0);
    let score = diag === 'anti' ? Math.abs(u - w + 0.12) : Math.abs(u + w - 1.18);
    if (avoid.some(a => Math.hypot(px - a.x, py - a.y) < 30)) score += 10;
    if (eligible && !eligible[i]) score += 100;
    if (score < bestScore) { bestScore = score; best = i; }
  });
  if (best < 0) return null;
  const a = ptsPx[Math.max(0, best - 1)], b = ptsPx[Math.min(ptsPx.length - 1, best + 1)];
  let angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  return { x: ptsPx[best][0], y: ptsPx[best][1], angle };
}
