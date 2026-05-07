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
  pipe, k, ho, Ti, Ta, RH, result,
}: VisualsProps) {
  const { Td, d_mm, d_recommended_mm, Ts, margin } = result;
  const recommended = d_recommended_mm ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StepFlow
        Ta={Ta} RH={RH}
        Td={Td}
        d_mm={d_mm}
        recommended={recommended}
        Ts={Ts}
      />
      <div className="insulation-visuals-grid">
        <PipeCrossSection od_mm={pipe.od_mm} thickness_mm={recommended} />
        <DewpointGauge Ti={Ti} Ta={Ta} Td={Td} Ts={Ts} margin={margin} />
        <ThicknessComparison
          pipe={pipe} k={k} ho={ho} Ti={Ti} Ta={Ta} Td={Td}
          recommended={recommended}
        />
      </div>
    </div>
  );
}

// ── ① 5단계 흐름 카드 ─────────────────────────────────────────

function StepFlow({
  Ta, RH, Td, d_mm, recommended, Ts,
}: {
  Ta: number; RH: number; Td: number; d_mm: number;
  recommended: number | null; Ts: number | null;
}) {
  return (
    <div
      className="insulation-step-flow"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 8,
      }}
    >
      <StepCard idx={1} title="외기">
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          {Ta.toFixed(0)}°C / {RH.toFixed(0)}%
        </div>
      </StepCard>
      <StepCard idx={2} title="노점 Td">
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--state-error-text)' }}>
          {Td.toFixed(1)}°C
        </div>
      </StepCard>
      <StepCard idx={3} title="한계 d">
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
          {Number.isFinite(d_mm) ? `${d_mm.toFixed(1)}mm` : '∞'}
        </div>
      </StepCard>
      <StepCard idx={4} title="시판" highlight>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--state-warn-text)' }}>
          {recommended != null ? `★ ${recommended}mm` : '50mm 초과'}
        </div>
      </StepCard>
      <StepCard idx={5} title="검산 Ts">
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--state-success-text)' }}>
          {Ts != null ? `${Ts.toFixed(1)}°C` : '—'}
        </div>
      </StepCard>
    </div>
  );
}

function StepCard({
  idx, title, children, highlight,
}: {
  idx: number; title: string; children: React.ReactNode; highlight?: boolean;
}) {
  return (
    <div style={{
      background: 'var(--bg-surface-2)',
      border: `1px solid ${highlight ? 'var(--state-warn-text)' : 'var(--border-subtle)'}`,
      borderRadius: 8, padding: 10,
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700,
        color: highlight ? 'var(--state-warn-text)' : 'var(--accent-primary)',
        letterSpacing: 1.5,
      }}>
        STEP {idx}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// ── ② 배관 단면도 ─────────────────────────────────────────────

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

  // SVG 좌표: x=20 ~ x=260, 너비 240
  const xStart = 20;
  const xEnd = 260;
  const xWidth = xEnd - xStart;
  const tdX = xStart + tdPct * xWidth;
  const tsX = tsPct != null ? xStart + tsPct * xWidth : null;

  const marginColor =
    margin == null ? 'var(--text-tertiary)' :
    margin < 0 ? 'var(--state-error-text)' :
    margin < 1 ? 'var(--state-error-text)' :
    margin < 3 ? 'var(--state-warn-text)' :
    'var(--state-success-text)';

  return (
    <VizCard title="② 결로 안전 게이지">
      <svg viewBox="0 0 280 240" style={{ width: '100%' }}>
        {/* 게이지 배경 */}
        <rect x={xStart} y="100" width={xWidth} height="22" rx="11"
          fill="var(--bg-surface-3)" />
        {/* Td 이하 (결로 영역) — 빨강 */}
        <rect x={xStart} y="100" width={tdX - xStart} height="22" rx="11"
          fill="var(--state-error)" opacity="0.3" />
        {/* Td 위 (안전 영역) — 녹색 */}
        <rect x={tdX} y="100" width={xEnd - tdX} height="22"
          fill="var(--state-success)" opacity="0.18" />
        {/* Td 세로선 */}
        <line x1={tdX} y1="84" x2={tdX} y2="142"
          stroke="var(--state-error-text)" strokeWidth="2" strokeDasharray="4,3" />
        <text x={tdX} y="78" fill="var(--state-error-text)" fontSize="10"
          textAnchor="middle" fontWeight="700">
          Td {Td.toFixed(1)}°
        </text>
        {/* Ts 마커 */}
        {tsX != null && Ts != null && (
          <>
            <circle cx={tsX} cy="111" r="8" fill="var(--state-warn-text)"
              stroke="var(--bg-surface)" strokeWidth="2" />
            <text x={tsX} y="160" fill="var(--text-primary)" fontSize="12"
              textAnchor="middle" fontWeight="700">
              Ts {Ts.toFixed(1)}°C
            </text>
            {margin != null && (
              <text x={tsX} y="180" fill={marginColor} fontSize="11"
                textAnchor="middle" fontWeight="700">
                여유 {margin >= 0 ? '+' : ''}{margin.toFixed(1)}°C
              </text>
            )}
          </>
        )}
        <text x={xStart + 10} y="78" fill="var(--text-tertiary)" fontSize="9">
          Ti {Ti.toFixed(0)}°
        </text>
        <text x={xEnd - 10} y="78" fill="var(--text-tertiary)" fontSize="9"
          textAnchor="end">
          Ta {Ta.toFixed(0)}°
        </text>
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
