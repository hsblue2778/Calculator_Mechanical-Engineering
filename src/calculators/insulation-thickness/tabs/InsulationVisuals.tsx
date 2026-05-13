// 냉수배관 보온 두께 — 결과 시각화 (5단계 흐름 + 단면도 + 결로 게이지 + 시판 두께 비교)
// 디자인 출처: 결과 영역 3안 HTML mockup

import {
  COMMERCIAL_THICKNESS_MM, verifyInstalled, type PipeOdSpec, type InsulationOutputs,
} from '../calc';

interface VisualsProps {
  pipe: PipeOdSpec;
  k: number;
  ho: number;
  Ti: number;
  Ta: number;
  RH: number;
  result: InsulationOutputs;
}

export default function InsulationVisuals({
  pipe, k, ho, Ti, Ta, RH: _RH, result,
}: VisualsProps) {
  const { Td, d_recommended_mm, Ts, margin } = result;
  const recommended = d_recommended_mm ?? null;

  return (
    <div className="insulation-visuals-grid">
      <PipeCrossSection od_mm={pipe.od_mm} thickness_mm={recommended} />
      <DewpointGauge Ti={Ti} Ta={Ta} Td={Td} Ts={Ts} margin={margin} />
      <ThicknessComparison
        pipe={pipe} k={k} ho={ho} Ti={Ti} Ta={Ta} Td={Td}
        recommended={recommended}
      />
    </div>
  );
}

// ── 배관 단면도 ─────────────────────────────────────────────

function PipeCrossSection({
  od_mm, thickness_mm,
}: {
  od_mm: number; thickness_mm: number | null;
}) {
  const t = thickness_mm ?? 0;
  const D_outer = od_mm + 2 * t;
  // SVG 좌표: 중심 (140, 120), 외부 원 반지름 100을 D_outer에 대응
  const SVG_OUTER_R = 100;
  const inner_r = od_mm > 0 && D_outer > 0
    ? (od_mm / D_outer) * SVG_OUTER_R
    : 0;

  return (
    <VizCard title="① 배관 단면">
      <svg viewBox="0 0 280 240" style={{ width: '100%' }}>
        <defs>
          <radialGradient id="pipe-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.4" />
          </radialGradient>
        </defs>
        <circle cx="140" cy="120" r={SVG_OUTER_R} fill="url(#pipe-fill)"
          stroke="var(--accent-primary)" strokeWidth="2" />
        <circle cx="140" cy="120" r={inner_r} fill="var(--bg-surface-3)"
          stroke="var(--text-tertiary)" strokeWidth="1.5" />
        {/* 두께 표시 라인 — 우측 */}
        <line x1={140 + inner_r} y1="120" x2={140 + SVG_OUTER_R} y2="120"
          stroke="var(--text-secondary)" strokeWidth="1.5" strokeDasharray="3,3" />
        <text x={140 + (inner_r + SVG_OUTER_R) / 2} y="112"
          fill="var(--text-primary)" fontSize="12" textAnchor="middle" fontWeight="700">
          {thickness_mm != null ? `${thickness_mm}mm` : '—'}
        </text>
        <text x="140" y="14" fill="var(--text-secondary)"
          fontSize="10" textAnchor="middle">
          D외 {D_outer.toFixed(1)}
        </text>
        <text x="140" y="125" fill="var(--text-tertiary)"
          fontSize="10" textAnchor="middle">
          D {od_mm.toFixed(1)}
        </text>
      </svg>
    </VizCard>
  );
}

// ── ③ 결로 안전 게이지 ────────────────────────────────────────

