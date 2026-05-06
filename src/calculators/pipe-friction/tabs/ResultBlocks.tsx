// 관마찰손실 — 계산 결과 블록 (KPI / 상세 테이블 / 권장 범위 / Mini / 경고)

import Kpi from '../../../components/Kpi';
import Mini from '../../../components/Mini';
import RangeGauge from '../../../components/RangeGauge';
import FlowRegimeBar from '../../../components/FlowRegimeBar';
import WarningList from '../../../components/WarningList';
import {
  RANGES, flowRegime, rangeStatus, warnings, formatRe, toRangeSpec,
  type RegimeInfo, type RangeStatus,
} from '../analysis';
import type { FrictionResult } from '../calc';
import type { PRESSURE_UNITS } from '../units';
import { C } from '../styles';

type PressDef = typeof PRESSURE_UNITS[number];

interface Props {
  res: FrictionResult;
  pressDef: PressDef;
  unitLossDisplay: number | null;
  // v 입력 모드일 때 V 표시 자리에 Q(역환산) 표시로 교체
  // inputMode === 'v' 이고 Q_display 가 제공되면 Kpi·ResultTable·RangeGauge 의 label/value/unit만 교체
  inputMode?: 'Q' | 'v';
  Q_display?: number | null;
  flowUnitLabel?: string;
}

