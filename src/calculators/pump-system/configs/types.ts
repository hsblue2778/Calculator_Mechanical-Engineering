// 분야별 차이점만 담는 config 타입

export type PumpFieldId = 'hvac' | 'process' | 'liquid-utility' | 'fire';

export type FluidId = 'water' | 'hot-water' | 'cooling-water' | 'glycol-eg' | 'glycol-pg';

export interface PumpFieldConfig {
  fieldId: PumpFieldId;
  fieldLabel: string;          // 화면·PDF 표시용 (예: 'HVAC')
  preset: {
    headMarginPct: number;     // 양정 여유 (%)
    powerMarginFactor: number; // 동력 여유 배율
    npshMargin_m: number;      // NPSH 여유 (m)
  };
  standards: string[];         // PDF 적용 표준 안내문 (예: ['ASHRAE Handbook', 'SAREK 편람'])
  // Phase 1.1: 분야별 허용 옵션·라벨 추가
  availableFluids: Array<FluidId>;
  availableSystemModes: Array<'open' | 'closed'>;
  defaultSystemMode: 'open' | 'closed';
  defaultFluid: FluidId;
  labels: {
    residualPressure: string;  // 잔류 압력 입력 라벨 (HVAC: '잔류 토출압', 급수: '말단 최저압')
  };
}
