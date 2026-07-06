// 마찰손실 계통 계산기(friction-network) 전용 참조표 — 유체 물성·조도·목표 유속범위
//
// 출처: 참조 엑셀 '마찰손실 계통 계산기' Settings·참조표 시트 이식.
//   기존 fluidProperties.ts(관마찰손실 계산기용)·pipeRoughness.ts와 값·유체 구성이 다르므로
//   (증기·유류·글리콜 추가, 강관 ε 0.045 vs 0.046, 덕트 재질 3종 포함) 의도적으로 별도 모듈.
//   기존 파일과 병합·교차 사용 금지 — 이 계산기 전용.
//
// 절점 근거:
//   물     : ν 참조 엑셀 물성표 계열(0~100°C) · ρ NIST WebBook — 20°C 998.2 / 1.004e-6 (엑셀 고정값 일치)
//   공기   : 1.01325 bar a 기준 6절점 (설비공학 문헌 건공기표 계열) — 압력 보정은 fluids.ts에서
//   증기   : 포화증기 100~180°C (포화증기표: 증기 ρ, μ→ν 환산) ※ 원본 엑셀 절점 대조 필요
//   유류   : 경유(디젤)급 대표값 20~80°C ※ 원본 엑셀 절점 대조 필요
//   글리콜 : EG 50 wt% 수용액 0~80°C (MEGlobal/ASHRAE 계열) ※ 원본 엑셀 절점 대조 필요
//
// 이 파일은 node로 직접 실행 가능해야 한다(검증 스크립트가 import) — React/Vite 의존 금지.

// ── 공통 상수·타입 ────────────────────────────────────────────────

/** mmAq 환산: mmAq = Pa / 9.80665 (엑셀 Settings 상수) */
export const FN_PA_PER_MMAQ = 9.80665;

/** 표준대기압 (bar a) — 공기 물성 압력 보정 기준 */
export const FN_STD_ATM_BAR = 1.01325;

/** 구간 행 수 상한 (엑셀 구간테이블 최대 30행) */
export const FN_MAX_ROWS = 30;

export type FNSystemType = 'pipe' | 'duct';
export type FNGrade = 'main' | 'sub' | 'branch';
export type FNCondition = 'new' | 'old';

export const FN_GRADES: { key: FNGrade; label: string }[] = [
  { key: 'main',   label: '메인' },
  { key: 'sub',    label: '서브' },
  { key: 'branch', label: '분기' },
];

// ── 유체 물성표 [온도 °C, ρ kg/m³, ν ×10⁻⁶ m²/s] ─────────────────

export type FNFluidId = 'water' | 'air' | 'steam' | 'oil' | 'glycol' | 'custom';

export interface FNFluidRow { t: number; rho: number; nu_e6: number }

export interface FNFluidDef {
  id: FNFluidId;
  label: string;
  rows: FNFluidRow[];          // custom은 빈 배열 (ρ·ν 직접입력)
  pressCorrect: boolean;       // 공기만 true: ρ×=P/1.01325, ν÷=P/1.01325 (bar a)
  compressible: boolean;       // 압축성 경고 대상 (공기·증기)
}

export const FN_FLUIDS: FNFluidDef[] = [
  {
    id: 'water', label: '물', pressCorrect: false, compressible: false,
    // 물 11행 (0~100°C) — 20°C: 998.2 / 1.004e-6 (엑셀 고정값)
    rows: [
      { t: 0,   rho: 999.8, nu_e6: 1.787 },
      { t: 10,  rho: 999.7, nu_e6: 1.307 },
      { t: 20,  rho: 998.2, nu_e6: 1.004 },
      { t: 30,  rho: 995.7, nu_e6: 0.801 },
      { t: 40,  rho: 992.2, nu_e6: 0.658 },
      { t: 50,  rho: 988.1, nu_e6: 0.553 },
      { t: 60,  rho: 983.2, nu_e6: 0.475 },
      { t: 70,  rho: 977.8, nu_e6: 0.413 },
      { t: 80,  rho: 971.8, nu_e6: 0.365 },
      { t: 90,  rho: 965.3, nu_e6: 0.326 },
      { t: 100, rho: 958.4, nu_e6: 0.294 },
    ],
  },
  {
    id: 'air', label: '공기', pressCorrect: true, compressible: true,
    // 공기 6행 (1.01325 bar a) — 압력 보정은 fnFluidProps에서 적용
    rows: [
      { t: 0,   rho: 1.293, nu_e6: 13.30 },
      { t: 20,  rho: 1.205, nu_e6: 15.11 },
      { t: 40,  rho: 1.128, nu_e6: 16.97 },
      { t: 60,  rho: 1.060, nu_e6: 18.90 },
      { t: 80,  rho: 1.000, nu_e6: 20.92 },
      { t: 100, rho: 0.946, nu_e6: 23.06 },
    ],
  },
  {
    id: 'steam', label: '증기', pressCorrect: false, compressible: true,
    // 증기 5행 (포화증기 100~180°C)
    rows: [
      { t: 100, rho: 0.598, nu_e6: 20.53 },
      { t: 120, rho: 1.122, nu_e6: 11.55 },
      { t: 140, rho: 1.967, nu_e6: 6.94 },
      { t: 160, rho: 3.259, nu_e6: 4.41 },
      { t: 180, rho: 5.157, nu_e6: 2.93 },
    ],
  },
  {
    id: 'oil', label: '유류', pressCorrect: false, compressible: false,
    // 유류 4행 (20~80°C, 경유급)
    rows: [
      { t: 20, rho: 840, nu_e6: 4.0 },
      { t: 40, rho: 826, nu_e6: 2.6 },
      { t: 60, rho: 813, nu_e6: 1.9 },
      { t: 80, rho: 799, nu_e6: 1.5 },
    ],
  },
  {
    id: 'glycol', label: '글리콜 (EG 50%)', pressCorrect: false, compressible: false,
    // 글리콜 5행 (0~80°C, EG 50 wt%)
    rows: [
      { t: 0,  rho: 1077, nu_e6: 7.7 },
      { t: 20, rho: 1068, nu_e6: 3.8 },
      { t: 40, rho: 1056, nu_e6: 2.2 },
      { t: 60, rho: 1042, nu_e6: 1.5 },
      { t: 80, rho: 1027, nu_e6: 1.1 },
    ],
  },
  { id: 'custom', label: '직접입력', pressCorrect: false, compressible: false, rows: [] },
];

