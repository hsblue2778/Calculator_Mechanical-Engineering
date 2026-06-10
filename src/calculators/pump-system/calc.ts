// HVAC 펌프 시스템 계산기 — 순수 계산 함수
//
// 사용 공식:
//   배관 마찰손실 — Darcy-Weisbach + 유동 영역별 마찰계수 (pipe-friction/engine.ts 공용)
//                   층류 64/Re · 천이 3차 보간 · 난류 Colebrook-White 반복해
//                   Re = V·D/ν (실제 유체 ν(T) 적용), ε: 재질×신관/노후 (pipeRoughness.ts)
//   부속 손실     — K-method: h_K = K × V² / (2g)
//   총양정 TDH (개방계) — TDH = (Hd - Hs) + ΔH_suc + ΔH_dis + ΔH_fit + ΔH_equip + H_res
//   총양정 TDH (폐회로) — TDH = ΔH_suc + ΔH_dis + ΔH_fit + ΔH_equip + H_res (정수두 차 0)
//   NPSHa (개방계) — NPSHa = (P_atm - P_vapor)/(ρg) + Hs - Σhf_suc - Σh_fit_suc
//   NPSHa (폐회로) — NPSHa = (P_fill - P_vapor)/(ρg) + Hs - Σhf_suc - Σh_fit_suc
//   이론 동력     — P = ρ·g·Q·H / η  (η=0.65 고정)
//
// 공식 출처:
//   Darcy-Weisbach + Colebrook-White(1939)·층류 64/Re·천이 보간(EPANET 준용): pipe-friction/engine.ts 참조
//   K-method: Perry's Chemical Engineers' Handbook 8th Ed (2008)
//             https://myengineeringtools.com/Piping/Pressure_Drop_Key_Piping_Elements_K_Coefficient.html
//   TDH·NPSHa·동력: ASHRAE Handbook HVAC Systems and Equipment / Pump equation (교과서 형태 유지)
//   폐회로 NPSHa: ASHRAE Handbook HVAC Systems and Equipment, Closed-Loop Hydronic System 항목
//                Hydraulic Institute Standards HI 9.6.1
//
// 유체 물성: glycol-properties.ts (청수·온수: NIST WebBook; EG/PG: Phase 1.5)

import { frictionFactor, type FMethod } from '../pipe-friction/engine.ts';
import { getDensity, getKinematicViscosity, getSpecificHeat, type FluidType } from '../../data/glycol-properties';
import { calcFittingLoss_m } from '../../data/fitting-k-values';
import type { ScheduleId } from '../../data/pipeSizes';

// 중력 가속도
const G = 9.81; // m/s²

// 20°C 포화 수증기압 (Pa)
// 출처: NIST Chemistry WebBook — Water saturation properties
// https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Mask=4
// 20°C에서 P_vapor = 2338.8 Pa
const P_VAPOR_20C_PA = 2338.8;

// 온도별 포화 수증기압 근사 (Antoine 식 기반, 0~100°C 물)
// ln(P) = A - B/(C+T)  (P in Pa, T in °C)
// A=23.7836, B=3782.89, C=230.111 — Engineering Toolbox 인용
// https://www.engineeringtoolbox.com/water-vapor-saturation-pressure-d_599.html
function getSatVaporPressure_Pa(tempC: number): number {
  // Antoine coefficients for water (P in Pa, T in °C)
  const A = 23.7836;
  const B = 3782.89;
  const C_ant = 230.111;
  return Math.exp(A - B / (C_ant + tempC));
}

// ── 시스템 모드 ───────────────────────────────────────────────────
export type SystemMode = 'open' | 'closed';

// ── 장비 종류 ─────────────────────────────────────────────────────
export type EquipKind = 'control-valve' | 'heat-exchanger' | 'filter' | 'pump' | 'other';

// ── 배관 구간 타입 ─────────────────────────────────────────────────
export interface PipeSegment {
  side: 'suction' | 'discharge';
  materialId: string;       // PDF 표기·출처용
  scheduleId: ScheduleId;   // 두께규격 ID (신규)
  scheduleLabel: string;    // PDF 표기용 ('KS일반', 'Sch40', 'Type K' 등)
  nominalA: number;
  id_mm: number;
  L_m: number;
  eps_mm: number;           // 절대조도 (재질×신관/노후 — pipeRoughness.ts)
  materialNameKo: string;   // PDF 표기용
}

