// [legacy] 관마찰손실 — 고정 f 기반 순수 계산 함수
// 신규 관마찰손실 UI는 engine.ts(영역별 마찰계수)를 사용한다. 이 파일은
// pump-system(computeFriction)·pipe-sizing(NU)이 import하는 동결 export 전용 — 시그니처·동작 변경 금지.
// 공식 출처: 일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p — Darcy-Weisbach
//   hf = 8 × f × L × Q² / (π² × g × D⁵)

import { convertFlowToSI, type FlowUnitKey } from './units';

// 20°C 물의 동점성계수 (m²/s)
export const NU = 1.004e-6;
// 상온(20°C) 물 밀도 (kg/m³)
export const RHO_WATER = 998.2;
// 중력가속도 (m/s²)
export const G = 9.81;

export interface FrictionInput {
  Q_str: string;
  flowUnit: FlowUnitKey;
  D_mm: number;
  L_m: number;
  f: number;            // 마찰계수 (재질 기본값 또는 수동 오버라이드)
}

export interface FrictionResult {
  Q_m3s: number;
  D_m: number;
  V_ms: number;          // 유속
  Re: number;            // 레이놀즈수
  f: number;             // 적용 마찰계수
  hf_m: number;          // 수두 (m)
  deltaP_Pa: number;     // 총 마찰손실 (Pa)
  unitLoss_Pa: number;   // 단위 마찰손실 (Pa/m)
}

// 입력값 검증 — 0·음수·NaN 입력 시 에러 메시지 반환
export interface InputError {
  field: 'Q' | 'v' | 'D' | 'L' | 'f';
  message: string;
}

export function validateFrictionInput(
  Q_str: string, D_mm: number, L_m: number, f: number,
): InputError | null {
  const Q_num = parseFloat(Q_str);
  if (!Number.isFinite(Q_num) || Q_num <= 0) {
    return { field: 'Q', message: '유량 Q는 0보다 큰 값을 입력해야 합니다.' };
  }
  if (!Number.isFinite(D_mm) || D_mm <= 0) {
    return { field: 'D', message: '관 내경 D는 0보다 큰 값을 입력해야 합니다.' };
  }
  if (!Number.isFinite(L_m) || L_m <= 0) {
    return { field: 'L', message: '배관 길이 L은 0보다 큰 값을 입력해야 합니다.' };
  }
  if (!Number.isFinite(f) || f <= 0) {
    return { field: 'f', message: '마찰계수 f는 0보다 큰 값을 입력해야 합니다.' };
  }
  return null;
}

export function computeFriction(input: FrictionInput): FrictionResult | null {
  const err = validateFrictionInput(input.Q_str, input.D_mm, input.L_m, input.f);
  if (err) return null;

  // 일본 건축기술자협회 매뉴얼 213p — Darcy-Weisbach 직접형
  const Q_m3s = convertFlowToSI(input.Q_str, input.flowUnit);
  const D_m = input.D_mm / 1000;
  const A_m2 = Math.PI * D_m * D_m / 4;
  const V_ms = Q_m3s / A_m2;
  const Re = V_ms * D_m / NU;
  const hf_m = 8 * input.f * input.L_m * Q_m3s * Q_m3s
    / (Math.PI * Math.PI * G * Math.pow(D_m, 5));
  const deltaP_Pa = RHO_WATER * G * hf_m;
  const unitLoss_Pa = deltaP_Pa / input.L_m;

  return {
    Q_m3s, D_m, V_ms, Re, f: input.f,
    hf_m, deltaP_Pa, unitLoss_Pa,
  };
}