export function fnFluidDef(id: FNFluidId): FNFluidDef {
  return FN_FLUIDS.find(f => f.id === id) ?? FN_FLUIDS[0];
}

// ── 조도표 ε(mm) — 재질 8종 × 신관/노후 (엑셀 참조표 그대로) ──────

export type FNMaterialId =
  | 'steel' | 'sts' | 'copper' | 'pvc' | 'cast-iron'
  | 'galv-sheet' | 'al-duct' | 'flex-duct';

export interface FNMaterialDef {
  id: FNMaterialId;
  label: string;
  kind: FNSystemType;                  // 셀렉트 그룹 표시용 (배관/덕트) — 선택 제한 아님
  eps_mm: Record<FNCondition, number>;
}

export const FN_MATERIALS: FNMaterialDef[] = [
  { id: 'steel',      label: '강관',         kind: 'pipe', eps_mm: { new: 0.045,  old: 0.5 } },
  { id: 'sts',        label: 'STS관',        kind: 'pipe', eps_mm: { new: 0.015,  old: 0.1 } },
  { id: 'copper',     label: '동관',         kind: 'pipe', eps_mm: { new: 0.0015, old: 0.01 } },
  { id: 'pvc',        label: 'PVC/PE관',     kind: 'pipe', eps_mm: { new: 0.0015, old: 0.01 } },
  { id: 'cast-iron',  label: '주철관',       kind: 'pipe', eps_mm: { new: 0.26,   old: 1.0 } },
  { id: 'galv-sheet', label: '아연도금강판', kind: 'duct', eps_mm: { new: 0.15,   old: 0.3 } },
  { id: 'al-duct',    label: '알루미늄덕트', kind: 'duct', eps_mm: { new: 0.03,   old: 0.1 } },
  { id: 'flex-duct',  label: '플렉시블덕트', kind: 'duct', eps_mm: { new: 1.0,    old: 3.0 } },
];

export function fnMaterial(id: FNMaterialId): FNMaterialDef {
  return FN_MATERIALS.find(m => m.id === id) ?? FN_MATERIALS[0];
}

// ── 목표 유속범위 기본값 (m/s) — 계통 종류 × 구간 등급 (수정 가능) ─

export interface FNVelocityRange { min: number; max: number }
export type FNVelocityLimits = Record<FNGrade, FNVelocityRange>;

export const FN_V_LIMIT_DEFAULTS: Record<FNSystemType, FNVelocityLimits> = {
  duct: { main: { min: 6, max: 10 }, sub: { min: 4, max: 8 }, branch: { min: 5, max: 7 } },
  pipe: { main: { min: 1, max: 3 },  sub: { min: 1, max: 3 }, branch: { min: 1, max: 3 } },
};

/** 목표 마찰률 R 권장값 (Pa/m) — 참고 표시용, 계산 미사용 */
export const FN_TARGET_R_PA_PER_M: Record<FNSystemType, number> = { duct: 1.0, pipe: 300 };

// ── 목표 마찰률 R 단위 — 실무 마찰손실 구배 단위 (내부 계산은 Pa/m 환산) ──

export interface FNRUnitDef { id: string; label: string; toPaPerM: number }

/** R 입력 단위 목록 — toPaPerM: 해당 단위 1 = ? Pa/m */
export const FN_R_UNITS: FNRUnitDef[] = [
  { id: 'Pa/m',     label: 'Pa/m',     toPaPerM: 1 },
  { id: 'kPa/m',    label: 'kPa/m',    toPaPerM: 1000 },
  { id: 'mmAq/m',   label: 'mmAq/m',   toPaPerM: FN_PA_PER_MMAQ },
  { id: 'mAq/100m', label: 'mAq/100m', toPaPerM: FN_PA_PER_MMAQ * 1000 / 100 },
];

export function fnRUnit(id: string): FNRUnitDef {
  return FN_R_UNITS.find(u => u.id === id) ?? FN_R_UNITS[0];
}

/** R 단위 환산 표시용 — 유효숫자 6자리로 다듬어 부동소수 꼬리 제거 */
export const fmtR = (n: number): string => Number.isFinite(n) ? String(Number(n.toPrecision(6))) : '';
