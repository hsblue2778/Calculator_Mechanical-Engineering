// 관마찰손실 — 우측 sticky 실시간 결과 패널 (펌프 시스템 StickyResults 스타일 차용)

import type { FrictionResult } from '../calc';
import type { PRESSURE_UNITS } from '../units';
import {
  RANGES, flowRegime, rangeStatus, formatRe,
  type RegimeInfo,
} from '../analysis';

type PressDef = typeof PRESSURE_UNITS[number];

interface Props {
  res: FrictionResult | null;
  pressDef: PressDef;
  unitLossDisplay: number | null;
  inputMode: 'Q' | 'v';
  Q_display: number | null;
  flowUnitLabel: string;
}

export default function StickyResults({
  res, pressDef, unitLossDisplay, inputMode, Q_display, flowUnitLabel,
}: Props) {
  if (!res) {
    return (
      <aside
        className="calc-sticky-results"
        style={{
          width: 280, flexShrink: 0,
          borderLeft: '1px solid var(--border-subtle)',
          paddingLeft: 14, marginLeft: 12,
          position: 'sticky', top: 0, alignSelf: 'flex-start',
          maxHeight: 'calc(90vh - 120px)', overflowY: 'auto',
        }}
      >
        <div
          style={{
            fontSize: 11, fontWeight: 600,
            color: 'var(--text-tertiary)',
            letterSpacing: 0.5, textTransform: 'uppercase',
            padding: '0 4px 12px',
          }}
        >
          실시간 결과
        </div>
        <div
          style={{
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: 24, textAlign: 'center',
            color: 'var(--text-quaternary)', fontSize: 12,
          }}
        >
          입력을 시작하면<br/>결과가 표시됩니다
        </div>
      </aside>
    );
  }

  const regime = flowRegime(res.Re);
  const rangeV = rangeStatus(res.V_ms, RANGES.velocity);
  const rangeU = rangeStatus(res.unitLoss_Pa, RANGES.unitLossPa);
  const deltaP_unit = res.deltaP_Pa * pressDef.factor;
  const isV = inputMode === 'v' && Q_display !== null;

  return (
    <aside
      className="calc-sticky-results"
      style={{
        width: 280, flexShrink: 0,
        borderLeft: '1px solid var(--border-subtle)',
        paddingLeft: 14, marginLeft: 12,
        position: 'sticky', top: 0, alignSelf: 'flex-start',
        maxHeight: 'calc(90vh - 120px)', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div
        style={{
          fontSize: 11, fontWeight: 600,
          color: 'var(--text-tertiary)',
          letterSpacing: 0.5, textTransform: 'uppercase',
          padding: '0 4px',
        }}
      >
        실시간 결과
      </div>

      {/* 히어로 — 총 마찰손실 */}
      <ResultHero
        deltaP={deltaP_unit}
        deltaPUnit={pressDef.label}
        deltaPDp={pressDef.dp}
        regime={regime}
      />

      {/* KPI 그리드 — 유속/Re/단위손실/수두 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Kpi
          label={isV ? '유량 Q' : '유속 V'}
          value={isV ? formatFlowValue(Q_display!) : res.V_ms.toFixed(2)}
          unit={isV ? flowUnitLabel : 'm/s'}
          accent={rangeV.color}
          subLabel={rangeV.label}
          subBg={rangeV.bg}
        />
        <Kpi
          label="Reynolds"
          value={formatRe(res.Re)}
          accent={regime.color}
          subLabel={regime.label}
          subBg={regimeBg(regime.key)}
        />
        <Kpi
          label="단위 마찰손실"
          value={unitLossDisplay !== null ? unitLossDisplay.toFixed(pressDef.dpM) : '—'}
          unit={`${pressDef.label}/m`}
          accent={rangeU.color}
          subLabel={rangeU.label}
          subBg={rangeU.bg}
        />
        <Kpi label="수두 hf" value={res.hf_m.toFixed(3)} unit="m" />
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
        {isV
          ? <DetailRow label="유량 (Q)" value={`${formatFlowValue(Q_display!)} ${flowUnitLabel}`} />
          : <DetailRow label="유속 (V)" value={`${res.V_ms.toFixed(2)} m/s`} />}
        <DetailRow label="레이놀즈수 (Re)" value={formatRe(res.Re)} />
        <DetailRow label="총 마찰손실 (ΔP)" value={`${deltaP_unit.toFixed(pressDef.dp)} ${pressDef.label}`} />
        <DetailRow
          label="단위 마찰손실"
          value={unitLossDisplay !== null
            ? `${unitLossDisplay.toFixed(pressDef.dpM)} ${pressDef.label}/m`
            : '—'}
        />
        <DetailRow label="수두 (hf)" value={`${res.hf_m.toFixed(3)} m`} muted />
        <DetailRow label="적용 마찰계수 (f)" value={res.f.toFixed(4)} muted />
      </div>
    </aside>
  );
}

function ResultHero({
  deltaP, deltaPUnit, deltaPDp, regime,
}: {
  deltaP: number; deltaPUnit: string; deltaPDp: number; regime: RegimeInfo;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-surface-2)',
        borderRadius: 14, padding: 16,
        border: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 6,
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
        총 마찰손실 ΔP
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          fontSize: 32, fontWeight: 700, color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
        }}>
          {Number.isFinite(deltaP) ? deltaP.toFixed(deltaPDp) : '—'}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
          {deltaPUnit}
        </span>
      </div>
      <div
        style={{
          padding: '3px 10px', borderRadius: 999,
          fontSize: 11, fontWeight: 600,
          background: regimeBg(regime.key),
          color: regime.color,
        }}
      >
        {regime.label}
      </div>
    </div>
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

function regimeBg(key: RegimeInfo['key']): string {
  switch (key) {
    case 'laminar':    return 'var(--state-success-bg)';
    case 'transition': return 'var(--state-warn-bg)';
    case 'turbulent':  return 'var(--accent-primary-bg)';
    default:           return 'var(--bg-surface-3)';
  }
}

function formatFlowValue(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 100) return n.toFixed(1);
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(3);
}