// ── 부속 행 타입 ─────────────────────────────────────────────────
export interface FittingRow {
  fittingId: string;          // FITTING_K_VALUES의 id
  pipeRefIndex: number;       // 같은 side 내 인덱스 (예: 흡입 첫 배관 = 0)
  pipeRefSide: 'suction' | 'discharge';
  qty: number;                // 수량
}

// ── 장비류 행 타입 ───────────────────────────────────────────────
export interface EquipRow {
  name: string;           // 장비명
  dP_Pa: number;          // 압력강하 (Pa, 내부 SI)
  pipeRefIndex: number;   // 위치 표시용 (계산에는 미반영)
  pipeRefSide: 'suction' | 'discharge';
  kind: EquipKind;        // 장비 종류 (기본 'other')
  dirtyMargin: boolean;   // 필터 Dirty 마진 적용 여부 (kind='filter'일 때만 유효; 기본 false)
}

// ── 계산 입력 ────────────────────────────────────────────────────
export interface PumpHvacInput {
  systemMode: SystemMode;       // 신규: 개방계 / 폐회로

  fluid: FluidType;
  concPct: number;              // 글리콜 농도 (%, 청수·온수는 0)
  tempC: number;                // 운전 온도 (°C)

  sucPipes: PipeSegment[];      // 흡입측 배관 구간 목록 (1개 이상)
  disPipes: PipeSegment[];      // 토출측 배관 구간 목록 (1개 이상)

  Q_m3s: number;                // 유량 (m³/s, 내부 SI)

  fittings: FittingRow[];       // 부속류 (흡입+토출 합산)
  equipItems: EquipRow[];       // 장비류

  Hs_m: number;                 // 흡입측 정수두 (m) / 폐회로: 펌프 위치 수두 차
  Hd_m: number;                 // 토출측 정수두 (m) / 폐회로: 0 강제
  Pres_Pa: number;              // 잔류 토출 압력 (Pa)
  Patm_Pa: number;              // 흡입측 표면 절대압력 (Pa) / 폐회로: 시스템 충진 절대압력

  headMarginPct: number;        // 양정 여유 (%, 예: 10)
  powerMarginFactor: number;    // 동력 여유 배율 (예: 1.15)
  npshMargin_m: number;         // NPSH 여유 (m)
  NPSHr_m: number;              // 펌프 카탈로그 NPSHr (m) — 0 = 미입력

  eta: number;                  // 펌프 효율 (무차원, 기본 0.65)
}

// ── CV Authority 판정 타입 ───────────────────────────────────────
export type CVAuthorityVerdict = 'too-low' | 'low-margin' | 'ok' | 'high-margin' | 'too-high' | 'na';

// ── 계산 결과 ────────────────────────────────────────────────────
export interface PipeLossDetail {
  pipeNo: number;           // 1, 2, 3...
  side: 'suction' | 'discharge';
  pipeLabel: string;        // 'SP-1', 'DP-2' 등
  materialId: string;
  materialNameKo: string;
  scheduleId: ScheduleId;   // 두께규격 ID (신규)
  scheduleLabel: string;    // 두께규격 표시 (신규)
  nominalA: number;
  id_mm: number;
  L_m: number;
  f: number;                // 적용 마찰계수 (영역별 자동 산출 — PDF 추적용)
  fMethod: FMethod;         // 적용식 (층류/천이/난류/—)
  V_ms: number;
  Re: number;
  hf_m: number;             // 직관 마찰손실 (m)
}

export interface FittingLossDetail {
  fittingNo: number;        // F-1의 1
  fittingLabel: string;     // 'F-1'
  pipeLabel: string;        // 'SP-1' 등 — 어느 배관에 부착됐는지
  fittingId: string;
  nameKo: string;
  side: 'suction' | 'discharge';
  K: number;
  V_ms: number;
  qty: number;
  h_each_m: number;         // 개당 손실 (m)
  h_total_m: number;        // qty × h_each_m
}

