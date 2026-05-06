// HVAC 펌프 시스템 — 운전점 차트
// 시스템 곡선(H = H_static + k·Q²) + 펌프 H-Q 곡선 family + 교점(운전점) + BEP 영역 시각화
// recharts ComposedChart 사용 — OperatingPointChart.tsx 내에서만 recharts import

import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { SystemCurvePoint, PumpCurveAtHz } from '../calc';

// BEP 적정성 판정
// 80~110% → optimal, 70~80% 또는 110~125% → acceptable, 그 외 → out-of-range
export type BepVerdict = 'optimal' | 'acceptable' | 'out-of-range' | 'na';

export function getBepVerdict(Q_op: number, Q_BEP: number): BepVerdict {
  if (Q_BEP <= 0) return 'na';
  const ratio = Q_op / Q_BEP;
  if (ratio >= 0.8 && ratio <= 1.1) return 'optimal';
  if ((ratio >= 0.7 && ratio < 0.8) || (ratio > 1.1 && ratio <= 1.25)) return 'acceptable';
  return 'out-of-range';
}

// Hz별 색상 팔레트
// 카탈로그 Hz(60) → 진한 녹색, 낮은 Hz로 갈수록 회색 계열
const HZ_COLORS: Record<number, string> = {
  60: '#16a34a',
  55: '#22c594',
  50: '#3ac796',
  45: '#52c898',
  40: '#6ec99c',
  35: '#86c8a3',
  30: '#94a3b8',
};

function getHzColor(hz: number, catalogHz: number): string {
  if (hz === catalogHz) return '#16a34a';
  if (HZ_COLORS[hz]) return HZ_COLORS[hz];
  // 범위 밖 Hz는 기본 회색
  return '#94a3b8';
}

interface Props {
  systemCurve: SystemCurvePoint[];
  pumpCurveFamily: PumpCurveAtHz[];   // 다중 Hz 곡선 (빈 배열이면 곡선 미표시)
  catalogHz: number;                   // 카탈로그 기준 Hz (라벨·색상용)
  BEP_Q_m3h: number | null;            // 카탈로그 Hz 기준 BEP 유량
  operatingPoint: { Q_m3h: number; H_m: number } | null;  // 설계점 (pumpCurveFamily 없을 때 fallback)
  Q_design_m3h: number;
  TDH_design_m: number;
}

