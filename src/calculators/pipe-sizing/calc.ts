// 관경 계산기 순수 함수 — Darcy-Weisbach + 유동 영역별 마찰계수 (pipe-friction 엔진 공용)
//   층류 f=64/Re · 천이(2,300~4,000) 3차 보간 · 난류 Colebrook-White 반복해
//   hf/L = f × (1/D) × V²/(2g)  [m/m] → ΔP/L = ρ물(T) × g × hf/L [Pa/m] → mmAq/m = ΔP/L ÷ 9.80665
// 물성: 물 ν·ρ 온도별 (src/data/fluidProperties.ts) · ε: 재질×신관/노후 (src/data/pipeRoughness.ts, 수정 가능)

import { frictionFactor, PF_G, type FMethod } from '../pipe-friction/engine.ts';
import type { PipeMaterialSize, PipeSpec } from '../../data/pipeSizes';

const PA_PER_MM_AQ = 9.80665;

// 물 온도·조도 조건 — UI에서 해석해 전달 (ε는 사용자 수정값 그대로)
export interface SizingConditions {
  nu_m2s: number;
  rho_kgm3: number;
  eps_mm: number;
}

export interface FrictionDetail {
  dropPerM_mmAqPerM: number;
  f: number;
  Re: number;
  fMethod: FMethod;
}

// 단위 마찰손실 — Darcy-Weisbach V형 + 영역별 f
export function frictionLoss(
  Q_lpm: number,
  ID_mm: number,
  cond: SizingConditions,
): FrictionDetail | null {
  if (Q_lpm <= 0 || ID_mm <= 0 || cond.nu_m2s <= 0 || cond.rho_kgm3 <= 0 || cond.eps_mm < 0) return null;
  const Q_m3s = Q_lpm / 60000;
  const D_m = ID_mm / 1000;
  const V = Q_m3s / (Math.PI * D_m * D_m / 4);
  const Re = V * D_m / cond.nu_m2s;
  const ff = frictionFactor(Re, (cond.eps_mm / 1000) / D_m);
  const hf_per_m = ff.f * (1 / D_m) * V * V / (2 * PF_G);
  const deltaP_per_m_Pa = cond.rho_kgm3 * PF_G * hf_per_m;
  return {
    dropPerM_mmAqPerM: deltaP_per_m_Pa / PA_PER_MM_AQ,
    f: ff.f,
    Re,
    fMethod: ff.method,
  };
}

// 유속 (m/s) — v = (Q/60000) / (π·(ID/1000)²/4)
export function velocity(Q_lpm: number, ID_mm: number): number {
  if (Q_lpm <= 0 || ID_mm <= 0) return NaN;
  const Q_m3s = Q_lpm / 60000;
  const A = Math.PI * Math.pow(ID_mm / 1000, 2) / 4;
  return Q_m3s / A;
}

export interface SizingRow {
  size: PipeSpec;
  dropPerM_mmAqPerM: number;
  v_ms: number;
  f: number;
  Re: number;
  fMethod: FMethod;
  ok: boolean; // 허용 압력강하 이하
}

// 전체 관경별 결과
export function sizingTable(
  Q_lpm: number,
  allowableDrop_mmAqPerM: number,
  material: PipeMaterialSize,
  cond: SizingConditions,
): SizingRow[] {
  return material.sizes.map(size => {
    const fr = frictionLoss(Q_lpm, size.id_mm, cond);
    const v = velocity(Q_lpm, size.id_mm);
    return {
      size,
      dropPerM_mmAqPerM: fr ? fr.dropPerM_mmAqPerM : NaN,
      v_ms: v,
      f: fr ? fr.f : NaN,
      Re: fr ? fr.Re : NaN,
      fMethod: fr ? fr.fMethod : 'colebrook',
      ok: !!fr && Number.isFinite(fr.dropPerM_mmAqPerM) && fr.dropPerM_mmAqPerM <= allowableDrop_mmAqPerM,
    };
  });
}

// 허용 압력강하 이하가 되는 가장 작은 관경 선정
export function selectPipeSize(
  Q_lpm: number,
  allowableDrop_mmAqPerM: number,
  material: PipeMaterialSize,
  cond: SizingConditions,
): SizingRow | null {
  if (Q_lpm <= 0) return null;
  const rows = sizingTable(Q_lpm, allowableDrop_mmAqPerM, material, cond);
  return rows.find(r => r.ok) ?? null;
}

// 유속 권장 범위 (m/s) — 엑셀 주석의 일반 가이드 1.5 ~ 2.0 m/s
export const VELOCITY_RECOMMENDED_MIN = 1.5;
export const VELOCITY_RECOMMENDED_MAX = 2.0;

export function velocityStatus(v: number): 'ok' | 'low' | 'high' {
  if (!Number.isFinite(v)) return 'low';
  if (v < VELOCITY_RECOMMENDED_MIN) return 'low';
  if (v > VELOCITY_RECOMMENDED_MAX) return 'high';
  return 'ok';
}

// 입력값 검증 — 0·음수·NaN·범위 밖 입력 시 에러 메시지 반환
export interface SizingInputError {
  field: 'Q' | 'dP' | 'temp' | 'eps';
  message: string;
}

export function validateSizingInput(
  Q_lpm: number,
  allowableDrop_mmAqPerM: number,
  tempC: number,
  eps_mm: number,
): SizingInputError | null {
  if (!Number.isFinite(tempC) || tempC < 0 || tempC > 100) {
    return { field: 'temp', message: '물 온도는 0~100°C 범위로 입력해야 합니다.' };
  }
  if (!Number.isFinite(eps_mm) || eps_mm < 0) {
    return { field: 'eps', message: '절대조도 ε는 0 이상의 값을 입력해야 합니다.' };
  }
  if (!Number.isFinite(Q_lpm) || Q_lpm <= 0) {
    return { field: 'Q', message: '유량 Q는 0보다 큰 값을 입력해야 합니다.' };
  }
  if (!Number.isFinite(allowableDrop_mmAqPerM) || allowableDrop_mmAqPerM <= 0) {
    return { field: 'dP', message: '허용 압력강하 ΔP/L은 0보다 큰 값을 입력해야 합니다.' };
  }
  return null;
}