export interface EquipLossDetail {
  equipNo: number;
  equipLabel: string;       // 'E-1'
  pipeLabel: string;
  side: 'suction' | 'discharge';
  name: string;
  dP_Pa: number;            // 원본 입력 ΔP (마진 적용 전)
  h_m: number;              // 실제 적용된 손실 수두 (dirty 마진 반영)
  kind: EquipKind;          // 장비 종류
  dirtyApplied: boolean;    // Dirty 마진 적용 여부
}

export interface PumpHvacResult {
  systemMode: SystemMode;

  rho: number;              // 밀도 (kg/m³)
  nu: number;               // 동점성계수 (m²/s)
  P_vapor_Pa: number;       // 포화수증기압 (Pa) — NPSHa 변수 추적용

  sucPipes: PipeLossDetail[];       // 흡입측 배관별 손실
  disPipes: PipeLossDetail[];       // 토출측 배관별 손실
  sucPipeLoss_total_m: number;      // 흡입측 직관 합산 (m)
  disPipeLoss_total_m: number;      // 토출측 직관 합산 (m)

  fittingDetails: FittingLossDetail[];
  sucFittingLoss_m: number;         // 흡입측 부속 합산 (m)
  disFittingLoss_m: number;         // 토출측 부속 합산 (m)
  totalFittingLoss_m: number;

  equipDetails: EquipLossDetail[];
  equipLoss_m: number;              // 장비류 합산 (m)

  staticHead_m: number;             // 정수두 차 Hd - Hs / 폐회로 시 0
  Hres_m: number;                   // 잔류압력 수두 (m)

  TDH_m: number;                    // 총양정 (m)
  designHead_m: number;             // 설계 양정 = TDH × (1 + margin%)
  theoPower_W: number;              // 이론 동력 (W)
  designPower_W: number;            // 설계 동력 (W)

  NPSHa_m: number;                  // NPSHa (m)

  // NPSHr 판정 (ASHRAE / HI 9.6.1)
  NPSHr_m: number;                  // 입력된 NPSHr (echo)
  NPSHmargin_actual_m: number | null; // NPSHa - NPSHr (NPSHr 0이면 null)
  NPSHverdict: 'pass' | 'low-margin' | 'risk' | 'na'; // na = NPSHr 미입력

  // IEC 60034-1 모터 정격
  recommendedMotorRating_kW: number; // 설계 동력 기준 IEC 상위 표준 정격 (kW)

  // 운전점 차트용 (OperatingPointChart)
  systemCurve: SystemCurvePoint[];  // H_static + k·Q² 30점
  k_system: number;                  // 시스템 저항 계수 [(m)/(m³/h)²]
  H_static_now_m: number;            // 운전점 산출에 쓰인 정수두 (m)

  // 양정 구성 분석 (카테고리별 TDH 분해)
  // 출처: ASHRAE Pumping Authority guideline (CV β = 0.25~0.5)
  headBreakdown_m: {
    controlValve: number;
    heatExchanger: number;
    filter: number;
    pumpEquip: number;
    otherEquip: number;
    pipeFriction: number;
    staticAndResidual: number;
  };

  // 컨트롤 밸브 권위 (authority) β = ΔP_CV / TDH
  cvAuthority: number;           // 0~1, 0이면 CV 미입력
  cvVerdict: CVAuthorityVerdict; // 판정
}

// ── 시스템 곡선 타입 ───────────────────────────────────────────────
export interface SystemCurvePoint {
  Q_m3h: number;
  H_m: number;
}

// ── 시스템 곡선 생성 ──────────────────────────────────────────────
// H(Q) = H_static + k·Q²   (k = (TDH - H_static) / Q_design²)
// 출처: ASHRAE Handbook HVAC Systems and Equipment / Hydraulic Institute — System Resistance Curve
export function generateSystemCurve(
  TDH_m: number,
  H_static_m: number,
  Q_design_m3h: number,
  numPoints: number = 30,
  Q_max_m3h?: number,
): SystemCurvePoint[] {
  if (Q_design_m3h <= 0 || TDH_m <= H_static_m) return [];
  const k = (TDH_m - H_static_m) / (Q_design_m3h * Q_design_m3h);
  const Q_max = Q_max_m3h ?? Q_design_m3h * 1.5;
  const points: SystemCurvePoint[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const Q = (i / numPoints) * Q_max;
    points.push({ Q_m3h: Q, H_m: H_static_m + k * Q * Q });
  }
  return points;
}

