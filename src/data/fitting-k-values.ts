// 관 부속류 K값 (국소 저항 계수) — 단일 상수 방식
//
// 출처: Perry's Chemical Engineers' Handbook 8th Ed (2008)
//       Midoux 1993 재게재 — myengineeringtools.com
// https://myengineeringtools.com/Piping/Pressure_Drop_Key_Piping_Elements_K_Coefficient.html
//
// 보조 출처: Neutrium - Pressure Loss from Fittings (Excess Head K Method)
// https://neutrium.net/articles/fluid-flow/pressure-loss-from-fittings-excess-head-k-method/
//
// 적용 공식: h_K = K × V² / (2 × g)   [m]
//   단, V: 해당 관경의 평균 유속 (m/s), g: 9.81 m/s²
//
// 유효 범위: 난류 (Re > 4,000) 기준 단일 K 상수
// 주의: 이 데이터셋은 Perry's 단일 K 표 기준 — Crane K = N × fT 방식 아님
//
// 누락 항목 (Perry's 표에 없거나 데이터 미확정 — Phase 1.x에서 추가 예정):
//   lift check valve, tee (직진/분기), entrance/exit, reducer

export interface FittingKValue {
  id: string;
  nameKo: string;
  nameEn: string;
  K: number;
  note: string;
}

// K값 테이블 — 부속 셀렉트에 노출되는 10개 항목
// 출처: Perry's Chemical Engineers' Handbook 8th Ed (2008) via myengineeringtools.com
// https://myengineeringtools.com/Piping/Pressure_Drop_Key_Piping_Elements_K_Coefficient.html
export const FITTING_K_VALUES: FittingKValue[] = [
  {
    id: 'elbow-90-standard',
    nameKo: '90° 엘보 (Standard, R/D=1)',
    nameEn: '90° Elbow Standard (R/D=1)',
    K: 0.75,
    note: "Perry's 8th Ed — turbulent K",
  },
  {
    id: 'elbow-90-longradius',
    nameKo: '90° 엘보 (Long Radius, R/D=1.5)',
    nameEn: '90° Elbow Long Radius (R/D=1.5)',
    K: 0.45,
    note: "Perry's 8th Ed — turbulent K",
  },
  {
    id: 'elbow-45-standard',
    nameKo: '45° 엘보 (Standard)',
    nameEn: '45° Elbow Standard',
    K: 0.35,
    note: "Perry's 8th Ed — turbulent K",
  },
  {
    id: 'elbow-45-longradius',
    nameKo: '45° 엘보 (Long Radius)',
    nameEn: '45° Elbow Long Radius',
    K: 0.20,
    note: "Perry's 8th Ed — turbulent K",
  },
  {
    id: 'gate-valve-open',
    nameKo: '게이트밸브 (전개)',
    nameEn: 'Gate Valve (fully open)',
    K: 0.17,
    note: "Perry's 8th Ed — turbulent K",
  },
  {
    id: 'globe-valve-open',
    nameKo: '글로브밸브 (전개)',
    nameEn: 'Globe Valve (fully open)',
    K: 9.0,
    note: "Perry's 8th Ed — turbulent K",
  },
  {
    id: 'ball-valve-open',
    nameKo: '볼밸브 (전개)',
    nameEn: 'Ball Valve (fully open)',
    K: 0.05,
    note: "Perry's 8th Ed — turbulent K",
  },
  {
    id: 'butterfly-valve-open',
    nameKo: '버터플라이밸브 (전개)',
    nameEn: 'Butterfly Valve (fully open)',
    K: 0.05,
    note: "Perry's 8th Ed — turbulent K",
  },
  {
    id: 'swing-check-valve',
    nameKo: '스윙체크밸브',
    nameEn: 'Swing Check Valve',
    K: 2.0,
    note: "Perry's 8th Ed — turbulent K",
  },
  {
    id: 'coupling-union',
    nameKo: '커플링 / 유니온',
    nameEn: 'Coupling / Union',
    K: 0.04,
    note: "Perry's 8th Ed — turbulent K",
  },
];

/**
 * id로 K값 항목 조회
 */
export function getFittingById(id: string): FittingKValue | undefined {
  return FITTING_K_VALUES.find(f => f.id === id);
}

/**
 * 부속 국소 손실 수두 계산
 * h_K = K × V² / (2 × g)   [m]
 *
 * 출처: Perry's Chemical Engineers' Handbook 8th Ed (2008)
 * https://myengineeringtools.com/Piping/Pressure_Drop_Key_Piping_Elements_K_Coefficient.html
 *
 * @param K 국소저항계수 (무차원)
 * @param V_ms 유속 (m/s)
 * @returns 손실 수두 (m)
 */
export function calcFittingLoss_m(K: number, V_ms: number): number {
  const G = 9.81; // m/s²
  return K * V_ms * V_ms / (2 * G);
}