export default function OperatingPointChart({
  systemCurve,
  pumpCurveFamily,
  catalogHz,
  BEP_Q_m3h,
  operatingPoint,
  Q_design_m3h,
  TDH_design_m,
}: Props) {
  const hasCurveFamily = pumpCurveFamily.length > 0;

  // 카탈로그 Hz 곡선의 운전점 (BEP 판정·헤더 표시용)
  const catalogCurve = pumpCurveFamily.find(c => c.hz === catalogHz);
  const catalogOpPoint = catalogCurve?.operatingPoint
    ? { Q_m3h: catalogCurve.operatingPoint.Q_m3h, H_m: catalogCurve.operatingPoint.H_m }
    : null;

  // 운전점: 카탈로그 곡선 교점 우선, 없으면 단일 operatingPoint, 없으면 (Q_design, TDH)
  const opPoint = catalogOpPoint ?? operatingPoint ?? { Q_m3h: Q_design_m3h, H_m: TDH_design_m };

  // BEP 판정 (카탈로그 Hz 기준)
  const bepVerdict: BepVerdict = BEP_Q_m3h != null && BEP_Q_m3h > 0
    ? getBepVerdict(opPoint.Q_m3h, BEP_Q_m3h)
    : 'na';

  const bepRatioStr = BEP_Q_m3h != null && BEP_Q_m3h > 0
    ? `BEP의 ${((opPoint.Q_m3h / BEP_Q_m3h) * 100).toFixed(0)}%`
    : null;

  const verdictConfig: Record<BepVerdict, { label: string; color: string; bg: string } | null> = {
    optimal:       { label: '최적 영역', color: '#166534', bg: '#dcfce7' },
    acceptable:    { label: '허용 영역', color: '#92400e', bg: '#fef3c7' },
    'out-of-range': { label: '범위 이탈', color: '#991b1b', bg: '#fee2e2' },
    na: null,
  };
  const vc = verdictConfig[bepVerdict];

  // 차트 X축 범위
  const sysMaxQ = systemCurve.length > 0 ? systemCurve[systemCurve.length - 1].Q_m3h : Q_design_m3h * 1.5;
  const familyMaxQ = hasCurveFamily
    ? Math.max(...pumpCurveFamily.flatMap(c => c.points.map(p => p.Q_m3h)))
    : 0;
  const xMax = Math.max(sysMaxQ, familyMaxQ, Q_design_m3h * 1.5);

  // BEP 영역 X 좌표 계산 (80~110%, 카탈로그 Hz 기준)
  const bepX1 = BEP_Q_m3h != null ? BEP_Q_m3h * 0.8 : null;
  const bepX2 = BEP_Q_m3h != null ? BEP_Q_m3h * 1.1 : null;

  // Y축 최대
  const sysMaxH = systemCurve.length > 0 ? Math.max(...systemCurve.map(p => p.H_m)) : TDH_design_m;
  const familyMaxH = hasCurveFamily
    ? Math.max(...pumpCurveFamily.flatMap(c => c.points.map(p => p.H_m)))
    : 0;
  const yMax = Math.max(sysMaxH, familyMaxH, TDH_design_m) * 1.1;

  // 운전점 Scatter 데이터 (각 Hz별)
  const opScatterData = [{ Q_m3h: opPoint.Q_m3h, H_m: opPoint.H_m }];

  return (
    <div style={{ marginTop: 16 }}>
      {/* 헤더 정보 카드 */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10, alignItems: 'center',
      }}>
        <div style={{
          padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
          backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)',
        }}>
          운전점: Q = {opPoint.Q_m3h.toFixed(1)} m³/h, H = {opPoint.H_m.toFixed(2)} m
        </div>
        {bepRatioStr && vc && (
          <div style={{
            padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
            backgroundColor: vc.bg, color: vc.color,
            border: `1px solid ${vc.color}`,
          }}>
            {bepRatioStr} — {vc.label}
          </div>
        )}
      </div>

      {/* 차트 */}
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis
            dataKey="Q_m3h"
            type="number"
            domain={[0, xMax]}
            label={{ value: 'Q [m³/h]', position: 'insideBottomRight', offset: -5, fontSize: 12 }}
            tickFormatter={(v: number) => v.toFixed(0)}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            dataKey="H_m"
            type="number"
            domain={[0, yMax]}
            label={{ value: 'H [m]', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }}
            tickFormatter={(v: number) => v.toFixed(0)}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value, name) => {
              const v = Number(value);
              const n = String(name);
              const formatted = Number.isFinite(v) ? `${v.toFixed(2)} m` : String(value);
              return [formatted, n] as [string, string];
            }}
            labelFormatter={(label) => `Q = ${Number(label).toFixed(2)} m³/h`}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          {/* BEP 영역 (80~110%, 카탈로그 Hz 기준) */}
          {bepX1 != null && bepX2 != null && (
            <ReferenceArea
              x1={bepX1}
              x2={bepX2}
              fill="#16a34a"
              fillOpacity={0.08}
              stroke="#16a34a"
              strokeOpacity={0.3}
              label={{ value: 'BEP 영역', position: 'top', fontSize: 10, fill: '#16a34a' }}
            />
          )}

          {/* 시스템 곡선 */}
          <Line
            data={systemCurve}
            dataKey="H_m"
            name="시스템 곡선"
            type="monotone"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            legendType="line"
          />

          {/* 펌프 곡선 family (Hz별 다중 곡선) */}
          {hasCurveFamily && pumpCurveFamily.map(curve => {
            const color = getHzColor(curve.hz, catalogHz);
            const isCatalog = curve.hz === catalogHz;
            const sortedPoints = [...curve.points].sort((a, b) => a.Q_m3h - b.Q_m3h);
            return (
              <Line
                key={`pump-${curve.hz}`}
                data={sortedPoints}
                dataKey="H_m"
                name={`${curve.hz}Hz${isCatalog ? ' (카탈로그)' : ''}`}
                type="monotone"
                stroke={color}
                strokeWidth={isCatalog ? 2.5 : 1.5}
                strokeDasharray={isCatalog ? undefined : '5 3'}
                dot={isCatalog ? { r: 3, fill: color } : false}
                legendType="line"
              />
            );
          })}

          {/* 각 Hz별 운전점 Scatter */}
          {hasCurveFamily && pumpCurveFamily.map(curve => {
            if (!curve.operatingPoint) return null;
            const color = getHzColor(curve.hz, catalogHz);
            return (
              <Scatter
                key={`op-${curve.hz}`}
                data={[{ Q_m3h: curve.operatingPoint.Q_m3h, H_m: curve.operatingPoint.H_m }]}
                dataKey="H_m"
                name={`운전점 ${curve.hz}Hz`}
                fill={color}
                r={5}
                legendType="none"
              />
            );
          })}

          {/* 단일 운전점 (family 없을 때 fallback) */}
          {!hasCurveFamily && (
            <>
              <ReferenceLine
                x={opPoint.Q_m3h}
                stroke="#ef4444"
                strokeDasharray="4 3"
                strokeWidth={1}
              />
              <ReferenceLine
                y={opPoint.H_m}
                stroke="#ef4444"
                strokeDasharray="4 3"
                strokeWidth={1}
              />
              <Scatter
                data={opScatterData}
                dataKey="H_m"
                name="운전점"
                fill="#ef4444"
                r={6}
                legendType="circle"
              />
            </>
          )}

          {/* family 있을 때 카탈로그 Hz 교점 십자선 */}
          {hasCurveFamily && catalogOpPoint && (
            <>
              <ReferenceLine
                x={catalogOpPoint.Q_m3h}
                stroke="#ef4444"
                strokeDasharray="4 3"
                strokeWidth={1}
              />
              <ReferenceLine
                y={catalogOpPoint.H_m}
                stroke="#ef4444"
                strokeDasharray="4 3"
                strokeWidth={1}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* 범례 보충 설명 */}
      {!hasCurveFamily && (
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '6px 0 0 0', textAlign: 'center' }}>
          펌프 카탈로그 H-Q 곡선 점을 2개 이상 입력하면 펌프 곡선과 교점이 표시됩니다.
        </p>
      )}

      {/* 인버터 운전 시리즈 표 */}
      {hasCurveFamily && (
        <InverterSeriesTable
          curveFamily={pumpCurveFamily}
          catalogHz={catalogHz}
          BEP_Q_m3h={BEP_Q_m3h}
        />
      )}
    </div>
  );
}

