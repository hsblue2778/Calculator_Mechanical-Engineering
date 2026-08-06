// 유체 물성 — 관마찰손실(pipe-friction) 계산기 전용: ν(동점성계수)·ρ(밀도)
//
// 출처:
//   물 ν   : 참조 엑셀 '마찰손실 계산기.xlsm' 참조표 ④ 물의 동점성계수 (1atm 포화액, 0~100°C)
//   공기 ν : 동 엑셀 참조표 ② 공기의 동점성계수 (1atm, 0~100°C)
//            + 사용자 제공 설비공학 문헌 1.3-2 표 2 '건공기의 밀도·동점성계수' (-10°C 절점, 압력 의존)
//   공기 압력 의존: 문헌 표 2 (720~780 mmHg 매트릭스)가 이상기체 스케일링과 일치함을 검산 —
//            ν(T,P) = ν_1atm(T) × (760/P),  ρ(T,P) = 1.293 × 273.15/(273.15+T) × (P/760)
//   물 ρ   : NIST WebBook — 기존 glycol-properties.ts 테이블 재사용
//   증기 ν·ρ: 포화증기표 100~180°C (증기 ρ, μ→ν 환산) — frictionNetworkRef.ts 증기표와 동일 절점
//   고정값 유체 6종: 동 문헌 1.3-3 표 5 '유체의 동점성계수' (상온·1atm 단일값)
//
// 절점 사이는 선형보간 (10°C 절점값은 엑셀 표와 완전 일치).

import { getDensity } from './glycol-properties.ts';

export type PFFluid =
  | 'water' | 'air' | 'steam'
  | 'hydrogen' | 'gasoline' | 'ethanol' | 'mercury' | 'sae30' | 'glycerin';

export interface PFFluidMeta {
  key: PFFluid;
  label: string;
  mode: 'table' | 'fixed';   // table = 온도(±압력) 의존 / fixed = 상온·1atm 단일값
  tempMin?: number;
  tempMax?: number;
  hasPressure?: boolean;     // 공기만 압력(mmHg) 입력 지원
}

export const PF_FLUIDS: PFFluidMeta[] = [
  { key: 'water',    label: '물',         mode: 'table', tempMin: 0,   tempMax: 100 },
  { key: 'air',      label: '공기',       mode: 'table', tempMin: -10, tempMax: 100, hasPressure: true },
  { key: 'steam',    label: '증기 (포화)', mode: 'table', tempMin: 100, tempMax: 180 },
  { key: 'hydrogen', label: '수소',       mode: 'fixed' },
  { key: 'gasoline', label: '휘발유',     mode: 'fixed' },
  { key: 'ethanol',  label: '에틸알코올', mode: 'fixed' },
  { key: 'mercury',  label: '수은',       mode: 'fixed' },
  { key: 'sae30',    label: 'SAE30 오일', mode: 'fixed' },
  { key: 'glycerin', label: '글리세린',   mode: 'fixed' },
];

export function pfFluidMeta(key: PFFluid): PFFluidMeta {
  return PF_FLUIDS.find(f => f.key === key) ?? PF_FLUIDS[0];
}

export const PF_PRESSURE_DEFAULT_MMHG = 760;
export const PF_PRESSURE_MIN_MMHG = 400;
export const PF_PRESSURE_MAX_MMHG = 1000;

// ── ν 테이블 [온도 °C, ν ×10⁻⁶ m²/s] ─────────────────────────────

// 엑셀 참조표 ④ (물, 포화액 1atm)
const WATER_NU_E6: [number, number][] = [
  [0, 1.787], [10, 1.307], [20, 1.004], [30, 0.801], [40, 0.658],
  [50, 0.553], [60, 0.475], [70, 0.413], [80, 0.365], [90, 0.326], [100, 0.294],
];

// -10°C: 문헌 표 2 (760mmHg) / 0~100°C: 엑셀 참조표 ② (1atm)
const AIR_NU_1ATM_E6: [number, number][] = [
  [-10, 12.42],
  [0, 13.3], [10, 14.2], [20, 15.11], [30, 16.04], [40, 16.97],
  [50, 17.95], [60, 18.9], [70, 19.9], [80, 20.92], [90, 21.96], [100, 23.06],
];

// 포화증기표 100~180°C, 20°C 절점 (온도별 포화압 기준 — 별도 압력 입력 없음)
const STEAM_NU_E6: [number, number][] = [
  [100, 20.53], [120, 11.55], [140, 6.94], [160, 4.41], [180, 2.93],
];
const STEAM_RHO: [number, number][] = [
  [100, 0.598], [120, 1.122], [140, 1.967], [160, 3.259], [180, 5.157],
];

// ── 고정값 유체 (문헌 표 5 — 상온·1atm) ──────────────────────────
const FIXED_PROPS: Record<string, { nu_m2s: number; rho_kgm3: number }> = {
  hydrogen: { nu_m2s: 1.05e-4, rho_kgm3: 0.084 },
  gasoline: { nu_m2s: 4.22e-7, rho_kgm3: 680 },
  ethanol:  { nu_m2s: 1.52e-6, rho_kgm3: 789 },
  mercury:  { nu_m2s: 1.16e-7, rho_kgm3: 13550 },
  sae30:    { nu_m2s: 3.25e-4, rho_kgm3: 891 },
  glycerin: { nu_m2s: 1.18e-3, rho_kgm3: 1260 },
};

// ── 선형보간 (범위 밖 클램프) ─────────────────────────────────────
function interpolate(table: [number, number][], t: number): number {
  if (t <= table[0][0]) return table[0][1];
  const last = table[table.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < table.length - 1; i++) {
    const [t0, v0] = table[i];
    const [t1, v1] = table[i + 1];
    if (t >= t0 && t <= t1) return v0 + (v1 - v0) * (t - t0) / (t1 - t0);
  }
  return last[1];
}

/** 동점성계수 ν (m²/s). 공기만 압력(mmHg) 반영, 고정값 유체는 tempC 무시. */
export function pfKinematicViscosity(
  fluid: PFFluid, tempC: number, pressureMmHg: number = PF_PRESSURE_DEFAULT_MMHG,
): number {
  if (fluid === 'water') return interpolate(WATER_NU_E6, tempC) * 1e-6;
  if (fluid === 'air') {
    // 문헌 표 2 검산: ν ∝ 1/P (μ는 압력 무관, ρ ∝ P — 이상기체)
    return interpolate(AIR_NU_1ATM_E6, tempC) * 1e-6 * (760 / pressureMmHg);
  }
  if (fluid === 'steam') return interpolate(STEAM_NU_E6, tempC) * 1e-6;
  return FIXED_PROPS[fluid].nu_m2s;
}

/** 밀도 ρ (kg/m³). 공기만 압력(mmHg) 반영, 고정값 유체는 tempC 무시. */
export function pfDensity(
  fluid: PFFluid, tempC: number, pressureMmHg: number = PF_PRESSURE_DEFAULT_MMHG,
): number {
  if (fluid === 'water') return getDensity('water', 0, tempC); // NIST (glycol-properties.ts)
  if (fluid === 'steam') return interpolate(STEAM_RHO, tempC); // 포화증기표
  if (fluid === 'air') {
    // 이상기체 (엑셀 참조표 ②와 동일식 + 문헌 표 2의 압력 비례)
    return 1.293 * 273.15 / (273.15 + tempC) * (pressureMmHg / 760);
  }
  return FIXED_PROPS[fluid].rho_kgm3;
}
