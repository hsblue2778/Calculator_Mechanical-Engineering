import type { PumpFieldConfig } from './types';

// HVAC 분야 기준값
// 출처: SAREK 설비편람 / 건축기계설비공사 표준시방서 / ASHRAE Handbook
// 양정 여유 10%, 동력 여유 1.15배, NPSH 여유 +1m
export const HVAC_CONFIG: PumpFieldConfig = {
  fieldId: 'hvac',
  fieldLabel: 'HVAC',
  preset: {
    headMarginPct: 10,
    powerMarginFactor: 1.15,
    npshMargin_m: 1.0,
  },
  standards: [
    'ASHRAE Handbook',
    'SAREK 설비편람',
    '건축기계설비공사 표준시방서',
  ],
  // Phase 1.1: 분야별 허용 옵션·라벨
  availableFluids: ['water', 'cooling-water', 'hot-water'],
  availableSystemModes: ['open', 'closed'],
  defaultSystemMode: 'closed',
  defaultFluid: 'water',
  labels: {
    residualPressure: '잔류 토출압',
  },
};