// ── 펌프 곡선·시스템 곡선 교점 (선형 보간) ───────────────────────
// 펌프 곡선이 시스템 곡선보다 위에 있다가 아래로 내려가는 첫 지점을 찾음
// 출처: Hydraulic Institute — Pump System Curve Intersection Method
export function findOperatingPoint(
  pumpCurve: { Q_m3h: number; H_m: number }[],
  H_static_m: number,
  k: number,
): { Q_m3h: number; H_m: number } | null {
  if (pumpCurve.length < 2) return null;
  const sorted = [...pumpCurve].sort((a, b) => a.Q_m3h - b.Q_m3h);
  for (let i = 0; i < sorted.length - 1; i++) {
    const p0 = sorted[i];
    const p1 = sorted[i + 1];
    const sys0 = H_static_m + k * p0.Q_m3h * p0.Q_m3h;
    const sys1 = H_static_m + k * p1.Q_m3h * p1.Q_m3h;
    const diff0 = p0.H_m - sys0;
    const diff1 = p1.H_m - sys1;
    if (diff0 >= 0 && diff1 < 0) {
      const ratio = diff0 / (diff0 - diff1);
      const Q_op = p0.Q_m3h + ratio * (p1.Q_m3h - p0.Q_m3h);
      const H_op = H_static_m + k * Q_op * Q_op;
      return { Q_m3h: Q_op, H_m: H_op };
    }
  }
  return null;
}

