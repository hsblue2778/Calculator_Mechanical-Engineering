// pipe-sizing 단위 변환 유틸 — pipe-friction의 units.ts(SI 기반)와 mmAq 사이를 잇는 helper

import {
  PRESSURE_UNITS, type PressureUnitKey,
  convertFlowToSI, convertPressureFromPa,
  type FlowUnitKey,
} from '../pipe-friction/units';
import { MM_AQ_PER_PA, PA_PER_MM_AQ } from './styles';

// 사용자 단위(표시계)의 압력 → mmAq 로 변환
export function displayToMmAq(value: number, unit: PressureUnitKey): number {
  const def = PRESSURE_UNITS.find(u => u.key === unit);
  if (!def) return NaN;
  // def.factor: Pa → unit (multiplier). 역변환 = value / factor
  const pa = value / def.factor;
  return pa * MM_AQ_PER_PA;
}

// mmAq → 사용자 단위
export function mmAqToDisplay(mmAq: number, unit: PressureUnitKey): number {
  return convertPressureFromPa(mmAq * PA_PER_MM_AQ, unit);
}

// 유량 문자열 + 단위 → lpm (엑셀 공식 기준 단위)
export function convertFlowToLpm(value: string, unit: FlowUnitKey): number {
  const q_m3s = convertFlowToSI(value, unit);
  if (!Number.isFinite(q_m3s)) return NaN;
  return q_m3s * 60000;
}
