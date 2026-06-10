// 관마찰손실 계산 엔진 — 순수 함수 (React·DOM·legacy calc.ts 무관)
//
// 공식 출처:
//   Darcy-Weisbach    : hL = f·(L/D)·V²/(2g)   — 참조 엑셀 '마찰손실 계산기.xlsm' PHASE 4 (Q형과 수학적 동등)
//   Colebrook-White   : 1/√f = -2·log10(ε/(3.7D) + 2.51/(Re·√f))  (Colebrook 1939) — Newton 반복해
//   Swamee-Jain(검산) : f = 0.25/[log10(ε/(3.7D) + 5.74/Re^0.9)]² (Swamee & Jain 1976, 5000≤Re≤10⁸)
//   층류              : f = 64/Re
//   천이(2300~4000)   : 양 끝점(64/2300 ↔ Colebrook(4000)) 3차 보간 — EPANET 2의 천이역 3차 보간 방식 준용
//   Hazen-Williams    : hL = 10.67·L·Q^1.852/(C^1.852·D^4.871)  — 물 전용 경험식
//   압력 환산         : ΔP = ρ유체(T)·g·hL
//
// 이 파일과 데이터 모듈은 node로 직접 실행 가능해야 한다(검증 스크립트가 import) —
// import는 .ts 확장자 명시, React/Vite 의존 금지.

import {
  pfKinematicViscosity, pfDensity, pfFluidMeta,
  PF_PRESSURE_DEFAULT_MMHG, PF_PRESSURE_MIN_MMHG, PF_PRESSURE_MAX_MMHG,
  type PFFluid,
} from '../../data/fluidProperties.ts';

// 중력가속도 (m/s²)
export const PF_G = 9.81;

// 유동 영역 경계 — analysis.ts flowRegime·참조 엑셀과 동일 (층류 <2300, 천이 ≤4000, 난류 >4000)
export const RE_LAMINAR_MAX = 2300;
export const RE_TURBULENT_MIN = 4000;

// ── 마찰계수 ──────────────────────────────────────────────────────

