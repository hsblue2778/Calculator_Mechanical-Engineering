// pump-hvac 단위 정의

export const FLOW_UNITS_PUMP = [
  { key: 'm3h',  label: 'm³/h',  toM3s: 1 / 3600 },
  { key: 'lpm',  label: 'LPM',   toM3s: 1 / 60000 },
] as const;
export type FlowUnitPumpKey = typeof FLOW_UNITS_PUMP[number]['key'];

export const LENGTH_UNITS = [
  { key: 'm',  label: 'm',  toM: 1 },
  { key: 'ft', label: 'ft', toM: 0.3048 },
] as const;
export type LengthUnitKey = typeof LENGTH_UNITS[number]['key'];

// 압력 단위 (잔류압력 P_res)
export const PRESSURE_UNITS_PUMP = [
  { key: 'kPa',    label: 'kPa',     toPa: 1000 },
  { key: 'mAq',    label: 'mAq',     toPa: 9806.65 },
  { key: 'kgfcm2', label: 'kgf/cm²', toPa: 98066.5 },
] as const;
export type PressureUnitPumpKey = typeof PRESSURE_UNITS_PUMP[number]['key'];

// 동력 단위
export const POWER_UNITS = [
  { key: 'kW', label: 'kW', fromW: 1 / 1000 },
  { key: 'HP', label: 'HP', fromW: 1 / 745.7 },
] as const;
export type PowerUnitKey = typeof POWER_UNITS[number]['key'];

// 단위계 필터 헬퍼 — 한국식(kr)이면 ft·HP 제외, 미국식(us)이면 전체 반환
import type { UnitSystem } from '../../state/unitSystemStore';

export function getLengthUnits(us: UnitSystem) {
  return us === 'kr' ? LENGTH_UNITS.filter(u => u.key !== 'ft') : LENGTH_UNITS;
}

export function getPowerUnits(us: UnitSystem) {
  return us === 'kr' ? POWER_UNITS.filter(u => u.key !== 'HP') : POWER_UNITS;
}
