// 유체 물성 데이터 — 밀도·동점도 (청수, 온수, EG/PG 브라인)
//
// 청수·온수 출처: NIST Chemistry WebBook (water at 1 atm, mass density & viscosity)
// https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Mask=2
// (NIST 포화수 테이블, 1 atm 기준)
//
// EG/PG 출처: Phase 1.5에서 추가 예정
// TODO Phase 1.5: ASHRAE Handbook Fundamentals 2021 Ch.31 Table 4(EG)·Table 5(PG) 데이터 확정 후 채울 것
// 현재 EG/PG getDensity/getViscosity 호출 시 throw 발생 (Phase 1.5 이전 사용 불가)

export type FluidType = 'water' | 'hot-water' | 'cooling-water' | 'eg-brine' | 'pg-brine';

// ── 청수·온수 물성 (NIST WebBook) ──────────────────────────────────
// 출처: NIST Chemistry WebBook — Water (CAS 7732-18-5)
// https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Mask=2
//
// 밀도 (kg/m³), 온도 오름차순
const WATER_DENSITY: { temp_C: number; rho: number }[] = [
  { temp_C:  0, rho: 999.8 }, // NIST 0°C
  { temp_C:  4, rho: 1000.0 }, // NIST 4°C (최대밀도)
  { temp_C: 10, rho: 999.7 }, // NIST 10°C
  { temp_C: 20, rho: 998.2 }, // NIST 20°C
  { temp_C: 30, rho: 995.7 }, // NIST 30°C
  { temp_C: 40, rho: 992.2 }, // NIST 40°C
  { temp_C: 50, rho: 988.1 }, // NIST 50°C
  { temp_C: 60, rho: 983.2 }, // NIST 60°C
  { temp_C: 70, rho: 977.8 }, // NIST 70°C
  { temp_C: 80, rho: 971.8 }, // NIST 80°C
  { temp_C: 90, rho: 965.3 }, // NIST 90°C
  { temp_C: 100, rho: 958.4 }, // NIST 100°C
];

// 동점도 (mPa·s = cP), 온도 오름차순
// 출처: NIST Chemistry WebBook
// https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Mask=2
const WATER_VISCOSITY: { temp_C: number; mu_mPas: number }[] = [
  { temp_C:  0, mu_mPas: 1.792 }, // NIST 0°C
  { temp_C: 10, mu_mPas: 1.307 }, // NIST 10°C
  { temp_C: 20, mu_mPas: 1.002 }, // NIST 20°C
  { temp_C: 30, mu_mPas: 0.798 }, // NIST 30°C
  { temp_C: 40, mu_mPas: 0.653 }, // NIST 40°C
  { temp_C: 50, mu_mPas: 0.547 }, // NIST 50°C
  { temp_C: 60, mu_mPas: 0.467 }, // NIST 60°C
  { temp_C: 70, mu_mPas: 0.404 }, // NIST 70°C
  { temp_C: 80, mu_mPas: 0.354 }, // NIST 80°C
  { temp_C: 90, mu_mPas: 0.315 }, // NIST 90°C
  { temp_C: 100, mu_mPas: 0.282 }, // NIST 100°C
];

// 비열 (kJ/(kg·K)), 온도 오름차순
// 출처: NIST Chemistry WebBook — Water (CAS 7732-18-5), isobaric specific heat at 1 atm
// https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Mask=2
const WATER_CP: { temp_C: number; cp_kJkgK: number }[] = [
  { temp_C:   0, cp_kJkgK: 4.2199 }, // NIST 0°C
  { temp_C:  10, cp_kJkgK: 4.1955 }, // NIST 10°C
  { temp_C:  20, cp_kJkgK: 4.1844 }, // NIST 20°C
  { temp_C:  30, cp_kJkgK: 4.1801 }, // NIST 30°C
  { temp_C:  40, cp_kJkgK: 4.1796 }, // NIST 40°C
  { temp_C:  50, cp_kJkgK: 4.1815 }, // NIST 50°C
  { temp_C:  60, cp_kJkgK: 4.1851 }, // NIST 60°C
  { temp_C:  70, cp_kJkgK: 4.1902 }, // NIST 70°C
  { temp_C:  80, cp_kJkgK: 4.1969 }, // NIST 80°C
  { temp_C:  90, cp_kJkgK: 4.2053 }, // NIST 90°C
  { temp_C: 100, cp_kJkgK: 4.2155 }, // NIST 100°C
];

// ── EG 브라인 — Phase 1.5 예정 ────────────────────────────────────
// TODO Phase 1.5: ASHRAE Handbook Fundamentals 2021 Ch.31 Table 4 데이터 확정 후 채울 것
// 형식: 농도 4종 (20/30/40/50%) × 온도 5점 (-20/0/20/40/60°C)
// EG/PG 테이블 골격 — Phase 1.5 이전에는 빈 객체
// TODO Phase 1.5: ASHRAE Handbook Fundamentals 2021 Ch.31 Table 4(EG)·Table 5(PG) 채울 것
// void로 미사용 선언 경고 억제 (Phase 1.5에서 getDensity/getViscosity 분기 채울 때 제거)
const _EG_DENSITY_TABLE: Record<number, { temp_C: number; rho: number }[]> = {};
const _EG_VISCOSITY_TABLE: Record<number, { temp_C: number; mu_mPas: number }[]> = {};
const _PG_DENSITY_TABLE: Record<number, { temp_C: number; rho: number }[]> = {};
const _PG_VISCOSITY_TABLE: Record<number, { temp_C: number; mu_mPas: number }[]> = {};
// suppress unused variable warnings — these will be used in Phase 1.5
void _EG_DENSITY_TABLE; void _EG_VISCOSITY_TABLE;
void _PG_DENSITY_TABLE; void _PG_VISCOSITY_TABLE;

