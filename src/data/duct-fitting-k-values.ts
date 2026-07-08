// 덕트 부속류 국부손실계수 ζ (단일 상수 방식)
//
// 출처: 사용자 제공 설비 편람 '제4편 설비일반 — 제16장 덕트설계'
//       표 10 국부손실계수 (No.1~53) · 표 11 평행익 댐퍼의 마찰계수
//
// 적용 공식: ΔPr = ζ × (v²/2) × ρ   [Pa]
//   v: 국부 상류측의 풍속 (합류부는 합류 후 속도 기준 — 표 원문 정의)
//   → friction-network의 ΔP부차 = ΣK·ρV²/2 와 동일 형식 (구간 유속 V 적용)
//
// 조건 의존 항목(분기 유속비, 확대각 등)은 실무 대표 조건의 값을 채택하고
// note에 표 번호·조건을 명시 — 조건이 다르면 ΣK 직접 입력으로 보정.
//
// 판독: 스캔 원본 300~600dpi 확대 판독 + 독립 재판독 교차 검증 (2026-07)

import { FITTING_K_VALUES, type FittingKValue } from './fitting-k-values';

export const DUCT_FITTING_K_VALUES: FittingKValue[] = [
  // ── 원형 덕트 벤드 ──
  {
    id: 'duct-elbow-round-r05',
    nameKo: '원형 원호벤드 90° (R/D=0.5)',
    nameEn: 'Round smooth elbow 90° (R/D=0.5)',
    K: 0.90,
    note: '표 10 No.1',
  },
  {
    id: 'duct-elbow-round-r10',
    nameKo: '원형 원호벤드 90° (R/D=1.0)',
    nameEn: 'Round smooth elbow 90° (R/D=1.0)',
    K: 0.33,
    note: '표 10 No.1',
  },
  {
    id: 'duct-elbow-round-r15',
    nameKo: '원형 원호벤드 90° (R/D=1.5)',
    nameEn: 'Round smooth elbow 90° (R/D=1.5)',
    K: 0.24,
    note: '표 10 No.1',
  },
  {
    id: 'duct-elbow-round-r20',
    nameKo: '원형 원호벤드 90° (R/D=2.0)',
    nameEn: 'Round smooth elbow 90° (R/D=2.0)',
    K: 0.19,
    note: '표 10 No.1',
  },
  {
    id: 'duct-miter-round',
    nameKo: '원형 직각벤드 (마이터 90°)',
    nameEn: 'Round mitered elbow 90°',
    K: 1.30,
    note: '표 10 No.2',
  },
  {
    id: 'duct-gore4-round-r15',
    nameKo: '원형 마디이음 90° (4피이스, R/D=1.5)',
    nameEn: 'Round gored elbow 90° (4-piece, R/D=1.5)',
    K: 0.28,
    note: '표 10 No.4',
  },
  // ── 장방형 덕트 벤드 (H/W=1.0 기준) ──
  {
    id: 'duct-elbow-rect-r05',
    nameKo: '장방형 원호벤드 90° (R/W=0.5, H/W=1)',
    nameEn: 'Rectangular smooth elbow 90° (R/W=0.5, H/W=1)',
    K: 1.00,
    note: '표 10 No.6',
  },
  {
    id: 'duct-elbow-rect-r10',
    nameKo: '장방형 원호벤드 90° (R/W=1.0, H/W=1)',
    nameEn: 'Rectangular smooth elbow 90° (R/W=1.0, H/W=1)',
    K: 0.22,
    note: '표 10 No.6',
  },
  {
    id: 'duct-elbow-rect-r15',
    nameKo: '장방형 원호벤드 90° (R/W=1.5, H/W=1)',
    nameEn: 'Rectangular smooth elbow 90° (R/W=1.5, H/W=1)',
    K: 0.09,
    note: '표 10 No.6',
  },
  {
    id: 'duct-miter-rect',
    nameKo: '장방형 직각벤드 (베인 없음, H/W=1)',
    nameEn: 'Rectangular mitered elbow (no vanes, H/W=1)',
    K: 1.50,
    note: '표 10 No.7',
  },
  {
    id: 'duct-miter-rect-small-vane',
    nameKo: '장방형 직각벤드 (소형 베인)',
    nameEn: 'Rectangular mitered elbow (small turning vanes)',
    K: 0.35,
    note: '표 10 No.9',
  },
  {
    id: 'duct-miter-rect-formed-vane',
    nameKo: '장방형 직각벤드 (소형 성형 베인)',
    nameEn: 'Rectangular mitered elbow (small profiled vanes)',
    K: 0.10,
    note: '표 10 No.10',
  },
  // ── 분기 · 합류 (원형 T자관 — 유속비 의존, 대표 조건 채택) ──
  {
    id: 'duct-tee-branch',
    nameKo: 'T자관 분기 — 지관류 (v₃/v₁=0.8)',
    nameEn: 'Tee, diverging — branch flow (v3/v1=0.8)',
    K: 1.54,
    note: '표 10 No.13 — 유속비 따라 1.12~2.16, 대표 0.8 채택',
  },
  {
    id: 'duct-tee-main',
    nameKo: 'T자관 분기 — 직통류 (v₂/v₁=0.8)',
    nameEn: 'Tee, diverging — straight-through (v2/v1=0.8)',
    K: 0.03,
    note: '표 10 No.13',
  },
  {
    id: 'duct-tee-merge-branch',
    nameKo: 'T자관 합류 — 지관류 (A₃/A₁=1, v₃/v₁=1.0)',
    nameEn: 'Tee, converging — branch flow (A3/A1=1, v3/v1=1.0)',
    K: 1.13,
    note: '표 10 No.13 — 합류 후 속도 기준',
  },
  // ── 확대 · 축소 · 변형 ──
  {
    id: 'duct-expand-sudden',
    nameKo: '급확대 (A₂/A₁=2)',
    nameEn: 'Abrupt expansion (A2/A1=2)',
    K: 0.25,
    note: '표 10 No.24',
  },
  {
    id: 'duct-expand-grad',
    nameKo: '점확대 (원형, A₂/A₁=2, θ=20°)',
    nameEn: 'Gradual expansion (round, A2/A1=2, θ=20°)',
    K: 0.10,
    note: '표 10 No.26',
  },
  {
    id: 'duct-contract-grad',
    nameKo: '점축소 (A₂/A₁=0.5, θ=45°)',
    nameEn: 'Gradual contraction (A2/A1=0.5, θ=45°)',
    K: 0.16,
    note: '표 10 No.27',
  },
  {
    id: 'duct-transition',
    nameKo: '변형 (트랜지션, θ<14°)',
    nameEn: 'Transition (θ<14°)',
    K: 0.15,
    note: '표 10 No.28',
  },
  // ── 입구 · 출구 · 댐퍼 ──
  {
    id: 'duct-exit',
    nameKo: '관출구 (개방단)',
    nameEn: 'Duct exit (open end)',
    K: 1.0,
    note: '표 10 No.39',
  },
  {
    id: 'duct-entrance-flush',
    nameKo: '관입구 (벽면 관통형)',
    nameEn: 'Duct entrance (flush with wall)',
    K: 0.5,
    note: '표 10 No.44',
  },
  {
    id: 'duct-entrance-bell',
    nameKo: '관입구 (벨마우스)',
    nameEn: 'Duct entrance (bellmouth)',
    K: 0.03,
    note: '표 10 No.47',
  },
  {
    id: 'duct-damper-parallel-open',
    nameKo: '평행익 댐퍼 (전개 부근, θ=10°, 3매)',
    nameEn: 'Parallel-blade damper (near full open, θ=10°, 3 blades)',
    K: 0.2,
    note: '표 11 — 개도에 따라 급증 (θ=40°: 5, θ=60°: 20)',
  },
];

/** 배관(fitting-k-values)·덕트 카탈로그 통합 조회 — 저장된 fittingId → 정의 */
export function findFittingK(id: string): FittingKValue | undefined {
  return FITTING_K_VALUES.find(f => f.id === id) ?? DUCT_FITTING_K_VALUES.find(f => f.id === id);
}
