export const FLOW_UNITS = [
  { key: 'm3h', label: 'm³/h', divisor: 3600 },
  { key: 'lpm', label: 'LPM', divisor: 60000 },
] as const;
export type FlowUnitKey = typeof FLOW_UNITS[number]['key'];

export const PRESSURE_UNITS = [
  { key: 'kPa', label: 'kPa', factor: 1 / 1000, dp: 2, dpM: 3 },
  { key: 'bar', label: 'bar', factor: 1 / 100000, dp: 4, dpM: 5 },
  { key: 'mmAq', label: 'mmAq', factor: 1 / 9.80665, dp: 1, dpM: 2 },
  { key: 'kgfcm2', label: 'kg/cm²', factor: 1 / 98066.5, dp: 4, dpM: 5 },
  { key: 'MPa', label: 'MPa', factor: 1 / 1000000, dp: 5, dpM: 6 },
] as const;
export type PressureUnitKey = typeof PRESSURE_UNITS[number]['key'];

export function convertFlowToSI(value: string, unit: FlowUnitKey): number {
  const numeric = parseFloat(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return NaN;
  const def = FLOW_UNITS.find(u => u.key === unit);
  return def ? numeric / def.divisor : NaN;
}

export function convertPressureFromPa(pa: number, unit: PressureUnitKey): number {
  const def = PRESSURE_UNITS.find(u => u.key === unit);
  return def ? pa * def.factor : NaN;
}
