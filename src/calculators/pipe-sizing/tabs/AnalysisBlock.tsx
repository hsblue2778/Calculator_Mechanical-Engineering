// 관경 계산기 — 선정 관경에 대한 권장 범위·유동 영역 분석 (pipe-friction 공용 시각화 활용)

import Kpi from '../../../components/Kpi';
import RangeGauge from '../../../components/RangeGauge';
import WarningList from '../../../components/WarningList';
import {
  RANGES, flowRegime, rangeStatus, warnings, formatRe, toRangeSpec,
  type ContextWarning,
} from '../../pipe-friction/analysis';
import { velocityRange, VELOCITY_RECOMMENDED, type SizingFluid } from '../calc';
import { C } from '../styles';

interface Props {
  V: number;
  Re: number;
  unitLoss_Pa: number;
  fluid?: SizingFluid;
  // 'full' = KPI 그리드 포함 (기존 동작), 'secondary' = RangeCard + 경고만 (KPI는 우측 sticky에서 표시)
  variant?: 'full' | 'secondary';
}

// 공기 권장 유속 기준 경고 — 공유 warnings()의 물 기준 유속 경고(소음·수격 등) 대체
function airVelocityWarnings(V: number): ContextWarning[] {
  if (!Number.isFinite(V) || V <= 0) return [];
  const { min, max } = VELOCITY_RECOMMENDED.air;
  if (V > max) return [{ level: 'warn', title: '유속 과다', msg: `${V.toFixed(2)} m/s — 권장 ${max} m/s 초과: 소음·압력손실 증가` }];
  if (V < min) return [{ level: 'info', title: '저유속', msg: `${V.toFixed(2)} m/s — 권장 ${min} m/s 미만: 관경 축소 검토 가능` }];
  return [];
}

export default function AnalysisBlock({ V, Re, unitLoss_Pa, fluid = 'water', variant = 'full' }: Props) {
  const velRange = velocityRange(fluid);
  const regime = flowRegime(Re);
  const rangeV = rangeStatus(V, velRange);
  const rangeU = rangeStatus(unitLoss_Pa, RANGES.unitLossPa);
  // 물: 공용 warnings 그대로 / 공기: 유속 경고만 공기 기준으로 교체 (단위손실·Re 경고는 유지)
  const ctx = fluid === 'water'
    ? warnings(V, Re, unitLoss_Pa)
    : [
        ...airVelocityWarnings(V),
        ...warnings(V, Re, unitLoss_Pa).filter(w => !w.title.includes('유속')),
      ];

  return (
    <>
      {variant === 'full' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <Kpi label="유속 V" value={V.toFixed(2)} unit="m/s"
            accent={rangeV.color} size="lg" subLabel={rangeV.label} />
          <Kpi label="Reynolds" value={formatRe(Re)}
            accent={regime.color} size="lg" subLabel={regime.label} />
          <Kpi label="단위 마찰손실" value={unitLoss_Pa.toFixed(0)} unit="Pa/m"
            accent={rangeU.color} size="lg" subLabel={rangeU.label} />
        </div>
      )}

      <div style={{
        backgroundColor: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: '18px 20px',
      }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.heading }}>권장 범위 대비 선정 관경</div>
          <div style={{ fontSize: 11, color: C.text, marginTop: 2 }}>
            한국 실무 관행 기준 · 회색 마커 = 선정 관경의 현재값
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          <RangeGauge
            label="유속 (V)" value={V}
            range={toRangeSpec(velRange)}
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
      </div>

      <WarningList items={ctx} />
    </>
  );
}
