// HVAC 펌프 시스템 — CSV 내보내기 행 구성
// ['항목','값','단위','비고'] 4열 규약 + 배관/부속/장비 상세 표 (pipe-friction/csvExport.ts 패턴)

import type { PipeCondition } from '../../data/pipeRoughness.ts';
import type { PumpHvacResult, SystemMode } from './calc';
import type { FluidId } from './configs/types';
import { FLUID_LABELS } from './fluids';

const NPSH_VERDICT_LABELS: Record<PumpHvacResult['NPSHverdict'], string> = {
  'pass': '적정',
  'low-margin': '여유 부족',
  'risk': '캐비테이션 위험',
  'na': 'NPSHr 미입력 — 비교 생략',
};

const CV_VERDICT_LABELS: Record<PumpHvacResult['cvVerdict'], string> = {
  'too-low': '권위 부족',
  'low-margin': '여유 부족',
  'ok': '적정',
  'high-margin': '과대 여유',
  'too-high': '권위 과대',
  'na': 'CV 미입력',
};

export function buildPumpHvacCsvRows(args: {
  result: PumpHvacResult;
  fieldLabel: string;
  systemMode: SystemMode;
  fluid: FluidId;
  tempC: string;
  Q: string;
  flowUnitLabel: string;
  HsStr: string;
  HdStr: string;
  PresStr: string;
  presUnit: string;
  pipeCondition: PipeCondition;
  headMarginStr: string;
  powerMarginStr: string;
  npshrStr: string;
  powerUnitLabel: string;
  powerFactor: number;
}): (string | number)[][] {
  const {
    result: r, fieldLabel, systemMode, fluid, tempC, Q, flowUnitLabel,
    HsStr, HdStr, PresStr, presUnit, pipeCondition,
    headMarginStr, powerMarginStr, npshrStr, powerUnitLabel, powerFactor,
  } = args;
  const isClosed = systemMode === 'closed';

  const rows: (string | number)[][] = [
    ['항목', '값', '단위', '비고'],
    ['계산기', `${fieldLabel} 펌프 시스템`, '', ''],
    ['시스템 방식', isClosed ? '폐회로 (Closed)' : '개방계 (Open)', '', ''],
    ['유체', FLUID_LABELS[fluid], '', `${tempC} °C`],
    ['유량 Q', Q, flowUnitLabel, ''],
    ...(isClosed ? [] : [
      ['흡입 정수두 Hs', HsStr, 'm', ''] as (string | number)[],
      ['토출 정수두 Hd', HdStr, 'm', ''] as (string | number)[],
    ]),
    ['잔류압력', PresStr, presUnit, ''],
    ['배관 상태', pipeCondition === 'new' ? '신관' : '노후', '', ''],
    ['', '', '', ''],
    ['밀도 ρ', r.rho.toFixed(1), 'kg/m³', ''],
    ['동점성계수 ν', r.nu.toExponential(4), 'm²/s', ''],
    ['흡입측 직관손실', r.sucPipeLoss_total_m.toFixed(3), 'm', ''],
    ['토출측 직관손실', r.disPipeLoss_total_m.toFixed(3), 'm', ''],
    ['부속류 손실', r.totalFittingLoss_m.toFixed(3), 'm', ''],
    ['장비류 손실', r.equipLoss_m.toFixed(3), 'm', ''],
    ['정수두', r.staticHead_m.toFixed(2), 'm', isClosed ? '폐회로 = 0' : 'Hd − Hs'],
    ['잔류압력 수두', r.Hres_m.toFixed(2), 'm', ''],
    ['총양정 TDH', r.TDH_m.toFixed(2), 'm', ''],
    ['설계 양정', r.designHead_m.toFixed(2), 'm', `여유율 ${headMarginStr}%`],
    ['이론 동력', (r.theoPower_W * powerFactor).toFixed(2), powerUnitLabel, ''],
    ['설계 동력', (r.designPower_W * powerFactor).toFixed(2), powerUnitLabel, `여유율 ${powerMarginStr}%`],
    ['권장 모터 정격', r.recommendedMotorRating_kW, 'kW', 'IEC 60034-1'],
    ['NPSHa', r.NPSHa_m.toFixed(2), 'm', ''],
    ['NPSHr', npshrStr || '미입력', 'm', NPSH_VERDICT_LABELS[r.NPSHverdict]],
    ['CV 권위 β', r.cvAuthority > 0 ? r.cvAuthority.toFixed(2) : '—', '', CV_VERDICT_LABELS[r.cvVerdict]],
  ];

  const pipes = [...r.sucPipes, ...r.disPipes];
  if (pipes.length > 0) {
    rows.push(['', '', '', '']);
    rows.push(['-- 배관별 손실 --', '', '', '']);
    rows.push(['구분', '재질', '호칭(A)', '두께규격', '길이(m)', '유속(m/s)', 'Re', 'f', '손실(m)']);
    for (const p of pipes) {
      rows.push([
        p.pipeLabel, p.materialNameKo, p.nominalA, p.scheduleLabel,
        p.L_m, p.V_ms.toFixed(3), Math.round(p.Re), p.f.toFixed(5), p.hf_m.toFixed(4),
      ]);
    }
  }

  if (r.fittingDetails.length > 0) {
    rows.push(['', '', '', '']);
    rows.push(['-- 부속류 손실 --', '', '', '']);
    rows.push(['부속', '배관', '명칭', 'K', '수량', '개당 손실(m)', '합계(m)']);
    for (const f of r.fittingDetails) {
      rows.push([f.fittingLabel, f.pipeLabel, f.nameKo, f.K, f.qty, f.h_each_m.toFixed(4), f.h_total_m.toFixed(4)]);
    }
  }

  if (r.equipDetails.length > 0) {
    rows.push(['', '', '', '']);
    rows.push(['-- 장비류 손실 --', '', '', '']);
    rows.push(['장비', '배관', '명칭', 'ΔP(Pa)', '손실수두(m)', 'Dirty 마진']);
    for (const e of r.equipDetails) {
      rows.push([e.equipLabel, e.pipeLabel, e.name, Math.round(e.dP_Pa), e.h_m.toFixed(4), e.dirtyApplied ? '적용' : '—']);
    }
  }

  return rows;
}
