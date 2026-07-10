// 관마찰손실 — 우측 sticky 실시간 결과 패널 (신규 엔진 PipeFrictionResult 기준)

import { flowRegime, formatRe, rangeStatus, RANGES, type RegimeInfo } from '../analysis';
import { fMethodLabel } from '../interpret.ts';
import { pfFlowUnitDef, convertSIToPFFlow } from '../pfUnits.ts';
import type { PRESSURE_UNITS } from '../units';
import type { PipeFrictionController } from '../usePipeFrictionState.ts';

type PressDef = typeof PRESSURE_UNITS[number];

export default function StickyResults({ pf, pressDef }: { pf: PipeFrictionController; pressDef: PressDef }) {
  const { res, st, derivedField } = pf;

  if (!res) {
    return (
      <aside className="calc-sticky-results" style={asideStyle}>
        <PanelTitle />
        <p style={{ padding: '8px 4px', color: 'var(--text-quaternary)', fontSize: 12, lineHeight: 1.6 }}>
          유량·유속·관경 중 2개와 길이를 입력하면 결과가 표시됩니다
        </p>
      </aside>
    );
  }

  const isWater = st.fluid === 'water';
  const regime = flowRegime(res.Re);
  const rangeV = rangeStatus(res.V_ms, RANGES.velocity);
  const rangeU = rangeStatus(res.deltaP_per_m_Pa, RANGES.unitLossPa);
  const deltaP_unit = res.deltaP_Pa * pressDef.factor;
  const unitLoss_unit = res.deltaP_per_m_Pa * pressDef.factor;
  const flowLabel = pfFlowUnitDef(st.flowUnit).label;
  const Q_disp = convertSIToPFFlow(res.Q_m3s, st.flowUnit);

  const derivedKpi = derivedField === 'V'
    ? { label: '유속 V (자동)', value: res.V_ms.toFixed(3), unit: 'm/s' }
    : derivedField === 'D'
      ? { label: '관경 D (자동)', value: (res.D_m * 1000).toFixed(1), unit: 'mm' }
      : { label: '유량 Q (자동)', value: formatFlowValue(Q_disp), unit: flowLabel };

  return (
    <aside className="calc-sticky-results" style={{ ...asideStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <PanelTitle />

      {/* 히어로 — 총 마찰손실 */}
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
          총 마찰손실 ΔP (Darcy-Weisbach)
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{
            fontSize: 32, fontWeight: 700, color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}>
            {Number.isFinite(deltaP_unit) ? deltaP_unit.toFixed(pressDef.dp) : '—'}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
            {pressDef.label}
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

      {/* KPI 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Kpi label={derivedKpi.label} value={derivedKpi.value} unit={derivedKpi.unit} accent="var(--accent-primary)" />
        <Kpi
          label="Reynolds"
          value={formatRe(res.Re)}
          accent={regime.color}
          subLabel={regime.label}
          subBg={regimeBg(regime.key)}
        />
        <Kpi
          label="단위 마찰손실"
          value={unitLoss_unit.toFixed(pressDef.dpM)}
          unit={`${pressDef.label}/m`}
          accent={isWater ? rangeU.color : undefined}
          subLabel={isWater ? rangeU.label : undefined}
          subBg={isWater ? rangeU.bg : undefined}
        />
        <Kpi
          label="마찰계수 f"
          value={res.f.toFixed(5)}
          subLabel={fMethodLabel(res.fMethod)}
          subBg="var(--accent-primary-bg-soft)"
          accent="var(--text-primary)"
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
        <DetailRow label="유량 (Q)" value={`${formatFlowValue(Q_disp)} ${flowLabel}`} />
        <DetailRow
          label="유속 (V)"
          value={`${res.V_ms.toFixed(2)} m/s`}
          badge={isWater ? { label: rangeV.label, color: rangeV.color, bg: rangeV.bg } : undefined}
        />
        <DetailRow label="관 내경 (D)" value={`${(res.D_m * 1000).toFixed(1)} mm`} />
        <DetailRow label="동점성계수 (ν)" value={`${(res.nu_m2s * 1e6).toPrecision(4)}×10⁻⁶ m²/s`} muted />
        <DetailRow label="밀도 (ρ)" value={`${res.rho_kgm3 < 10 ? res.rho_kgm3.toFixed(4) : res.rho_kgm3.toFixed(1)} kg/m³`} muted />
        <DetailRow label="상대조도 (ε/D)" value={res.relRough.toExponential(2)} muted />
        <DetailRow label="마찰계수 (f)" value={`${res.f.toFixed(5)} · ${fMethodLabel(res.fMethod)}`} />
        <DetailRow
          label="S-J 검산"
          value={res.fSwameeJain !== null ? res.fSwameeJain.toFixed(5) : '적용범위 외'}
          muted
        />
        <DetailRow label="수두 (hL)" value={`${res.hL_m.toFixed(3)} m`} muted />
        {res.hw && (
          <DetailRow label={`H-W 수두 (C=${res.hw.C})`} value={`${res.hw.hL_m.toFixed(3)} m`} muted />
        )}
      </div>
    </aside>
  );
}

const asideStyle: React.CSSProperties = {
  width: 280, flexShrink: 0,
  borderLeft: '1px solid var(--border-subtle)',
  paddingLeft: 14, marginLeft: 12,
  position: 'sticky', top: 0, alignSelf: 'flex-start',
  maxHeight: 'calc(90vh - 120px)', overflowY: 'auto',
};

function PanelTitle() {
  return (
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
  label, value, muted, badge,
}: {
  label: string; value: string; muted?: boolean;
  badge?: { label: string; color: string; bg: string };
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', fontSize: 11.5, gap: 6 }}>
      <span style={{ color: muted ? 'var(--text-quaternary)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {badge && (
          <span style={{
            padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600,
            color: badge.color, background: badge.bg, whiteSpace: 'nowrap',
          }}>{badge.label}</span>
        )}
        <span
          style={{
            color: muted ? 'var(--text-tertiary)' : 'var(--text-primary)',
            fontWeight: muted ? 500 : 600,
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            textAlign: 'right',
          }}
        >
          {value}
        </span>
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