function DewpointGauge({
  Ti, Ta, Td, Ts, margin,
}: {
  Ti: number; Ta: number; Td: number;
  Ts: number | null; margin: number | null;
}) {
  // 가로 게이지: Ti(좌, 0%) ~ Ta(우, 100%)
  const span = Math.max(0.01, Ta - Ti);
  const tdPct = clamp01((Td - Ti) / span);
  const tsPct = Ts != null ? clamp01((Ts - Ti) / span) : null;

  // SVG 좌표 — 라벨 영역을 Y로 완전 분리해 절대 겹치지 않도록 설계
  //   y=14:  Ti / Ta  (게이지 끝점 라벨)
  //   y=44:  Td 라벨  (게이지 위)
  //   y=58~85: 게이지 본체 + Td 세로선 + Ts 원
  //   y=120: Ts 라벨  (게이지 아래)
  //   y=138: 여유 라벨
  const xStart = 30;
  const xEnd = 250;
  const xWidth = xEnd - xStart;
  const tdX = xStart + tdPct * xWidth;
  const tsX = tsPct != null ? xStart + tsPct * xWidth : null;

  const gaugeY = 64;
  const gaugeH = 22;

  // 동적 textAnchor — 라벨이 SVG 우측·좌측 끝에서 잘리지 않도록
  function anchorFor(pct: number): 'start' | 'middle' | 'end' {
    if (pct < 0.12) return 'start';
    if (pct > 0.88) return 'end';
    return 'middle';
  }
  // 좌우 끝에 가까울 때 라벨이 게이지 밖으로 튀어나가지 않도록 X 보정
  function offsetX(pct: number, x: number): number {
    if (pct < 0.12) return Math.max(xStart, x);
    if (pct > 0.88) return Math.min(xEnd, x);
    return x;
  }
  const tdAnchor = anchorFor(tdPct);
  const tdLabelX = offsetX(tdPct, tdX);
  const tsAnchor = tsPct != null ? anchorFor(tsPct) : 'middle';
  const tsLabelX = tsPct != null && tsX != null ? offsetX(tsPct, tsX) : 0;

  const marginColor =
    margin == null ? 'var(--text-tertiary)' :
    margin < 1 ? 'var(--state-error-text)' :
    margin < 3 ? 'var(--state-warn-text)' :
    'var(--state-success-text)';

  return (
    <VizCard title="② 결로 안전 게이지">
      <svg viewBox="0 0 280 160" style={{ width: '100%' }}>
        {/* Ti / Ta — 상단 라벨 (게이지와 분리된 영역) */}
        <text x={xStart} y="14" fill="var(--text-tertiary)" fontSize="10"
          textAnchor="start">
          Ti {Ti.toFixed(0)}° <tspan fill="var(--text-quaternary)">유체</tspan>
        </text>
        <text x={xEnd} y="14" fill="var(--text-tertiary)" fontSize="10"
          textAnchor="end">
          Ta {Ta.toFixed(0)}° <tspan fill="var(--text-quaternary)">외기</tspan>
        </text>

        {/* Td 라벨 — 게이지 위 */}
        <text x={tdLabelX} y="44" fill="var(--state-error-text)" fontSize="11"
          textAnchor={tdAnchor} fontWeight="700">
          Td {Td.toFixed(1)}° <tspan fontWeight="400" fontSize="10">노점</tspan>
        </text>

        {/* 게이지 배경 */}
        <rect x={xStart} y={gaugeY} width={xWidth} height={gaugeH} rx={gaugeH/2}
          fill="var(--bg-surface-3)" />
        {/* Td 이하 (결로 영역) — 빨강 */}
        <rect x={xStart} y={gaugeY} width={tdX - xStart} height={gaugeH} rx={gaugeH/2}
          fill="var(--state-error)" opacity="0.3" />
        {/* Td 위 (안전 영역) — 녹색 */}
        <rect x={tdX} y={gaugeY} width={Math.max(0, xEnd - tdX)} height={gaugeH}
          fill="var(--state-success)" opacity="0.18" />
        {/* Td 세로선 */}
        <line x1={tdX} y1={gaugeY - 8} x2={tdX} y2={gaugeY + gaugeH + 12}
          stroke="var(--state-error-text)" strokeWidth="2" strokeDasharray="4,3" />

        {/* Ts 마커 + 라벨 */}
        {tsX != null && Ts != null && (
          <>
            {/* Ts 세로선 — Td(빨강 점선)와 구분되도록 노랑 실선 */}
            <line x1={tsX} y1={gaugeY - 8} x2={tsX} y2={gaugeY + gaugeH + 12}
              stroke="var(--state-warn-text)" strokeWidth="2" />
            {/* 게이지 중앙의 작은 점 — 위치 강조 */}
            <circle cx={tsX} cy={gaugeY + gaugeH/2} r="3" fill="var(--state-warn-text)" />
            <text x={tsLabelX} y="120" fill="var(--text-primary)" fontSize="12"
              textAnchor={tsAnchor} fontWeight="700">
              Ts {Ts.toFixed(1)}°C <tspan fontWeight="400" fontSize="10" fill="var(--text-tertiary)">표면</tspan>
            </text>
            {margin != null && (
              <text x={tsLabelX} y="138" fill={marginColor} fontSize="11"
                textAnchor={tsAnchor} fontWeight="700">
                여유 {margin >= 0 ? '+' : ''}{margin.toFixed(1)}°C
              </text>
            )}
          </>
        )}
      </svg>
    </VizCard>
  );
}

