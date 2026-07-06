// 마찰손실 계통 계산기 — 유체 물성 산출 (순수 함수)
//
// 공식 출처: 참조 엑셀 '마찰손실 계통 계산기' Settings 시트
//   물성 = 참조표 선형보간 (T를 유체 온도 범위로 clamp 후 괄호행 보간)
//   공기만 압력 보정: ρ ×= P_abs/1.01325, ν ÷= P_abs/1.01325 (P_abs: bar a)
//   직접입력 유체는 ρ·ν 사용자 입력값 그대로 사용
//
// node 직접 실행 가능(검증 스크립트가 import) — React/Vite 의존 금지.

import {
  fnFluidDef, FN_STD_ATM_BAR,
  type FNFluidId, type FNFluidRow,
} from '../../data/frictionNetworkRef.ts';

export interface FNFluidState {
  fluid: FNFluidId;
  tempC: number;
  pressAbs_bar: number;        // 절대압 (bar a) — 공기 물성 보정·압축성 경고 기준
  rhoCustom_kgm3?: number;     // 직접입력 전용
  nuCustom_m2s?: number;       // 직접입력 전용
}

export interface FNFluidProps {
  rho_kgm3: number;
  nu_m2s: number;
  tempClamped: boolean;        // 입력 T가 표 범위 밖 → clamp 적용됨
}

// 참조표 선형보간 — 범위 밖은 clamp (엑셀 Settings와 동일)
function interpRow(rows: FNFluidRow[], t: number): { rho: number; nu_e6: number; clamped: boolean } {
  const first = rows[0], last = rows[rows.length - 1];
  if (t <= first.t) return { rho: first.rho, nu_e6: first.nu_e6, clamped: t < first.t };
  if (t >= last.t) return { rho: last.rho, nu_e6: last.nu_e6, clamped: t > last.t };
  for (let i = 0; i < rows.length - 1; i++) {
    const r0 = rows[i], r1 = rows[i + 1];
    if (t >= r0.t && t <= r1.t) {
      const s = (t - r0.t) / (r1.t - r0.t);
      return {
        rho: r0.rho + (r1.rho - r0.rho) * s,
        nu_e6: r0.nu_e6 + (r1.nu_e6 - r0.nu_e6) * s,
        clamped: false,
      };
    }
  }
  return { rho: last.rho, nu_e6: last.nu_e6, clamped: false };
}

/** 유체 물성 ρ·ν. 입력 무효(직접입력 0·음수·NaN, 압력 ≤0) 시 null. */
export function fnFluidProps(state: FNFluidState): FNFluidProps | null {
  if (state.fluid === 'custom') {
    const rho = state.rhoCustom_kgm3, nu = state.nuCustom_m2s;
    if (!Number.isFinite(rho) || rho! <= 0 || !Number.isFinite(nu) || nu! <= 0) return null;
    return { rho_kgm3: rho!, nu_m2s: nu!, tempClamped: false };
  }
  const def = fnFluidDef(state.fluid);
  if (!Number.isFinite(state.tempC)) return null;
  const { rho, nu_e6, clamped } = interpRow(def.rows, state.tempC);
  let rho_kgm3 = rho;
  let nu_m2s = nu_e6 * 1e-6;
  if (def.pressCorrect) {
    // 공기: ρ ∝ P, ν ∝ 1/P (엑셀 Settings 보정식)
    if (!Number.isFinite(state.pressAbs_bar) || state.pressAbs_bar <= 0) return null;
    const ratio = state.pressAbs_bar / FN_STD_ATM_BAR;
    rho_kgm3 *= ratio;
    nu_m2s /= ratio;
  }
  return { rho_kgm3, nu_m2s, tempClamped: clamped };
}

/** 유체 온도 범위 (직접입력은 null) — UI 안내용 */
export function fnFluidTempRange(fluid: FNFluidId): { min: number; max: number } | null {
  const def = fnFluidDef(fluid);
  if (def.rows.length === 0) return null;
  return { min: def.rows[0].t, max: def.rows[def.rows.length - 1].t };
}
