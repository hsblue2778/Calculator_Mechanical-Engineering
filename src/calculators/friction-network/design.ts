// 마찰손실 계통 계산기 — 관경 자동 설계 제안 (순수 함수, UI import 금지)
//
// 제안De 이원 기준 (둘 중 큰 쪽 = 보수 채택):
//   ① 목표 유속: dVel = √(4Q/(π·V_max적용))·1000  — 참조 엑셀 제안D 공식 그대로 (calc.ts와 동일)
//   ② 목표 마찰률: 8·f(De)·ρ·Q²/(π²·De⁵) = R 을 De에 대해 고정점 반복 역산 (등압법/Equal Friction)
//      De ← [8fρQ²/(π²R)]^0.2 · Re = 4Q/(π·De·ν) · f는 계통 계산과 동일 규칙(층류 64/Re · Re≥2300 S-J)
// 규격 스냅:
//   배관: KS 호칭경(pipeSizes.ts 재사용) — 내경 ≥ 제안De 인 최소 호칭. 주철관은 치수표 부재로 스냅 제외
//   덕트: 50mm 단위 올림
// R·스냅은 제안 표시 전용 — 손실 계산에는 사용하지 않음 (엑셀 공식 무변경).
//
// node 직접 실행 가능(검증 스크립트가 import) — import는 .ts 확장자 명시.

import { swameeJain } from '../pipe-friction/engine.ts';
import { fnMaterial, type FNGrade, type FNMaterialId, type FNVelocityLimits } from '../../data/frictionNetworkRef.ts';
import { PIPE_SIZE_MATERIALS } from '../../data/pipeSizes.ts';

export interface FNSuggestInput {
  Q_m3s: number;
  grade: FNGrade;
  vLimits: FNVelocityLimits;
  targetR_Pa_per_m: number;    // ≤0·NaN → R 기준 생략 (유속 기준만)
  rho_kgm3: number;
  nu_m2s: number;
  eps_mm: number;
  materialId: FNMaterialId;
}

export interface FNSuggestion {
  dVel_mm: number;             // 유속 기준 (엑셀 제안D와 동일)
  dR_mm: number | null;        // 마찰률 R 기준 (미수렴·R 미입력 시 null)
  suggest_mm: number;          // max(dVel, dR) — 보수 채택
  snapLabel: string | null;    // '50A (ID 53.2)' · '350 mm' · null(스냅 없음/규격 초과)
}

// 마찰률 R(Pa/m) → De(m) 고정점 반복. 미수렴 시 null (이론상 도달 어려움 — 방어용)
function solveDeFromR(Q: number, R: number, rho: number, nu: number, eps_mm: number): number | null {
  let f = 0.02;                                   // 초기 추정
  let De = Math.pow(8 * f * rho * Q * Q / (Math.PI * Math.PI * R), 0.2);
  for (let i = 0; i < 50; i++) {
    const Re = 4 * Q / (Math.PI * De * nu);
    f = Re <= 0 ? 0 : Re < 2300 ? 64 / Re : swameeJain(Re, eps_mm / (De * 1000));
    if (f <= 0) return null;
    const next = Math.pow(8 * f * rho * Q * Q / (Math.PI * Math.PI * R), 0.2);
    const done = Math.abs(next - De) < 1e-9;
    De = next;
    if (done) return De;
  }
  return De;                                       // 50회 후에도 실질 수렴 (단조 수축)
}

// KS 호칭경 스냅 매핑 — friction-network 재질 → pipeSizes.ts PIPE_SIZE_MATERIALS id
const SNAP_PIPE_MAP: Partial<Record<FNMaterialId, string>> = {
  steel: 'sgp', sts: 'sts10s', copper: 'copper', pvc: 'pvc-cpvc',
  // 'cast-iron': 치수표 부재 — 스냅 제외
};

/** 규격 스냅 — 배관 KS 호칭경 올림 · 덕트 50mm 단위 올림 · 주철관/범위초과 null */
export function fnSnapStandard(suggest_mm: number, materialId: FNMaterialId): string | null {
  if (!Number.isFinite(suggest_mm) || suggest_mm <= 0) return null;
  const kind = fnMaterial(materialId).kind;
  if (kind === 'duct') {
    // 덕트: 50mm 단위 올림 (경계값 부동소수 방어)
    return `${Math.ceil((suggest_mm - 1e-9) / 50) * 50} mm`;
  }
  const sizingId = SNAP_PIPE_MAP[materialId];
  if (!sizingId) return null;                      // 주철관 등 — 스냅 없음
  const mat = PIPE_SIZE_MATERIALS.find(m => m.id === sizingId);
  if (!mat) return null;
  const size = mat.sizes.find(s => s.id_mm >= suggest_mm);   // 내경 ≥ 제안De 최소 호칭
  if (!size) return null;                          // 표 범위 초과
  return `${size.nominalA}A (ID ${size.id_mm.toFixed(1)})`;
}

/** 제안De 이원 기준 + 규격 스냅. Q ≤ 0 등 무효 입력 시 null. */
export function fnSuggestDe(input: FNSuggestInput): FNSuggestion | null {
  const { Q_m3s: Q, rho_kgm3: rho, nu_m2s: nu, eps_mm } = input;
  if (!Number.isFinite(Q) || Q <= 0 || !Number.isFinite(rho) || rho <= 0 || !Number.isFinite(nu) || nu <= 0) return null;

  const vMax = input.vLimits[input.grade]?.max;
  if (!Number.isFinite(vMax) || vMax <= 0) return null;
  const dVel_mm = Math.sqrt(4 * Q / (Math.PI * vMax)) * 1000;   // 엑셀 제안D 공식

  let dR_mm: number | null = null;
  const R = input.targetR_Pa_per_m;
  if (Number.isFinite(R) && R > 0) {
    const De = solveDeFromR(Q, R, rho, nu, eps_mm);
    if (De !== null && Number.isFinite(De) && De > 0) dR_mm = De * 1000;
  }

  const suggest_mm = dR_mm !== null ? Math.max(dVel_mm, dR_mm) : dVel_mm;
  return { dVel_mm, dR_mm, suggest_mm, snapLabel: fnSnapStandard(suggest_mm, input.materialId) };
}
