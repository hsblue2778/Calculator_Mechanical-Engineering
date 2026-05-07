// 냉수배관 보온 두께 계산기 — 순수 함수
// 결로 방지 목적: 보온재 외표면 온도 Ts > 노점 Td 가 되도록 두께 d 산정
// 공식 출처: 인수인계 사양서 §5 (Magnus 식 + 정상상태 직렬 열저항)

// ── 데이터 (사양서 §3-2 ~ §3-4) ─────────────────────────────

export interface PipeOdSpec {
  nominalA: number;     // 호칭경 (15A, 20A, ...)
  od_mm: number;        // 외경 (mm)
  od_m: number;         // 외경 (m, 내부 계산용)
}

// KS 강관 외경 (사양서 §3-2)
export const PIPE_OD_TABLE: PipeOdSpec[] = [
  { nominalA: 15,  od_mm: 21.7,  od_m: 0.0217 },
  { nominalA: 20,  od_mm: 27.2,  od_m: 0.0272 },
  { nominalA: 25,  od_mm: 34.0,  od_m: 0.0340 },
  { nominalA: 32,  od_mm: 42.7,  od_m: 0.0427 },
  { nominalA: 40,  od_mm: 48.6,  od_m: 0.0486 },
  { nominalA: 50,  od_mm: 60.5,  od_m: 0.0605 },
  { nominalA: 65,  od_mm: 76.3,  od_m: 0.0763 },
  { nominalA: 80,  od_mm: 89.1,  od_m: 0.0891 },
  { nominalA: 100, od_mm: 114.3, od_m: 0.1143 },
  { nominalA: 125, od_mm: 139.8, od_m: 0.1398 },
  { nominalA: 150, od_mm: 165.2, od_m: 0.1652 },
  { nominalA: 200, od_mm: 216.3, od_m: 0.2163 },
];

export interface InsulationMaterial {
  id: 'rubber' | 'pe-foam' | 'glasswool' | 'custom';
  nameKo: string;
  k: number | null;     // W/(m·K), custom은 null
  recommended: boolean; // 냉수배관 권장 여부
  warning?: string;
}

// 보온재 (사양서 §3-3)
export const INSULATION_MATERIALS: InsulationMaterial[] = [
  { id: 'rubber',    nameKo: '고무발포 (NBR/EPDM)', k: 0.038, recommended: true },
  { id: 'pe-foam',   nameKo: 'PE 폼',               k: 0.040, recommended: true },
  { id: 'glasswool', nameKo: '글라스울',             k: 0.040, recommended: false,
    warning: '습기 흡수로 단열 성능 저하 위험' },
  { id: 'custom',    nameKo: '직접 입력',            k: null,  recommended: true },
];

// 시판 두께 라인업 (사양서 §5-3)
export const COMMERCIAL_THICKNESS_MM = [13, 19, 25, 32, 38, 50] as const;

// Magnus 식 상수 (사양서 §5-1)
const MAGNUS_A = 17.625;
const MAGNUS_B = 243.04;

// ── 계산 함수 ─────────────────────────────────────────────

// 노점 온도 Td (°C) — Magnus 식
export function dewPoint(Ta: number, RH: number): number {
  const gamma = (MAGNUS_A * Ta) / (MAGNUS_B + Ta) + Math.log(RH / 100);
  return (MAGNUS_B * gamma) / (MAGNUS_A - gamma);
}

// 한계 두께 d (m) — 사양서 §5-2
export function criticalThickness(args: {
  D: number; Ti: number; Ta: number; Td: number; k: number; ho: number;
}): number {
  const { D, Ti, Ta, Td, k, ho } = args;
  const P = (2 * k) / (ho * D);
  const Q = (Ta - Ti) / (Ta - Td);
  const X = P * Q;
  return (D / 2) * (Math.exp(X) - 1);
}

// 시판 두께 매칭 — d_safe_mm 이상인 가장 작은 시판 두께. 없으면 null.
export function selectCommercialThickness(d_safe_mm: number): number | null {
  const found = COMMERCIAL_THICKNESS_MM.find(t => t >= d_safe_mm);
  return found ?? null;
}

// 검산: 추천 시판 두께 적용 시 표면 온도 Ts (사양서 §5-4)
export function verifyInstalled(args: {
  D: number; d_rec_m: number; Ti: number; Ta: number; k: number; ho: number;
}): { D_outer: number; Ts: number } {
  const { D, d_rec_m, Ti, Ta, k, ho } = args;
  const D_outer = D + 2 * d_rec_m;
  const R_ins  = Math.log(D_outer / D) / (2 * Math.PI * k);
  const R_conv = 1 / (ho * Math.PI * D_outer);
  const dT = (Ta - Ti) * R_conv / (R_ins + R_conv);
  return { D_outer, Ts: Ta - dT };
}

// 등급 (사양서 §4-1, §5-5)
export type Grade = '안전' | '주의' | '위험' | '초과';
export function grading(margin: number): Grade {
  if (margin >= 3) return '안전';
  if (margin >= 1) return '주의';
  return '위험';
}

// ── 입력 검증 (사양서 §7) ──────────────────────────────────

export interface InsulationInputs {
  pipeIdx: number;       // PIPE_OD_TABLE 인덱스
  matIdx: number;        // INSULATION_MATERIALS 인덱스
  customK: string;       // 직접 입력 시 사용
  Ti: string;            // °C
  Ta: string;            // °C
  RH: string;            // %
  ho: string;            // W/(m²·K)
  safetyFactor: string;  // 배수
}