// ── 인버터 운전 시리즈 표 ─────────────────────────────────────────
const BEP_VERDICT_LABEL: Record<string, string> = {
  optimal:        '최적',
  acceptable:     '허용',
  'out-of-range': '권장 외',
  na:             '—',
};

const BEP_VERDICT_STYLE: Record<string, React.CSSProperties> = {
  optimal:        { color: '#166534', backgroundColor: '#dcfce7', padding: '2px 7px', borderRadius: 10, fontWeight: 600, fontSize: 12 },
  acceptable:     { color: '#92400e', backgroundColor: '#fef3c7', padding: '2px 7px', borderRadius: 10, fontWeight: 600, fontSize: 12 },
  'out-of-range': { color: '#991b1b', backgroundColor: '#fee2e2', padding: '2px 7px', borderRadius: 10, fontWeight: 600, fontSize: 12 },
  na:             { color: 'var(--text-tertiary)', fontSize: 12 },
};

function InverterSeriesTable({
  curveFamily,
  catalogHz,
  BEP_Q_m3h,
}: {
  curveFamily: PumpCurveAtHz[];
  catalogHz: number;
  BEP_Q_m3h: number | null;
}) {
  const hasBep = BEP_Q_m3h != null && BEP_Q_m3h > 0;
  const thS: React.CSSProperties = {
    border: '1px solid var(--border-subtle)', padding: '6px 10px',
    fontWeight: 600, fontSize: 12, textAlign: 'left',
    color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface-2)',
  };
  const tdS: React.CSSProperties = {
    border: '1px solid var(--border-subtle)', padding: '6px 10px', fontSize: 13,
  };

  return (
    <div style={{ marginTop: 14 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
        인버터(VFD) 운전 시리즈
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <thead>
            <tr>
              <th style={thS}>Hz</th>
              <th style={{ ...thS, textAlign: 'right' }}>Q [m³/h]</th>
              <th style={{ ...thS, textAlign: 'right' }}>H [m]</th>
              <th style={{ ...thS, textAlign: 'right' }}>P [kW]</th>
              {hasBep && <th style={{ ...thS, textAlign: 'right' }}>BEP %</th>}
              {hasBep && <th style={thS}>적정성</th>}
            </tr>
          </thead>
          <tbody>
            {curveFamily.map(curve => {
              const isCatalog = curve.hz === catalogHz;
              const op = curve.operatingPoint;
              // BEP % — BEP 유량도 상사칙으로 변환
              const bepQAtHz = hasBep && catalogHz > 0
                ? (BEP_Q_m3h! * curve.hz / catalogHz)
                : null;
              const bepPct = op && bepQAtHz
                ? (op.Q_m3h / bepQAtHz) * 100
                : null;

              return (
                <tr key={curve.hz} style={isCatalog ? { backgroundColor: 'var(--accent-primary-bg-soft)' } : undefined}>
                  <td style={{ ...tdS, fontWeight: isCatalog ? 600 : 400 }}>
                    {curve.hz} Hz
                    {isCatalog && (
                      <span style={{ marginLeft: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>(카탈로그)</span>
                    )}
                  </td>
                  <td style={{ ...tdS, textAlign: 'right' }}>
                    {op ? op.Q_m3h.toFixed(2) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                  </td>
                  <td style={{ ...tdS, textAlign: 'right' }}>
                    {op ? op.H_m.toFixed(2) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                  </td>
                  <td style={{ ...tdS, textAlign: 'right' }}>
                    {op ? (op.P_W / 1000).toFixed(3) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                  </td>
                  {hasBep && (
                    <td style={{ ...tdS, textAlign: 'right' }}>
                      {bepPct != null && op ? `${bepPct.toFixed(0)}%` : '—'}
                    </td>
                  )}
                  {hasBep && (
                    <td style={tdS}>
                      <span style={BEP_VERDICT_STYLE[curve.bepVerdict] ?? {}}>
                        {BEP_VERDICT_LABEL[curve.bepVerdict] ?? '—'}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '4px 0 0 0' }}>
        상사칙(Affinity Laws): Q∝N, H∝N², P∝N³ (N∝Hz) — 출처: Hydraulic Institute Standards / ISO 9906 / ASHRAE Pump Handbook
      </p>
      {curveFamily.some(c => !c.operatingPoint) && (
        <p style={{ fontSize: 11, color: '#92400e', margin: '4px 0 0 0' }}>
          — 표시: 해당 Hz에서 펌프 양정이 시스템 정수두보다 낮아 운전점 없음 (교점 불가)
        </p>
      )}
    </div>
  );
}