// ── 메인 계산 함수 ────────────────────────────────────────────────
export function computePumpHvac(
  input: PumpHvacInput,
  fittingKMap: Record<string, number>,    // fittingId → K (UI에서 주입)
  fittingNameMap: Record<string, string>, // fittingId → nameKo
): PumpHvacResult | null {

  // ① 입력 검증
  if (input.sucPipes.length === 0 || input.disPipes.length === 0) return null;
  for (const p of [...input.sucPipes, ...input.disPipes]) {
    if (!Number.isFinite(p.id_mm) || p.id_mm <= 0) return null;
    if (!Number.isFinite(p.L_m) || p.L_m <= 0) return null;
  }
  if (!Number.isFinite(input.Q_m3s) || input.Q_m3s <= 0) return null;

  // ② 물성 취득 (청수·온수: NIST; EG/PG: throw)
  let rho: number;
  let nu: number;
  try {
    rho = getDensity(input.fluid, input.concPct, input.tempC);
    nu = getKinematicViscosity(input.fluid, input.concPct, input.tempC);
  } catch {
    return null; // EG/PG Phase 1.5 미구현
  }

  // ③·④ 배관별 마찰손실 — Darcy-Weisbach + 영역별 마찰계수 (pipe-friction/engine.ts)
  // hf = f·(L/D)·V²/(2g), Re = V·D/ν (실제 유체 ν(T)), f: 층류 64/Re·천이 보간·난류 Colebrook-White
  const segmentFriction = (p: PipeSegment) => {
    const D_m = p.id_mm / 1000;
    const V_ms = input.Q_m3s / (Math.PI * D_m * D_m / 4);
    const Re = V_ms * D_m / nu;
    const ff = frictionFactor(Re, (p.eps_mm / 1000) / D_m);
    const hf_m = ff.f * (p.L_m / D_m) * V_ms * V_ms / (2 * G);
    return { V_ms, Re, f: ff.f, fMethod: ff.method, hf_m };
  };

  const sucPipes: PipeLossDetail[] = input.sucPipes.map((p, i) => ({
    pipeNo: i + 1,
    side: 'suction' as const,
    pipeLabel: `SP-${i + 1}`,
    materialId: p.materialId,
    materialNameKo: p.materialNameKo,
    scheduleId: p.scheduleId,
    scheduleLabel: p.scheduleLabel,
    nominalA: p.nominalA,
    id_mm: p.id_mm,
    L_m: p.L_m,
    ...segmentFriction(p),
  }));

  const disPipes: PipeLossDetail[] = input.disPipes.map((p, i) => ({
    pipeNo: i + 1,
    side: 'discharge' as const,
    pipeLabel: `DP-${i + 1}`,
    materialId: p.materialId,
    materialNameKo: p.materialNameKo,
    scheduleId: p.scheduleId,
    scheduleLabel: p.scheduleLabel,
    nominalA: p.nominalA,
    id_mm: p.id_mm,
    L_m: p.L_m,
    ...segmentFriction(p),
  }));

  const sucPipeLoss_total_m = sucPipes.reduce((s, p) => s + p.hf_m, 0);
  const disPipeLoss_total_m = disPipes.reduce((s, p) => s + p.hf_m, 0);

  // ⑤ 부속류 손실 — K-method: h_K = K × V² / (2g)
  // pipeRefSide + pipeRefIndex 로 해당 배관 유속·라벨 추출
  // 출처: Perry's Chemical Engineers' Handbook 8th Ed (2008)
  //       https://myengineeringtools.com/Piping/Pressure_Drop_Key_Piping_Elements_K_Coefficient.html
  const fittingDetails: FittingLossDetail[] = [];
  let sucFittingLoss_m = 0;
  let disFittingLoss_m = 0;

  input.fittings.forEach((row, idx) => {
    const pipes = row.pipeRefSide === 'suction' ? sucPipes : disPipes;
    const refPipe = pipes[row.pipeRefIndex];
    if (!refPipe || row.qty <= 0) return;
    const K = fittingKMap[row.fittingId];
    if (K === undefined) return;
    const V_ms = refPipe.V_ms;
    const h_each_m = calcFittingLoss_m(K, V_ms);
    const h_total_m = h_each_m * row.qty;
    fittingDetails.push({
      fittingNo: idx + 1,
      fittingLabel: `F-${idx + 1}`,
      pipeLabel: refPipe.pipeLabel,
      fittingId: row.fittingId,
      nameKo: fittingNameMap[row.fittingId] ?? row.fittingId,
      side: row.pipeRefSide,
      K,
      V_ms,
      qty: row.qty,
      h_each_m,
      h_total_m,
    });
    if (row.pipeRefSide === 'suction') sucFittingLoss_m += h_total_m;
    else disFittingLoss_m += h_total_m;
  });
  const totalFittingLoss_m = sucFittingLoss_m + disFittingLoss_m;

  // ⑥ 장비류 손실 (Pa → m 수두 변환, 개별 보존)
  // h = dP / (ρ·g)
  // 필터 dirty 마진 — clean ΔP × 2.5 (ASHRAE Filtration & Air Cleaning, 일반 운전 마진)
  const equipDetails: EquipLossDetail[] = input.equipItems.map((eq, i) => {
    const pipes = eq.pipeRefSide === 'suction' ? sucPipes : disPipes;
    const refPipe = pipes[eq.pipeRefIndex];
    const kind: EquipKind = eq.kind ?? 'other';
    const dirtyMargin = eq.dirtyMargin ?? false;
    const dirtyApplied = kind === 'filter' && dirtyMargin;
    const effective_dP_Pa = dirtyApplied ? eq.dP_Pa * 2.5 : eq.dP_Pa;
    return {
      equipNo: i + 1,
      equipLabel: `E-${i + 1}`,
      pipeLabel: refPipe?.pipeLabel ?? '—',
      side: eq.pipeRefSide,
      name: eq.name,
      dP_Pa: eq.dP_Pa,
      h_m: effective_dP_Pa > 0 ? effective_dP_Pa / (rho * G) : 0,
      kind,
      dirtyApplied,
    };
  });
  const equipLoss_m = equipDetails.reduce((s, e) => s + e.h_m, 0);

  // ⑦ 잔류 토출 압력 수두
  const Hres_m = input.Pres_Pa / (rho * G);

  // ⑧ 정수두 (모드별 분기)
  // 폐회로 모드에서는 정수두 차 = 0
  const staticHead_m = input.systemMode === 'open' ? (input.Hd_m - input.Hs_m) : 0;

  // ⑨ 총양정 TDH (모드별 분기)
  // 개방계: TDH = (Hd - Hs) + Σhf_suc + Σhf_dis + Σh_fit + Σh_equip + H_res
  // 폐회로: TDH = Σhf_suc + Σhf_dis + Σh_fit + Σh_equip + H_res (정수두 차 0)
  // 출처: ASHRAE Handbook HVAC Systems and Equipment (Pump Selection)
  const TDH_m =
    staticHead_m +
    sucPipeLoss_total_m +
    disPipeLoss_total_m +
    sucFittingLoss_m +
    disFittingLoss_m +
    equipLoss_m +
    Hres_m;

  // ⑩ 설계 양정
  const designHead_m = TDH_m * (1 + input.headMarginPct / 100);

  // ⑪ 이론 동력 P = ρ·g·Q·H / η  (단위: W)
  // 출처: 유체역학 펌프 동력 공식 (교과서 표준형)
  const theoPower_W = (rho * G * input.Q_m3s * TDH_m) / input.eta;
  const designPower_W = theoPower_W * input.powerMarginFactor;

  // ⑫ NPSHa — 유효 흡입수두
  // 개방계: NPSHa = (P_atm - P_vapor) / (ρ·g) + Hs - Σhf_suc - Σh_fit_suc
  // 폐회로: NPSHa = (P_fill - P_vapor) / (ρ·g) + Hs - Σhf_suc - Σh_fit_suc
  //   (P_atm 자리에 P_fill 들어감 — 입력값 변경만, 식 형태 동일)
  // 출처: Hydraulic Institute Standards HI 9.6.1
  //       폐회로: ASHRAE Handbook HVAC Systems and Equipment, Closed-Loop Hydronic System항목
  const P_vapor_Pa = getSatVaporPressure_Pa(input.tempC);
  const NPSHa_m =
    (input.Patm_Pa - P_vapor_Pa) / (rho * G) +
    input.Hs_m -
    sucPipeLoss_total_m -
    sucFittingLoss_m;

  // ⑬ NPSHr 판정
  // 출처: ASHRAE Handbook HVAC Systems and Equipment / Hydraulic Institute Standards HI 9.6.1
  const NPSHr_m = input.NPSHr_m ?? 0;
  let NPSHmargin_actual_m: number | null = null;
  let NPSHverdict: 'pass' | 'low-margin' | 'risk' | 'na' = 'na';
  if (NPSHr_m > 0) {
    NPSHmargin_actual_m = NPSHa_m - NPSHr_m;
    if (NPSHmargin_actual_m >= input.npshMargin_m) {
      NPSHverdict = 'pass';
    } else if (NPSHmargin_actual_m >= 0) {
      NPSHverdict = 'low-margin';
    } else {
      NPSHverdict = 'risk';
    }
  }

  // ⑭ IEC 60034-1 모터 표준 정격 추천
  const recommendedMotorRating_kW = getRecommendedMotorRating_kW(designPower_W);

  // ⑮ 시스템 곡선 생성 (운전점 차트용)
  // H_static_now_m: 폐회로는 0, 개방계는 Hd - Hs
  const H_static_now_m = staticHead_m;
  const Q_design_m3h = input.Q_m3s * 3600;
  let k_system = 0;
  if (Q_design_m3h > 0 && TDH_m > H_static_now_m) {
    k_system = (TDH_m - H_static_now_m) / (Q_design_m3h * Q_design_m3h);
  }
  const systemCurve = generateSystemCurve(TDH_m, H_static_now_m, Q_design_m3h);

  // ⑯ 양정 구성 분석 — TDH를 카테고리별로 분해 (m 단위)
  // 출처: ASHRAE Pumping Authority guideline (CV β = 0.25~0.5)
  const breakdownByKind: Record<EquipKind, number> = {
    'control-valve': 0,
    'heat-exchanger': 0,
    'filter': 0,
    'pump': 0,
    'other': 0,
  };
  for (const e of equipDetails) {
    breakdownByKind[e.kind] += e.h_m;
  }

  const pipeFrictionLoss_m = sucPipeLoss_total_m + disPipeLoss_total_m + totalFittingLoss_m;
  const staticAndResidual_m = staticHead_m + Hres_m;

  const headBreakdown_m = {
    controlValve: breakdownByKind['control-valve'],
    heatExchanger: breakdownByKind['heat-exchanger'],
    filter: breakdownByKind['filter'],
    pumpEquip: breakdownByKind['pump'],
    otherEquip: breakdownByKind['other'],
    pipeFriction: pipeFrictionLoss_m,
    staticAndResidual: staticAndResidual_m,
  };

  // 컨트롤 밸브 권위 (authority) β = ΔP_CV / TDH
  let cvAuthority = 0;
  let cvVerdict: CVAuthorityVerdict = 'na';
  if (TDH_m > 0 && breakdownByKind['control-valve'] > 0) {
    cvAuthority = breakdownByKind['control-valve'] / TDH_m;
    if (cvAuthority < 0.15)       cvVerdict = 'too-low';
    else if (cvAuthority < 0.25)  cvVerdict = 'low-margin';
    else if (cvAuthority <= 0.50) cvVerdict = 'ok';
    else if (cvAuthority <= 0.60) cvVerdict = 'high-margin';
    else                          cvVerdict = 'too-high';
  }

  return {
    systemMode: input.systemMode,
    rho,
    nu,
    P_vapor_Pa,
    sucPipes,
    disPipes,
    sucPipeLoss_total_m,
    disPipeLoss_total_m,
    fittingDetails,
    sucFittingLoss_m,
    disFittingLoss_m,
    totalFittingLoss_m,
    equipDetails,
    equipLoss_m,
    staticHead_m,
    Hres_m,
    TDH_m,
    designHead_m,
    theoPower_W,
    designPower_W,
    NPSHa_m,
    NPSHr_m,
    NPSHmargin_actual_m,
    NPSHverdict,
    recommendedMotorRating_kW,
    systemCurve,
    k_system,
    H_static_now_m,
    headBreakdown_m,
    cvAuthority,
    cvVerdict,
  };
}