export interface InsulationError {
  field: 'Ti' | 'Ta' | 'RH' | 'k' | 'ho' | 'safetyFactor' | 'general';
  message: string;
}

export function validate(inputs: InsulationInputs): InsulationError | null {
  const Ti = parseFloat(inputs.Ti);
  const Ta = parseFloat(inputs.Ta);
  const RH = parseFloat(inputs.RH);
  const ho = parseFloat(inputs.ho);
  const SF = parseFloat(inputs.safetyFactor);
  const mat = INSULATION_MATERIALS[inputs.matIdx];
  const k = mat?.id === 'custom' ? parseFloat(inputs.customK) : (mat?.k ?? NaN);

  if (!Number.isFinite(RH) || RH <= 0 || RH > 100) {
    return { field: 'RH', message: '상대습도는 0 초과 100 이하 값을 입력해야 합니다.' };
  }
  if (!Number.isFinite(Ta)) {
    return { field: 'Ta', message: '외기 온도를 입력해야 합니다.' };
  }
  if (!Number.isFinite(Ti)) {
    return { field: 'Ti', message: '관내 유체 온도를 입력해야 합니다.' };
  }
  if (Ti >= Ta) {
    return { field: 'general',
      message: '본 계산기는 냉수(보냉) 전용입니다 — 보온(온수·증기)에는 별도 계산이 필요합니다.' };
  }
  if (!Number.isFinite(k) || k <= 0) {
    return { field: 'k', message: '보온재 열전도율 k는 0보다 큰 값을 입력해야 합니다.' };
  }
  if (!Number.isFinite(ho) || ho <= 0) {
    return { field: 'ho', message: '표면 열전달률 hₒ는 0보다 큰 값을 입력해야 합니다.' };
  }
  if (!Number.isFinite(SF) || SF <= 0) {
    return { field: 'safetyFactor', message: '안전계수는 0보다 큰 값을 입력해야 합니다.' };
  }
  return null;
}

// ── 전체 계산 흐름 (사양서 §8) ─────────────────────────────

export interface InsulationOutputs {
  Td: number;             // 노점 (°C)
  d_mm: number;           // 한계 두께 (mm)
  d_safe_mm: number;      // 안전 두께 (mm)
  d_recommended_mm: number | null;  // 추천 시판 두께 (mm). null이면 50초과
  Ts: number | null;      // 시공 후 표면 온도 (°C)
  margin: number | null;  // 여유 폭 Ts - Td (°C)
  grade: Grade;
  warnings: string[];
}

export function calculate(inputs: InsulationInputs): InsulationOutputs | null {
  const err = validate(inputs);
  if (err) return null;

  const pipe = PIPE_OD_TABLE[inputs.pipeIdx];
  const mat  = INSULATION_MATERIALS[inputs.matIdx];
  if (!pipe || !mat) return null;

  const Ti = parseFloat(inputs.Ti);
  const Ta = parseFloat(inputs.Ta);
  const RH = parseFloat(inputs.RH);
  const ho = parseFloat(inputs.ho);
  const SF = parseFloat(inputs.safetyFactor);
  const k  = mat.id === 'custom' ? parseFloat(inputs.customK) : (mat.k as number);
  const D  = pipe.od_m;

  const Td = dewPoint(Ta, RH);

  const warnings: string[] = [];
  if (mat.warning) warnings.push(`보온재 경고 — ${mat.warning}`);

  // 예외 흐름 — 노점이 외기와 거의 같음 (RH가 100에 근접)
  if (Ta - Td < 0.1) {
    return {
      Td, d_mm: Infinity, d_safe_mm: Infinity, d_recommended_mm: null,
      Ts: null, margin: null, grade: '위험',
      warnings: [...warnings, '외기가 거의 포화 상태 — 결로 회피 어려움. 환경 제어(제습) 검토 필요'],
    };
  }

  // 예외 흐름 — 노점이 관 내부 온도보다 낮음 (보온 불필요)
  if (Td <= Ti) {
    return {
      Td, d_mm: 0, d_safe_mm: 0, d_recommended_mm: 13,
      Ts: Ta, margin: Ta - Td, grade: grading(Ta - Td),
      warnings: [...warnings, '현재 조건에서 보온 불필요 — 관 표면이 이미 노점 위. 안전상 최소 13 mm 권장'],
    };
  }

  const d_m = criticalThickness({ D, Ti, Ta, Td, k, ho });
  const d_mm = d_m * 1000;
  const d_safe_mm = d_mm * SF;

  if (d_safe_mm > 50) {
    warnings.push('시판 단일 두께 초과 — 다층 시공 또는 특수 보온재 검토 필요');
    return {
      Td, d_mm, d_safe_mm, d_recommended_mm: null,
      Ts: null, margin: null, grade: '초과', warnings,
    };
  }

  const d_rec_mm = selectCommercialThickness(d_safe_mm);
  if (d_rec_mm == null) {
    return {
      Td, d_mm, d_safe_mm, d_recommended_mm: null,
      Ts: null, margin: null, grade: '초과', warnings,
    };
  }

  const { Ts } = verifyInstalled({ D, d_rec_m: d_rec_mm / 1000, Ti, Ta, k, ho });
  const margin = Ts - Td;

  return {
    Td, d_mm, d_safe_mm, d_recommended_mm: d_rec_mm,
    Ts, margin, grade: grading(margin), warnings,
  };
}
