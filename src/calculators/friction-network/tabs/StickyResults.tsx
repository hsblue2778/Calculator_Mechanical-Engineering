// 계통 압력손실 — 우측 sticky 실시간 결과 패널 (관경 계산기 StickyResults 스타일 차용)
// 히어로: 정압 여유/부족 판정 (가용정압 미입력 시 최대 누적손실+요구압)

import { FN_PA_PER_MMAQ } from '../../../data/frictionNetworkRef.ts';
import type { FNNetworkResult, FNFlowUnit } from '../calc';

interface Props {
  net: FNNetworkResult | null;
  flowUnit: FNFlowUnit;
  pAvailEntered: boolean;
}

const asideStyle: React.CSSProperties = {
  width: 280, flexShrink: 0,
  borderLeft: '1px solid var(--border-subtle)',
  paddingLeft: 14, marginLeft: 12,
  position: 'sticky', top: 0, alignSelf: 'flex-start',
  maxHeight: 'calc(90vh - 120px)', overflowY: 'auto',
  display: 'flex', flexDirection: 'column', gap: 12,
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600,
  color: 'var(--text-tertiary)',
  letterSpacing: 0.5, textTransform: 'uppercase',
  padding: '0 4px',
};

const fmt = (v: number, dp = 1) => Number.isFinite(v) ? v.toFixed(dp) : '—';
const fmtInt = (v: number) => Number.isFinite(v) ? Math.round(v).toLocaleString() : '—';

export default function StickyResults({ net, flowUnit, pAvailEntered }: Props) {
  if (!net) {
    return (
      <aside className="calc-sticky-results" style={asideStyle}>
        <div style={eyebrowStyle}>실시간 결과</div>
        <div
          style={{
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: 24, textAlign: 'center',
            color: 'var(--text-quaternary)', fontSize: 12, lineHeight: 1.6,
          }}
        >
          구간을 입력하면<br/>결과가 표시됩니다
        </div>
      </aside>
    );
  }

  const short = pAvailEntered && net.margin_Pa < 0;
  const heroColor = pAvailEntered
    ? (short ? 'var(--state-error-text)' : 'var(--state-success-text)')
    : 'var(--accent-primary)';
  const pillColor = pAvailEntered
    ? (short ? 'var(--state-error-text)' : 'var(--state-success-text)')
    : 'var(--text-tertiary)';
  const pillBg = pAvailEntered
    ? (short ? 'var(--state-error-bg)' : 'var(--state-success-bg)')
    : 'var(--bg-surface-3)';

  const flowMul = flowUnit === 'LPM' ? 60000 : 3600;
  const worstRow = net.rows.find(r => r.id === net.worstId && !r.error) ?? null;

  return (
    <aside className="calc-sticky-results" style={asideStyle}>
      <div style={eyebrowStyle}>실시간 결과</div>

      {/* 히어로 — 정압 판정 (미입력 시 최대 수요) */}
      <div
        style={{
          background: 'var(--bg-surface-2)',
          borderRadius: 14, padding: 16,
          border: '1px solid var(--border-subtle)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 4,
        }}
      >
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
          {pAvailEntered ? (short ? '정압 부족' : '정압 여유') : '최대 누적손실+요구압'}
        </div>
        <span style={{
          fontSize: 34, fontWeight: 700,
          color: heroColor,
          letterSpacing: '-0.01em',
          display: 'flex', alignItems: 'baseline', gap: 5,
        }}>
          {pAvailEntered ? fmtInt(Math.abs(net.margin_Pa)) : fmtInt(net.worstDemand_Pa)}
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-tertiary)' }}>Pa</span>
        </span>
        <span
          style={{
            padding: '2px 10px', borderRadius: 999,
            fontSize: 11, fontWeight: 600,
            color: pillColor, background: pillBg,
          }}
        >
          {pAvailEntered ? (short ? '▲ 가용정압 초과' : 'OK') : '가용정압 미입력 — 판정 생략'}
        </span>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {pAvailEntered
            ? `${fmt(Math.abs(net.margin_Pa) / FN_PA_PER_MMAQ, 1)} mmAq`
            : `${fmt(net.worstDemand_Pa / FN_PA_PER_MMAQ, 1)} mmAq`}
        </div>
      </div>

      {/* KPI 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Kpi
          label="최대 수요"
          value={fmtInt(net.worstDemand_Pa)}
          unit="Pa"
          subLabel={net.worstId ? `구간 ${net.worstId} ★` : undefined}
        />
        <Kpi
          label="설계 가용정압"
          value={pAvailEntered ? fmtInt(net.designAvail_Pa) : '—'}
          unit={pAvailEntered ? 'Pa' : undefined}
          subLabel={pAvailEntered ? 'P_avail×(1−α)' : '미입력'}
        />
        <Kpi
          label="Σ말단유량"
          value={fmt(net.totalLeafFlow_m3s * flowMul, 1)}
          unit={flowUnit}
        />
        <Kpi
          label="구간 수"
          value={String(net.rows.length)}
          subLabel={net.hasErrors ? '오류 행 있음' : '전체 유효'}
          accent={net.hasErrors ? 'var(--state-warn-text)' : undefined}
          subBg={net.hasErrors ? 'var(--state-warn-bg)' : 'var(--state-success-bg)'}
        />
      </div>

      {/* 계산 결과 상세 */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10, padding: 12,
        }}
      >
        <div
          style={{
            fontSize: 10, fontWeight: 600,
            color: 'var(--text-tertiary)',
            letterSpacing: 0.4, textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          계산 결과 상세
        </div>
        <DetailRow label="최대 수요 (mmAq)" value={fmt(net.worstDemand_Pa / FN_PA_PER_MMAQ, 1)} />
        {worstRow && <DetailRow label="최대 구간 유속" value={`${fmt(worstRow.V_ms, 2)} m/s`} />}
        <DetailRow label="밀도 ρ" value={`${net.rho_kgm3.toFixed(3)} kg/m³`} muted />
        <DetailRow label="동점성 ν" value={`${(net.nu_m2s * 1e6).toFixed(4)} ×10⁻⁶ m²/s`} muted />
      </div>
    </aside>
  );
}

function Kpi({
  label, value, unit, accent, subLabel, subBg,
}: {
  label: string; value: string; unit?: string;
  accent?: string; subLabel?: string; subBg?: string;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-surface-2)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 8, padding: 10,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}
    >
      <div
        style={{
          fontSize: 10, fontWeight: 600,
          color: 'var(--text-tertiary)',
          letterSpacing: 0.3, textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16, fontWeight: 700,
          color: accent ?? 'var(--text-primary)',
          display: 'flex', alignItems: 'baseline', gap: 4,
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
            {unit}
          </span>
        )}
      </div>
      {subLabel && (
        <span
          style={{
            alignSelf: 'flex-start',
            padding: '2px 8px', borderRadius: 999,
            fontSize: 10, fontWeight: 600,
            color: accent ?? 'var(--text-tertiary)',
            background: subBg ?? 'var(--bg-surface-3)',
          }}
        >
          {subLabel}
        </span>
      )}
    </div>
  );
}

function DetailRow({
  label, value, muted,
}: {
  label: string; value: string; muted?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 11.5 }}>
      <span style={{ color: muted ? 'var(--text-quaternary)' : 'var(--text-secondary)' }}>
        {label}
      </span>
      <span
        style={{
          color: muted ? 'var(--text-tertiary)' : 'var(--text-primary)',
          fontWeight: muted ? 500 : 600,
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        }}
      >
        {value}
      </span>
    </div>
  );
}
