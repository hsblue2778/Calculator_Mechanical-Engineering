// 관경 계산기 순수 함수 — 정통 Darcy-Weisbach 단일 (재질별 고정 f)
// 공식 출처: 일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p
//   hf/L = 8 × f × Q² / (π² × g × D⁵)   [m/m]
//   × 1000 → mmAq/m  (1 m 수두 = 1000 mmAq 근사, 정확값 1000.34 대비 오차 0.034%)

import type { PipeMaterialSize, PipeSpec } from '../../data/pipeSizes';

// 중력가속도 [m/s²] — pipe-friction/calc.ts의 G 상수와 동일
const G = 9.81;

// 정통 Darcy-Weisbach (재질별 고정 f)
//   hf/L [mmAq/m] = 8 × f × Q_m3s² / (π² × g × D_m⁵) × 1000
// 출처: 일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p
export function frictionLoss(
  Q_lpm: number,
  material: PipeMaterialSize,
  ID_mm: number,
): number {
  if (Q_lpm <= 0 || ID_mm <= 0) return NaN;
  const f = material.frictionFactor;
  const Q_m3s = Q_lpm / 60000;
  const D_m = ID_mm / 1000;
  const hf_per_L_m = 8 * f * Q_m3s * Q_m3s / (Math.PI * Math.PI * G * Math.pow(D_m, 5));
  return hf_per_L_m * 1000; // m/m → mmAq/m
}

// 유속 (m/s) — v = (Q/60000) / (π·(ID/1000)²/4)
export function velocity(Q_lpm: number, ID_mm: number): number {
  if (Q_lpm <= 0 || ID_mm <= 0) return NaN;
  const Q_m3s = Q_lpm / 60000;
  const A = Math.PI * Math.pow(ID_mm / 1000, 2) / 4;
  return Q_m3s / A;
}

export interface SizingRow {
  size: PipeSpec;
  dropPerM_mmAqPerM: number;
  v_ms: number;
  ok: boolean; // 허용 압력강하 이하
}

// 전체 관경별 결과
export function sizingTable(
  Q_lpm: number,
  allowableDrop_mmAqPerM: number,
  material: PipeMaterialSize,
): SizingRow[] {
  return material.sizes.map(size => {
    const drop = frictionLoss(Q_lpm, material, size.id_mm);
    const v = velocity(Q_lpm, size.id_mm);
    return {
      size,
      dropPerM_mmAqPerM: drop,
      v_ms: v,
      ok: Number.isFinite(drop) && drop <= allowableDrop_mmAqPerM,
    };
  });
}

// 허용 압력강하 이하가 되는 가장 작은 관경 선정
export function selectPipeSize(
  Q_lpm: number,
  allowableDrop_mmAqPerM: number,
  material: PipeMaterialSize,
): SizingRow | null {
  if (Q_lpm <= 0) return null;
  const rows = sizingTable(Q_lpm, allowableDrop_mmAqPerM, material);
  return rows.find(r => r.ok) ?? null;
}

// 유속 권장 범위 (m/s) — 엑셀 주석의 일반 가이드 1.5 ~ 2.0 m/s
export const VELOCITY_RECOMMENDED_MIN = 1.5;
export const VELOCITY_RECOMMENDED_MAX = 2.0;

export function velocityStatus(v: number): 'ok' | 'low' | 'high' {
  if (!Number.isFinite(v)) return 'low';
  if (v < VELOCITY_RECOMMENDED_MIN) return 'low';
  if (v > VELOCITY_RECOMMENDED_MAX) return 'high';
  return 'ok';
}

// 입력값 검증 — 0·음수·NaN 입력 시 에러 메시지 반환
export interface SizingInputError {
  field: 'Q' | 'dP';
  message: string;
}

export function validateSizingInput(
  Q_lpm: number,
  allowableDrop_mmAqPerM: number,
): SizingInputError | null {
  if (!Number.isFinite(Q_lpm) || Q_lpm <= 0) {
    return { field: 'Q', message: '유량 Q는 0보다 큰 값을 입력해야 합니다.' };
  }
  if (!Number.isFinite(allowableDrop_mmAqPerM) || allowableDrop_mmAqPerM <= 0) {
    return { field: 'dP', message: '허용 압력강하 ΔP/L은 0보다 큰 값을 입력해야 합니다.' };
  }
  return null;
}