export default function ResultBlocks({
  res, pressDef, unitLossDisplay,
  inputMode = 'Q', Q_display = null, flowUnitLabel = '',
}: Props) {
  const regime = flowRegime(res.Re);
  const rangeV = rangeStatus(res.V_ms, RANGES.velocity);
  const rangeU = rangeStatus(res.unitLoss_Pa, RANGES.unitLossPa);
  const ctx = warnings(res.V_ms, res.Re, res.unitLoss_Pa);
  const deltaP_unit = res.deltaP_Pa * pressDef.factor;

  const isV = inputMode === 'v' && Q_display !== null;
  const topKpiLabel = isV ? '유량 Q' : '유속 V';
  const topKpiValue = isV ? formatFlowValue(Q_display!) : res.V_ms.toFixed(2);
  const topKpiUnit = isV ? flowUnitLabel : 'm/s';

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Kpi label={topKpiLabel} value={topKpiValue} unit={topKpiUnit}
          accent={rangeV.color} size="lg" subLabel={rangeV.label} />
        <Kpi label="총 마찰손실 ΔP"
          value={deltaP_unit.toFixed(pressDef.dp)} unit={pressDef.label} size="lg" />
        <Kpi label="Reynolds" value={formatRe(res.Re)}
          accent={regime.color} size="lg" subLabel={regime.label} />
      </div>

      <ResultTable
        res={res} pressDef={pressDef}
        unitLossDisplay={unitLossDisplay}
        regime={regime} rangeV={rangeV} rangeU={rangeU}
        isV={isV} Q_display={Q_display} flowUnitLabel={flowUnitLabel}
      />

      <RangeCard
        V={res.V_ms} Re={res.Re} unitLoss_Pa={res.unitLoss_Pa}
        rangeV={rangeV} rangeU={rangeU} regime={regime}
        isV={isV} Q_display={Q_display}
      />

      <div style={{
        backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: 14,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <Mini label="단위 마찰손실"
            value={unitLossDisplay !== null ? unitLossDisplay.toFixed(pressDef.dpM) : '—'}
            unit={`${pressDef.label}/m`} />
          <Mini label="수두 hf" value={res.hf_m.toFixed(3)} unit="m" />
          <Mini label="적용 마찰계수 f" value={res.f.toFixed(4)} />
        </div>
      </div>

      <WarningList items={ctx} />
    </>
  );
}

function ResultTable({
  res, pressDef, unitLossDisplay, regime, rangeV, rangeU,
  isV, Q_display, flowUnitLabel,
}: {
  res: FrictionResult;
  pressDef: PressDef;
  unitLossDisplay: number | null;
  regime: RegimeInfo;
  rangeV: RangeStatus;
  rangeU: RangeStatus;
  isV: boolean;
  Q_display: number | null;
  flowUnitLabel: string;
}) {
  const deltaP_unit = res.deltaP_Pa * pressDef.factor;
  const velocityRow = isV && Q_display !== null
    ? { label: '유량 (Q)', value: `${formatFlowValue(Q_display)} ${flowUnitLabel}`,
        badge: { color: rangeV.color, bg: rangeV.bg, label: rangeV.label } }
    : { label: '유속 (V)', value: `${res.V_ms.toFixed(2)} m/s`,
        badge: { color: rangeV.color, bg: rangeV.bg, label: rangeV.label } };
  const rows = [
    velocityRow,
    { label: '레이놀즈수 (Re)', value: formatRe(res.Re), note: regime.desc,
      badge: { color: regime.color, bg: regimeBg(regime.key), label: regime.label } },
    { label: '총 마찰손실 (ΔP)', value: `${deltaP_unit.toFixed(pressDef.dp)} ${pressDef.label}` },
    { label: '단위 마찰손실', value: unitLossDisplay !== null
        ? `${unitLossDisplay.toFixed(pressDef.dpM)} ${pressDef.label}/m`
        : '—',
      badge: { color: rangeU.color, bg: rangeU.bg, label: rangeU.label } },
    { label: '수두 (hf)', value: `${res.hf_m.toFixed(3)} m`, muted: true },
    { label: '적용 마찰계수 (f)', value: res.f.toFixed(4), muted: true },
  ] as const;

  return (
    <div style={{
      backgroundColor: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: '18px 20px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${C.border}`,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.heading }}>계산 결과 상세</span>
        <StatusBadge color={regime.color} bg={regimeBg(regime.key)} label={regime.label} />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          {rows.map((r, i) => {
            const last = i === rows.length - 1;
            const muted = 'muted' in r && r.muted;
            return (
              <tr key={r.label} style={{ borderBottom: last ? 'none' : `1px solid ${C.border}` }}>
                <td style={{ padding: '10px 0', color: muted ? 'var(--text-quaternary)' : C.textDark, width: '40%' }}>
                  {r.label}
                </td>
                <td style={{
                  padding: '10px 0', textAlign: 'right',
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  fontWeight: muted ? 500 : 600,
                  color: muted ? C.text : C.heading,
                  fontSize: 14,
                }}>
                  {r.value}
                </td>
                <td style={{ padding: '10px 0 10px 12px', textAlign: 'right', fontSize: 11, color: 'var(--text-quaternary)', width: 80 }}>
                  {'note' in r ? r.note : ''}
                </td>
                <td style={{ padding: '10px 0 10px 8px', width: 56, textAlign: 'right' }}>
                  {'badge' in r && r.badge && (
                    <StatusBadge color={r.badge.color} bg={r.badge.bg} label={r.badge.label} />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ color, bg, label }: { color: string; bg: string; label: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px',
      fontSize: 11, fontWeight: 600,
      color, backgroundColor: bg,
      borderRadius: 999, minWidth: 44, textAlign: 'center', whiteSpace: 'nowrap',
    }}>{label}</span>
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

function RangeCard({
  V, Re, unitLoss_Pa, rangeV, rangeU, regime,
  isV, Q_display,
}: {
  V: number; Re: number; unitLoss_Pa: number;
  rangeV: RangeStatus; rangeU: RangeStatus; regime: RegimeInfo;
  isV: boolean;
  Q_display: number | null;
}) {
  const vGaugeLabel = isV && Q_display !== null ? '유량 (Q)' : '유속 (V)';
  const vGaugeValue = isV && Q_display !== null ? Q_display : V;
  return (
    <div style={{
      backgroundColor: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: '18px 20px',
    }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.heading }}>권장 범위 대비 현재값</div>
        <div style={{ fontSize: 11, color: C.text, marginTop: 2 }}>
          한국 실무 관행 기준 · 회색 마커 = 현재값
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <RangeGauge
          label={vGaugeLabel} value={vGaugeValue}
          range={toRangeSpec(RANGES.velocity)}
          format={v => v.toString()}
          status={{ label: rangeV.label, color: rangeV.color }}
        />
        <RangeGauge
          label="단위 마찰손실" value={unitLoss_Pa}
          range={toRangeSpec(RANGES.unitLossPa)}
          format={v => v.toFixed(0)}
          status={{ label: rangeU.label, color: rangeU.color }}
        />
      </div>

      <div style={{ marginTop: 18 }}>
        <FlowRegimeBar Re={Re} regime={{ label: regime.label, color: regime.color }} />
      </div>

      <Legend />
    </div>
  );
}

function formatFlowValue(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n >= 100) return n.toFixed(1);
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(3);
}

function Legend() {
  const items = [
    { color: 'var(--state-success-bg)', label: '최적' },
    { color: 'var(--accent-primary-bg)', label: '허용' },
    { color: 'var(--state-error-bg)', label: '권장 외' },
  ];
  return (
    <div style={{
      display: 'flex', gap: 20, marginTop: 16, paddingTop: 12,
      borderTop: `1px dashed ${C.border}`,
    }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.text }}>
          <span style={{
            width: 14, height: 10, backgroundColor: it.color, borderRadius: 2,
          }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