// IEC 60034-1 Rotating electrical machines — Standard kW ratings
// 출처: IEC 60034-1 / 한국 표준 펌프 모터 정격 단계
export const IEC_MOTOR_RATINGS_KW = [
  0.12, 0.18, 0.25, 0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3.0, 4.0, 5.5, 7.5,
  11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200, 250, 315,
];

/**
 * 설계 동력(W)을 받아 IEC 표준 정격(kW) 중 가장 가까운 상위 단계 반환
 * 315kW 초과 시 입력값을 kW로 반환 (특수 사양으로 표시)
 */
export function getRecommendedMotorRating_kW(designPower_W: number): number {
  if (!Number.isFinite(designPower_W) || designPower_W <= 0) return 0;
  const designPower_kW = designPower_W / 1000;
  for (const r of IEC_MOTOR_RATINGS_KW) {
    if (r >= designPower_kW) return r;
  }
  return Math.ceil(designPower_kW); // 315 kW 초과
}

// 포화 수증기압 내보내기 (개요 탭 참고용)
export { getSatVaporPressure_Pa, G, P_VAPOR_20C_PA };

// ── 인버터(VFD) 운전 — 상사칙(Affinity Laws) 변환 ──────────────────
// Q₂/Q₁ = N₂/N₁,  H₂/H₁ = (N₂/N₁)²,  P₂/P₁ = (N₂/N₁)³
// 회전수 N은 주파수 Hz에 비례 (정극형 동기·유도 모터)
// 출처: Hydraulic Institute Standards / ISO 9906 / ASHRAE Pump Handbook

