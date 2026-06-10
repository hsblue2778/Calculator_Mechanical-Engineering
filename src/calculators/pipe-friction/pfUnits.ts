// pipe-friction 전용 유량 단위 (m³/min 포함 확장판)
//
// 공유 units.ts의 FLOW_UNITS(m³/h·LPM)는 pipe-sizing이 import하므로 불변 유지 —
// m³/min 옵션이 다른 계산기 UI로 새지 않도록 여기서 별도 정의한다.

export const PF_FLOW_UNITS = [
  { key: 'm3h',   label: 'm³/h',   divisor: 3600 },
  { key: 'lpm',   label: 'LPM',    divisor: 60000 },
  { key: 'm3min', label: 'm³/min', divisor: 60 },
] as const;

export type PFFlowUnitKey = typeof PF_FLOW_UNITS[number]['key'];

export function pfFlowUnitDef(unit: PFFlowUnitKey) {
  return PF_FLOW_UNITS.find(u => u.key === unit) ?? PF_FLOW_UNITS[0];
}

/** 표시 단위 → SI(m³/s). 숫자가 아니면 NaN. */
export function convertPFFlowToSI(value: number, unit: PFFlowUnitKey): number {
  if (!Number.isFinite(value)) return NaN;
  return value / pfFlowUnitDef(unit).divisor;
}

/** SI(m³/s) → 표시 단위. */
export function convertSIToPFFlow(q_m3s: number, unit: PFFlowUnitKey): number {
  return q_m3s * pfFlowUnitDef(unit).divisor;
}
