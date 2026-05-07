// 관경 계산기 — 우측 sticky 실시간 결과 패널 (펌프 시스템 StickyResults 스타일 차용)

import { AlertTriangle } from 'lucide-react';
import {
  type SizingRow,
  velocityStatus,
  VELOCITY_RECOMMENDED_MIN, VELOCITY_RECOMMENDED_MAX,
} from '../calc';
import { PRESSURE_UNITS, type PressureUnitKey } from '../../pipe-friction/units';
import { mmAqToDisplay } from '../units';
import {
  RANGES, flowRegime, rangeStatus, formatRe,
  type RegimeInfo,
} from '../../pipe-friction/analysis';
import { PA_PER_MM_AQ } from '../styles';
import type { PipeMaterialSize } from '../../../data/pipeSizes';

interface Props {
  selected: SizingRow | null;
  noSolution: boolean;
  mat: PipeMaterialSize;
  pressureUnit: PressureUnitKey;
}

export default function StickyResults({ selected, noSolution, mat, pressureUnit }: Props) {
  const pressDef = PRESSURE_UNITS.find(u => u.key === pressureUnit)!;

  if (!selected) {
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
        {noSolution ? (
          <div
            style={{
              background: 'var(--state-warn-bg)',
              border: '1px solid var(--state-warn)',
              borderRadius: 10, padding: 14,
              display: 'flex', alignItems: 'flex-start', gap: 8,
              color: 'var(--state-warn-text)', fontSize: 12, lineHeight: 1.5,
            }}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>선택 가능한 관경이 없습니다. 유량을 줄이거나 허용 압력강하를 높이세요. (현재 최대 {mat.sizes[mat.sizes.length - 1].nominalA}A)</span>
          </div>
        ) : (
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
        )}
      </aside>
    );
  }

  const v = selected.v_ms;
  const vStat = velocityStatus(v);
  const vColor =
    vStat === 'ok' ? 'var(--state-success-text)' :
    vStat === 'high' ? 'var(--state-error-text)' :
    'var(--state-warn-text)';
  const vBg =
    vStat === 'ok' ? 'var(--state-success-bg)' :
    vStat === 'high' ? 'var(--state-error-bg)' :
    'var(--state-warn-bg)';
  const vLabel =
    vStat === 'ok' ? '권장' :
    vStat === 'high' ? '과다' : '저속';

  const drop_display = mmAqToDisplay(selected.dropPerM_mmAqPerM, pressureUnit);
  const D_m = selected.size.id_mm / 1000;
  const NU = 1.004e-6;
  const Re = v * D_m / NU;
  const regime = flowRegime(Re);
  const unitLoss_Pa = selected.dropPerM_mmAqPerM * PA_PER_MM_AQ;
  const rangeU = rangeStatus(unitLoss_Pa, RANGES.unitLossPa);

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

      {/* 히어로 — 선정 관경 */}
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
          선정 관경
        </div>
        <span style={{
          fontSize: 36, fontWeight: 700,
          color: 'var(--accent-primary)',
          letterSpacing: '-0.01em',
        }}>
          {selected.size.nominalA}A
        </span>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          ID {selected.size.id_mm.toFixed(1)} mm
        </div>
      </div>

      {/* KPI 그리드 — 유속/Re/단위손실 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Kpi
          label="유속 V"
          value={v.toFixed(2)}
          unit="m/s"
          accent={vColor}
          subLabel={vLabel}
          subBg={vBg}
        />
        <Kpi
          label="Reynolds"
          value={formatRe(Re)}
          accent={regime.color}
          subLabel={regime.label}
          subBg={regimeBg(regime.key)}
        />
        <Kpi
          label="단위 마찰손실"
          value={drop_display.toFixed(pressDef.dp)}
          unit={`${pressDef.label}/m`}
          accent={rangeU.color}
          subLabel={rangeU.label}
          subBg={rangeU.bg}
        />
        <Kpi
          label="내경 ID"
          value={selected.size.id_mm.toFixed(1)}
          unit="mm"
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
        <DetailRow label="선정 관경" value={`${selected.size.nominalA}A`} />
        <DetailRow label="내경 (ID)" value={`${selected.size.id_mm.toFixed(1)} mm`} />
        <DetailRow label="유속 (V)" value={`${v.toFixed(2)} m/s`} />
        <DetailRow label="레이놀즈수 (Re)" value={formatRe(Re)} />
        <DetailRow label="단위 마찰손실" value={`${drop_display.toFixed(pressDef.dp)} ${pressDef.label}/m`} />
        <DetailRow label="재질 마찰계수 (f)" value={mat.frictionFactor.toFixed(4)} muted />
        {vStat !== 'ok' && (
          <div style={{
            marginTop: 6, padding: '6px 8px',
            background: vBg, color: vColor,
            borderRadius: 6, fontSize: 11,
          }}>
            권장 {VELOCITY_RECOMMENDED_MIN}~{VELOCITY_RECOMMENDED_MAX} m/s {vStat === 'low' ? '미만' : '초과'}
          </div>
        )}
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

function regimeBg(key: RegimeInfo['key']): string {
  switch (key) {
    case 'laminar':    return 'var(--state-success-bg)';
    case 'transition': return 'var(--state-warn-bg)';
    case 'turbulent':  return 'var(--accent-primary-bg)';
    default:           return 'var(--bg-surface-3)';
  }
}