export interface PumpCurveAtHz {
  hz: number;
  points: { Q_m3h: number; H_m: number }[];
  operatingPoint: { Q_m3h: number; H_m: number; P_W: number } | null;
  bepVerdict: 'optimal' | 'acceptable' | 'out-of-range' | 'na';
}

/**
 * 상사칙 변환 — 카탈로그 곡선을 다른 주파수로 변환
 * Q ∝ N (N ∝ Hz),  H ∝ N²
 * 출처: Hydraulic Institute Standards / ISO 9906 / ASHRAE Pump Handbook
 */
export function transformCurveByAffinity(
  catalogPoints: { Q_m3h: number; H_m: number }[],
  catalogHz: number,
  targetHz: number,
): { Q_m3h: number; H_m: number }[] {
  if (catalogHz <= 0 || targetHz <= 0) return [...catalogPoints];
  const ratio = targetHz / catalogHz;
  return catalogPoints.map(p => ({
    Q_m3h: p.Q_m3h * ratio,
    H_m: p.H_m * ratio * ratio,
  }));
}

/**
 * 펌프 곡선 family 생성 — 여러 주파수에서의 곡선과 각 운전점
 * BEP_Q_catalog_m3h: 카탈로그 Hz 기준 BEP 유량 (null이면 BEP 판정 생략)
 * 출처: Hydraulic Institute Standards / ISO 9906 / ASHRAE Pump Handbook
 */