// ── ④ 시판 두께별 여유 막대 차트 ──────────────────────────────

function ThicknessComparison({
  pipe, k, ho, Ti, Ta, Td, recommended,
}: {
  pipe: PipeOdSpec; k: number; ho: number;
  Ti: number; Ta: number; Td: number; recommended: number | null;
}) {
  // 각 시판 두께에 대해 Ts / margin 계산
  const data = COMMERCIAL_THICKNESS_MM.map(t => {
    const { Ts } = verifyInstalled({
      D: pipe.od_m, d_rec_m: t / 1000, Ti, Ta, k, ho,
    });
    const m = Ts - Td;
    return { t, margin: m };
  });

  // 막대 스케일 — 절대값 기준 (음수도 표현)
  const maxAbs = Math.max(0.5, ...data.map(d => Math.abs(d.margin)));
  const baseY = 180; // 0 기준선
  const maxBarH = 100;

  // 막대 배치 — x 위치
  const colW = 36;
  const startX = 50;
  const xs = data.map((_, i) => startX + i * colW);

  function barColor(m: number, isStar: boolean): { fill: string; opacity: number } {
    if (isStar) return { fill: 'var(--state-warn)', opacity: 1 };
    if (m < 0) return { fill: 'var(--state-error)', opacity: 0.8 };
    if (m < 3) return { fill: 'var(--state-warn)', opacity: 0.55 };
    return { fill: 'var(--state-success)', opacity: 0.7 };
  }

  function marginColor(m: number): string {
    if (m < 0) return 'var(--state-error-text)';
    if (m < 3) return 'var(--state-warn-text)';
    return 'var(--state-success-text)';
  }

  return (
    <VizCard title="③ 시판 두께별 여유 (°C)">
      <svg viewBox="0 0 280 240" style={{ width: '100%' }}>
        {/* 0 기준선 */}
        <line x1="35" y1={baseY} x2="265" y2={baseY}
          stroke="var(--text-tertiary)" strokeDasharray="3,3" />
        <text x="30" y={baseY + 4} fill="var(--text-tertiary)"
          fontSize="9" textAnchor="end">0</text>
        {/* 안내 라벨 */}
        <text x="20" y="20" fill="var(--text-tertiary)" fontSize="10">
          막대 = 노점 대비 여유
        </text>
        {data.map((d, i) => {
          const isStar = d.t === recommended;
          const h = (Math.abs(d.margin) / maxAbs) * maxBarH;
          const y = d.margin >= 0 ? baseY - h : baseY;
          const { fill, opacity } = barColor(d.margin, isStar);
          const x = xs[i];
          return (
            <g key={d.t}>
              <rect x={x} y={y} width={28} height={h}
                fill={fill} opacity={opacity} rx="2"
                {...(isStar ? {
                  stroke: 'var(--bg-surface)',
                  strokeWidth: 2,
                } : {})}
              />
              {isStar && (
                <text x={x + 14} y={y - 6} fill="var(--text-primary)"
                  fontSize="9" textAnchor="middle" fontWeight="700">
                  ★추천
                </text>
              )}
              <text x={x + 14} y="208" fill={isStar ? 'var(--state-warn-text)' : 'var(--text-secondary)'}
                fontSize="10" textAnchor="middle"
                fontWeight={isStar ? 700 : 400}>
                {d.t}
              </text>
              <text x={x + 14} y="222" fill={marginColor(d.margin)}
                fontSize="9" textAnchor="middle" fontWeight="600">
                {d.margin >= 0 ? '+' : ''}{d.margin.toFixed(1)}
              </text>
            </g>
          );
        })}
      </svg>
    </VizCard>
  );
}

// ── 공용: 카드 래퍼 ───────────────────────────────────────────

function VizCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 8, padding: 14,
    }}>
      <div style={{
        fontSize: 11, color: 'var(--text-tertiary)',
        letterSpacing: 1, marginBottom: 8,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