// ── 선형 보간 헬퍼 ────────────────────────────────────────────────
function linearInterpolate(
  table: { temp_C: number; value: number }[],
  tempC: number,
): number {
  if (table.length === 0) throw new Error('보간 테이블이 비어 있습니다.');

  // 범위 밖 클램프
  if (tempC <= table[0].temp_C) return table[0].value;
  if (tempC >= table[table.length - 1].temp_C) return table[table.length - 1].value;

  for (let i = 0; i < table.length - 1; i++) {
    const t0 = table[i].temp_C;
    const t1 = table[i + 1].temp_C;
    if (tempC >= t0 && tempC <= t1) {
      const ratio = (tempC - t0) / (t1 - t0);
      return table[i].value + ratio * (table[i + 1].value - table[i].value);
    }
  }
  return table[table.length - 1].value;
}

// ── 공개 API ──────────────────────────────────────────────────────

/**
 * 밀도 반환 (kg/m³)
 * @param fluid 유체 종류
 * @param concPct 글리콜 농도 (%, EG/PG 전용. 청수·온수는 무시)
 * @param tempC 운전 온도 (°C)
 *
 * 청수·온수: NIST 테이블 선형 보간
 * EG/PG: Phase 1.5 미구현 — 호출 시 throw
 */
export function getDensity(fluid: FluidType, concPct: number, tempC: number): number {
  if (fluid === 'water' || fluid === 'hot-water' || fluid === 'cooling-water') {
    return linearInterpolate(
      WATER_DENSITY.map(r => ({ temp_C: r.temp_C, value: r.rho })),
      tempC,
    );
  }
  // EG/PG — Phase 1.5 이전 사용 불가
  void concPct;
  throw new Error(
    `Phase 1.5 미구현: ${fluid} 물성 데이터 미확정 (ASHRAE Ch.31 출처 확인 후 활성화 예정)`,
  );
}

/**
 * 동점도 반환 (Pa·s)
 * @param fluid 유체 종류
 * @param concPct 글리콜 농도 (%, EG/PG 전용)
 * @param tempC 운전 온도 (°C)
 *
 * 청수·온수: NIST 테이블 선형 보간 (mPa·s → Pa·s 변환)
 * EG/PG: Phase 1.5 미구현 — 호출 시 throw
 */
export function getViscosity(fluid: FluidType, concPct: number, tempC: number): number {
  if (fluid === 'water' || fluid === 'hot-water' || fluid === 'cooling-water') {
    const mu_mPas = linearInterpolate(
      WATER_VISCOSITY.map(r => ({ temp_C: r.temp_C, value: r.mu_mPas })),
      tempC,
    );
    return mu_mPas * 1e-3; // mPa·s → Pa·s
  }
  void concPct;
  throw new Error(
    `Phase 1.5 미구현: ${fluid} 물성 데이터 미확정 (ASHRAE Ch.31 출처 확인 후 활성화 예정)`,
  );
}

/**
 * 동점성계수 반환 (m²/s) = 점도(Pa·s) / 밀도(kg/m³)
 */
export function getKinematicViscosity(fluid: FluidType, concPct: number, tempC: number): number {
  const mu = getViscosity(fluid, concPct, tempC);    // Pa·s
  const rho = getDensity(fluid, concPct, tempC);     // kg/m³
  return mu / rho;                                   // m²/s
}

/**
 * 정압 비열 반환 (J/(kg·K))
 * @param fluid 유체 종류
 * @param concPct 글리콜 농도 (%, EG/PG 전용. 청수·온수는 무시)
 * @param tempC 운전 온도 (°C)
 *
 * 청수·온수: NIST 테이블 선형 보간 후 kJ/(kg·K) → J/(kg·K) 변환 (× 1000)
 * EG/PG: Phase 1.5 미구현 — 호출 시 throw
 */
export function getSpecificHeat(fluid: FluidType, concPct: number, tempC: number): number {
  if (fluid === 'water' || fluid === 'hot-water' || fluid === 'cooling-water') {
    const cp_kJkgK = linearInterpolate(
      WATER_CP.map(r => ({ temp_C: r.temp_C, value: r.cp_kJkgK })),
      tempC,
    );
    return cp_kJkgK * 1000; // kJ/(kg·K) → J/(kg·K)
  }
  // EG/PG — Phase 1.5 이전 사용 불가
  void concPct;
  throw new Error(
    `Phase 1.5 미구현: ${fluid} 비열 데이터 미확정 (ASHRAE Ch.31 출처 확인 후 활성화 예정)`,
  );
}