export function generatePumpCurveFamily(
  catalogPoints: { Q_m3h: number; H_m: number }[],
  catalogHz: number,
  targetHzList: number[],
  H_static_m: number,
  k_system: number,
  rho: number,
  eta: number,
  BEP_Q_catalog_m3h: number | null,
): PumpCurveAtHz[] {
  return targetHzList.map(hz => {
    const points = transformCurveByAffinity(catalogPoints, catalogHz, hz);
    const opPoint = findOperatingPoint(points, H_static_m, k_system);

    let bepVerdict: 'optimal' | 'acceptable' | 'out-of-range' | 'na' = 'na';
    const result: PumpCurveAtHz = { hz, points, operatingPoint: null, bepVerdict };

    if (opPoint) {
      const Q_m3s = opPoint.Q_m3h / 3600;
      // P ∝ N³ — 동력도 상사칙으로 변환 (공식: P = ρgQH/η)
      const P_W = (rho * G * Q_m3s * opPoint.H_m) / eta;
      result.operatingPoint = { Q_m3h: opPoint.Q_m3h, H_m: opPoint.H_m, P_W };

      // BEP 판정: BEP 유량도 상사칙으로 변환 — Q_BEP_at_hz = Q_BEP_catalog × hz/catalogHz
      if (BEP_Q_catalog_m3h != null && BEP_Q_catalog_m3h > 0 && catalogHz > 0) {
        const BEP_Q_at_hz = BEP_Q_catalog_m3h * (hz / catalogHz);
        const ratio = opPoint.Q_m3h / BEP_Q_at_hz;
        if (ratio >= 0.80 && ratio <= 1.10) result.bepVerdict = 'optimal';
        else if (ratio >= 0.70 && ratio <= 1.25) result.bepVerdict = 'acceptable';
        else result.bepVerdict = 'out-of-range';
      }
    }
    return result;
  });
}

// ── 열부하 기반 유량 산출 ─────────────────────────────────────────
// 출처: ASHRAE 표준 열교환 유량식
// 비열·밀도: NIST Chemistry WebBook (glycol-properties.ts)

export interface FlowFromHeatInput {
  fluid: FluidType;
  concPct: number;       // 청수·온수는 0
  tempC: number;         // 평균 운전 온도 (℃)
  q_kW: number;          // 열부하
  deltaT_K: number;      // 온도차 (℃ = K)
}

/**
 * 열부하와 온도차로부터 유량 산출 (Q = q / (ρ·cp·ΔT))
 * @returns Q [m³/s] 또는 입력 오류 시 null (호출부에서 ×3600 하여 m³/h 표시)
 */
export function calcFlowFromHeatLoad(input: FlowFromHeatInput): number | null {
  // 입력 검증: 0·음수·NaN 방어
  if (!Number.isFinite(input.q_kW) || input.q_kW <= 0) return null;
  if (!Number.isFinite(input.deltaT_K) || input.deltaT_K <= 0) return null;
  if (!Number.isFinite(input.tempC)) return null;

  let rho: number;
  let cp: number;
  try {
    rho = getDensity(input.fluid, input.concPct, input.tempC);
    cp = getSpecificHeat(input.fluid, input.concPct, input.tempC); // J/(kg·K)
  } catch {
    return null;
  }

  const q_W = input.q_kW * 1000;
  const Q_m3s = q_W / (rho * cp * input.deltaT_K);
  return Q_m3s; // 호출부에서 ×3600 하여 m³/h 표시
}