/** Swamee-Jain 명시식 (검산·비교용, Colebrook 초기값). */
export function swameeJain(Re: number, relRough: number): number {
  return 0.25 / Math.pow(Math.log10(relRough / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);
}

export interface ColebrookResult {
  f: number;
  iterations: number;
  converged: boolean;
  residual: number;
}

const COLEBROOK_TOL = 1e-10;
const COLEBROOK_MAX_ITER = 50;

/**
 * Colebrook-White를 x = 1/√f 형태로 Newton 반복 풀이.
 * F(x) = x + 2·log10(ε/(3.7D) + 2.51·x/Re) = 0
 * 미수렴 시(이론상 도달 불가) Swamee-Jain 폴백 + converged:false.
 */
export function colebrookWhite(Re: number, relRough: number): ColebrookResult {
  let x = 1 / Math.sqrt(swameeJain(Re, relRough)); // S-J 초기값 — 전 영역에서 안정적
  const LN10 = Math.LN10;
  for (let i = 1; i <= COLEBROOK_MAX_ITER; i++) {
    const arg = relRough / 3.7 + 2.51 * x / Re;
    const F = x + 2 * Math.log10(arg);
    const dF = 1 + (2 / LN10) * (2.51 / Re) / arg;
    x -= F / dF;
    const residual = Math.abs(x + 2 * Math.log10(relRough / 3.7 + 2.51 * x / Re));
    if (residual < COLEBROOK_TOL) {
      return { f: 1 / (x * x), iterations: i, converged: true, residual };
    }
  }
  return { f: swameeJain(Re, relRough), iterations: COLEBROOK_MAX_ITER, converged: false, residual: NaN };
}

export type FMethod = 'laminar' | 'interpolated' | 'colebrook' | 'override';

export interface FrictionFactorResult {
  f: number;
  method: Exclude<FMethod, 'override'>;
  iterations?: number;
  converged: boolean;
  residual?: number;
}

/** 유동 영역별 마찰계수 (층류 64/Re · 천이 3차 보간 · 난류 Colebrook-White). */
export function frictionFactor(Re: number, relRough: number): FrictionFactorResult {
  if (Re < RE_LAMINAR_MAX) {
    return { f: 64 / Re, method: 'laminar', converged: true };
  }
  if (Re <= RE_TURBULENT_MIN) {
    // 3차 보간: f(2300)=64/2300 ↔ f(4000)=Colebrook(4000) — 양 끝점에서 값 연속·구간 내 단조
    const fLam = 64 / RE_LAMINAR_MAX;
    const cw = colebrookWhite(RE_TURBULENT_MIN, relRough);
    const t = (Re - RE_LAMINAR_MAX) / (RE_TURBULENT_MIN - RE_LAMINAR_MAX);
    const s = t * t * (3 - 2 * t); // 3차 Hermite (양끝 기울기 0)
    return { f: fLam + (cw.f - fLam) * s, method: 'interpolated', converged: cw.converged };
  }
  const cw = colebrookWhite(Re, relRough);
  return { f: cw.f, method: 'colebrook', iterations: cw.iterations, converged: cw.converged, residual: cw.residual };
}

// ── 유량·유속·관경 삼각 관계 (엑셀 PHASE 1) ──────────────────────

export type TriField = 'Q' | 'V' | 'D';
export const TRI_FIELDS: TriField[] = ['Q', 'V', 'D'];

/**
 * Q(m³/s)·V(m/s)·D(m) 중 정확히 2개가 주어지면 나머지 1개를 산출.
 * D=√(4Q/(πV)) · V=4Q/(πD²) · Q=πD²V/4
 */
export function resolveTriangle(
  known: Partial<Record<TriField, number>>,
): { Q_m3s: number; V_ms: number; D_m: number; derived: TriField } | null {
  const keys = TRI_FIELDS.filter(k => Number.isFinite(known[k]));
  if (keys.length !== 2) return null;
  const Q = known.Q, V = known.V, D = known.D;
  if (Q !== undefined && V !== undefined) {
    return { Q_m3s: Q, V_ms: V, D_m: Math.sqrt(4 * Q / (Math.PI * V)), derived: 'D' };
  }
  if (Q !== undefined && D !== undefined) {
    return { Q_m3s: Q, V_ms: 4 * Q / (Math.PI * D * D), D_m: D, derived: 'V' };
  }
  if (V !== undefined && D !== undefined) {
    return { Q_m3s: Math.PI * D * D / 4 * V, V_ms: V, D_m: D, derived: 'Q' };
  }
  return null;
}

// ── Hazen-Williams (물 전용) ──────────────────────────────────────

export function hazenWilliamsHL(Q_m3s: number, D_m: number, L_m: number, C: number): number {
  return 10.67 * L_m * Math.pow(Q_m3s, 1.852) / (Math.pow(C, 1.852) * Math.pow(D_m, 4.871));
}

// ── 입력·검증·종합 계산 ──────────────────────────────────────────

export interface PipeFrictionInput {
  fluid: PFFluid;
  tempC: number;                              // 고정값 유체는 무시
  pressureMmHg?: number;                      // 공기 전용 (기본 760)
  eps_mm: number;                             // 절대조도 (사용자 수정 가능 값)
  hazenC: number;                             // H-W C (사용자 수정 가능 값)
  known: Partial<Record<TriField, number>>;   // SI: Q m³/s · V m/s · D m — 정확히 2개
  L_m: number;
  fOverride?: number;                         // 지정 시 엔진 산출 대신 사용
}

export interface PFInputError {
  field: 'temp' | 'pressure' | 'pair' | 'Q' | 'V' | 'D' | 'L' | 'eps' | 'C' | 'f';
  message: string;
}

export function validatePipeFriction(input: PipeFrictionInput): PFInputError | null {
  const meta = pfFluidMeta(input.fluid);
  if (meta.mode === 'table') {
    const lo = meta.tempMin ?? 0, hi = meta.tempMax ?? 100;
    if (!Number.isFinite(input.tempC) || input.tempC < lo || input.tempC > hi) {
      return { field: 'temp', message: `${meta.label} 온도는 ${lo}~${hi}°C 범위로 입력해야 합니다.` };
    }
  }
  if (meta.hasPressure) {
    const p = input.pressureMmHg ?? PF_PRESSURE_DEFAULT_MMHG;
    if (!Number.isFinite(p) || p < PF_PRESSURE_MIN_MMHG || p > PF_PRESSURE_MAX_MMHG) {
      return { field: 'pressure', message: `압력은 ${PF_PRESSURE_MIN_MMHG}~${PF_PRESSURE_MAX_MMHG} mmHg 범위로 입력해야 합니다.` };
    }
  }
  const keys = TRI_FIELDS.filter(k => input.known[k] !== undefined);
  if (keys.length !== 2) {
    return { field: 'pair', message: '유량·유속·관경 중 2개를 입력하면 나머지 1개가 자동 산출됩니다.' };
  }
  const labels: Record<TriField, string> = { Q: '유량 Q', V: '유속 V', D: '관 내경 D' };
  for (const k of keys) {
    const v = input.known[k]!;
    if (!Number.isFinite(v) || v <= 0) {
      return { field: k, message: `${labels[k]}는 0보다 큰 값을 입력해야 합니다.` };
    }
  }
  if (!Number.isFinite(input.L_m) || input.L_m <= 0) {
    return { field: 'L', message: '배관 길이 L은 0보다 큰 값을 입력해야 합니다.' };
  }
  if (!Number.isFinite(input.eps_mm) || input.eps_mm < 0) {
    return { field: 'eps', message: '절대조도 ε는 0 이상의 값을 입력해야 합니다.' };
  }
  if (input.fluid === 'water' && (!Number.isFinite(input.hazenC) || input.hazenC <= 0)) {
    return { field: 'C', message: 'Hazen-Williams 조도계수 C는 0보다 큰 값을 입력해야 합니다.' };
  }
  if (input.fOverride !== undefined && (!Number.isFinite(input.fOverride) || input.fOverride <= 0)) {
    return { field: 'f', message: '마찰계수 f는 0보다 큰 값을 입력해야 합니다.' };
  }
  return null;
}

export interface PipeFrictionResult {
  // 물성
  rho_kgm3: number;
  nu_m2s: number;
  // 흐름 조건 (삼각 완성)
  Q_m3s: number;
  V_ms: number;
  D_m: number;
  A_m2: number;
  derived: TriField;
  // 마찰계수
  eps_mm: number;
  relRough: number;
  Re: number;
  f: number;
  fMethod: FMethod;
  fIterations?: number;
  fConverged: boolean;
  fSwameeJain: number | null;   // Re>4000에서만 (적용범위), 그 외 null
  // Darcy-Weisbach
  hL_m: number;
  hL_per_m: number;
  deltaP_Pa: number;
  deltaP_per_m_Pa: number;
  // Hazen-Williams (물 전용, 그 외 null)
  hw: { C: number; hL_m: number; hL_per_m: number; deltaP_Pa: number } | null;
}

export function computePipeFriction(input: PipeFrictionInput): PipeFrictionResult | null {
  if (validatePipeFriction(input)) return null;

  const pressure = input.pressureMmHg ?? PF_PRESSURE_DEFAULT_MMHG;
  const nu = pfKinematicViscosity(input.fluid, input.tempC, pressure);
  const rho = pfDensity(input.fluid, input.tempC, pressure);
  if (!Number.isFinite(nu) || nu <= 0 || !Number.isFinite(rho) || rho <= 0) return null;

  const tri = resolveTriangle(input.known);
  if (!tri) return null;
  const { Q_m3s, V_ms, D_m, derived } = tri;
  if (!Number.isFinite(D_m) || D_m <= 0) return null;
  const A_m2 = Math.PI * D_m * D_m / 4;

  const Re = V_ms * D_m / nu;
  const relRough = (input.eps_mm / 1000) / D_m;

  let f: number, fMethod: FMethod, fIterations: number | undefined, fConverged: boolean;
  if (input.fOverride !== undefined) {
    f = input.fOverride; fMethod = 'override'; fConverged = true;
  } else {
    const ff = frictionFactor(Re, relRough);
    f = ff.f; fMethod = ff.method; fIterations = ff.iterations; fConverged = ff.converged;
  }
  const fSwameeJain = Re > RE_TURBULENT_MIN ? swameeJain(Re, relRough) : null;

  // Darcy-Weisbach (V형 — 엑셀 PHASE 4 ②와 동일, Q형과 수학적 동등)
  const hL_m = f * (input.L_m / D_m) * V_ms * V_ms / (2 * PF_G);
  const deltaP_Pa = rho * PF_G * hL_m;

  let hw: PipeFrictionResult['hw'] = null;
  if (input.fluid === 'water') {
    const hwHL = hazenWilliamsHL(Q_m3s, D_m, input.L_m, input.hazenC);
    hw = {
      C: input.hazenC,
      hL_m: hwHL,
      hL_per_m: hwHL / input.L_m,
      deltaP_Pa: rho * PF_G * hwHL,
    };
  }

  return {
    rho_kgm3: rho, nu_m2s: nu,
    Q_m3s, V_ms, D_m, A_m2, derived,
    eps_mm: input.eps_mm, relRough, Re,
    f, fMethod, fIterations, fConverged, fSwameeJain,
    hL_m, hL_per_m: hL_m / input.L_m,
    deltaP_Pa, deltaP_per_m_Pa: deltaP_Pa / input.L_m,
    hw,
  };
}
