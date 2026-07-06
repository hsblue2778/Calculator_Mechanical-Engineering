// 마찰손실 계통 계산기 — 트리 계통 계산 엔진 (순수 함수, UI import 금지)
//
// 공식 출처: 참조 엑셀 '마찰손실 계통 계산기' 구간테이블 시트 (원본 공식 그대로 이식, 재유도 금지)
//   말단여부      : 나를 부모로 갖는 행 없음 · Q = 말단 ? Q_in/60000(LPM) or /3600(CMH) : Σ자식 Q
//   단면          : A 원형 π(D/1000)²/4 · 사각 (a/1000)(b/1000)
//   상당지름      : De(mm) 원형 D · 사각 1.3(ab)^0.625/(a+b)^0.25 (a·b mm)
//   유속          : V = Q/A (실단면 기준 — 사각도 실단면, 마찰은 De 기준: 엑셀 그대로)
//   유속판정      : V>적용최대 '▲유속초과' / V<적용최소 '▼과대관경' / OK · 제안D = √(4Q/(π·V_max적용))·1000
//   Re            : V·(De/1000)/ν · 유동상태: <2300 층류 / ≤4000 ⚠천이 / 난류
//   마찰계수 f    : Re≤0→0 · Re<2300→64/Re · Re≥2300 전부 Swamee-Jain 0.25/(log10(ε/(3.7·De)+5.74/Re^0.9))² (ε·De mm)
//                   ※ pipe-friction frictionFactor()(Colebrook+천이 3차보간)와 다름 — swameeJain()만 재사용
//   ΔP_마찰       : 8fLρQ²/(π²(De/1000)⁵) (Q형 Darcy-Weisbach)
//   ΔP_부차       : ΣK·ρV²/2 · ΔP_구간 = 마찰+부차+기기손실
//   누적ΔP        : ΔP_구간 + 부모 누적(ROOT→0) · 누적+요구압 = 누적 + (말단?P_req:0) · mmAq = Pa/9.80665
//   설계 가용정압 : P_avail×(1−α) — 최대(누적+요구압)와 비교해 여유/부족
//   압축성 경고   : 유체∈{공기,증기} & 누적ΔP > 0.1·P_abs·1e5 → '⚠구간분할 필요'
//
// node 직접 실행 가능(검증 스크립트가 import) — import는 .ts 확장자 명시.

import { swameeJain } from '../pipe-friction/engine.ts';
import {
  fnFluidDef, fnMaterial, FN_PA_PER_MMAQ,
  type FNGrade, type FNSystemType, type FNCondition,
  type FNMaterialId, type FNVelocityLimits,
} from '../../data/frictionNetworkRef.ts';
import { fnFluidProps, type FNFluidState } from './fluids.ts';

export type FNShape = 'circle' | 'rect';
export type FNFlowUnit = 'LPM' | 'CMH';

export interface FNSettings extends FNFluidState {
  systemType: FNSystemType;
  pAvail_Pa: number;           // 가용정압 P_avail
  alpha: number;               // 여유율 α (0~1) — 설계 가용정압 = P_avail×(1−α)
  vLimits: FNVelocityLimits;   // 적용 계통(덕트/배관)의 등급별 목표 유속 (수정 가능)
  flowUnit: FNFlowUnit;        // 말단유량 단위
}

export interface FNSegmentInput {
  id: string;
  parentId: string;            // 'ROOT' 또는 위 행의 기존 ID
  grade: FNGrade;
  shape: FNShape;
  D_mm: number;                // 원형 전용 (사각이면 무시)
  a_mm: number;                // 사각 전용
  b_mm: number;                // 사각 전용
  L_m: number;
  sumK: number;                // ΣK 직접입력
  equipLoss_Pa: number;        // 기기손실 직접입력
  materialId: FNMaterialId;
  condition: FNCondition;
  terminalFlow: number;        // 말단유량 (flowUnit 단위) — 말단 행만 사용, 비말단은 무시
  pReq_Pa: number;             // 말단 요구압 — 말단 행만 가산
}

export type FNVerdict = 'ok' | 'high' | 'low';
export type FNRegime = 'laminar' | 'transition' | 'turbulent';

export interface FNSegmentResult {
  id: string;
  error: string | null;        // 행 에러 메시지 — 있으면 계산 제외
  isLeaf: boolean;
  Q_m3s: number;
  A_m2: number;
  De_mm: number;
  V_ms: number;
  verdict: FNVerdict;          // ok / high(▲유속초과) / low(▼과대관경)
  suggestedD_mm: number;       // √(4Q/(π·V_max적용))·1000
  eps_mm: number;
  Re: number;
  regime: FNRegime;
  f: number;
  dpFriction_Pa: number;
  dpMinor_Pa: number;
  dpEquip_Pa: number;
  dpSegment_Pa: number;
  cum_Pa: number;              // 누적ΔP
  cumPlusReq_Pa: number;       // 누적 + (말단?P_req:0)
  cum_mmAq: number;            // 누적ΔP / 9.80665
  compressWarn: boolean;       // ⚠구간분할 필요
}

export interface FNNetworkResult {
  rows: FNSegmentResult[];
  rho_kgm3: number;
  nu_m2s: number;
  tempClamped: boolean;
  designAvail_Pa: number;      // P_avail×(1−α)
  worstId: string | null;      // 최대 (누적+요구압) 구간
  worstDemand_Pa: number;      // 그 값 (유효 행 없으면 0)
  margin_Pa: number;           // designAvail − worstDemand (여유 + / 부족 −)
  hasErrors: boolean;
}

export const VERDICT_LABELS: Record<FNVerdict, string> = {
  ok: 'OK', high: '▲유속초과', low: '▼과대관경',
};
export const REGIME_LABELS: Record<FNRegime, string> = {
  laminar: '층류', transition: '⚠천이', turbulent: '난류',
};

const pos = (v: number) => Number.isFinite(v) && v > 0;
const nonNeg = (v: number) => Number.isFinite(v) && v >= 0;

function emptyRow(id: string, error: string | null, isLeaf: boolean): FNSegmentResult {
  return {
    id, error, isLeaf,
    Q_m3s: NaN, A_m2: NaN, De_mm: NaN, V_ms: NaN,
    verdict: 'ok', suggestedD_mm: NaN, eps_mm: NaN, Re: NaN,
    regime: 'laminar', f: NaN,
    dpFriction_Pa: NaN, dpMinor_Pa: NaN, dpEquip_Pa: NaN, dpSegment_Pa: NaN,
    cum_Pa: NaN, cumPlusReq_Pa: NaN, cum_mmAq: NaN, compressWarn: false,
  };
}

/** 설정 검증 — 에러 메시지 또는 null */
export function validateSettings(s: FNSettings): string | null {
  if (fnFluidProps(s) === null) {
    return s.fluid === 'custom'
      ? '직접입력 유체의 ρ·ν는 0보다 큰 값을 입력해야 합니다.'
      : '유체 온도·절대압 입력을 확인하세요 (절대압은 0보다 커야 합니다).';
  }
  if (!nonNeg(s.pAvail_Pa)) return '가용정압 P_avail은 0 이상의 값을 입력해야 합니다.';
  if (!Number.isFinite(s.alpha) || s.alpha < 0 || s.alpha >= 1) return '여유율 α는 0 이상 1 미만이어야 합니다.';
  for (const g of ['main', 'sub', 'branch'] as FNGrade[]) {
    const r = s.vLimits[g];
    if (!pos(r.min) || !pos(r.max) || r.min >= r.max) return '목표 유속범위는 0 < 최소 < 최대여야 합니다.';
  }
  return null;
}

// 행 입력 검증 (구조 검증 제외) — 첫 위반 필드 메시지 반환
function validateRowValues(seg: FNSegmentInput, isLeaf: boolean): string | null {
  if (seg.shape === 'circle') {
    if (!pos(seg.D_mm)) return '❌관경 D 오류 (0·음수·빈값)';
  } else {
    if (!pos(seg.a_mm) || !pos(seg.b_mm)) return '❌덕트 a×b 오류 (0·음수·빈값)';
  }
  if (!pos(seg.L_m)) return '❌길이 L 오류 (0·음수·빈값)';
  if (!nonNeg(seg.sumK)) return '❌ΣK 오류 (음수·빈값)';
  if (!nonNeg(seg.equipLoss_Pa)) return '❌기기손실 오류 (음수·빈값)';
  if (isLeaf) {
    if (!pos(seg.terminalFlow)) return '❌말단유량 오류 (0·음수·빈값)';
    if (!nonNeg(seg.pReq_Pa)) return '❌요구압 오류 (음수·빈값)';
  }
  return null;
}

/**
 * 계통 전체 계산 — 3패스.
 * ① 위→아래 구조·값 검증  ② 아래→위 Q 합산  ③ 위→아래 수리 계산 + 누적.
 * 에러 행은 계산 제외, 그 행에 의존하는 상·하류 행도 제외(누적·합산 불가).
 */
export function computeNetwork(settings: FNSettings, segments: FNSegmentInput[]): FNNetworkResult | null {
  if (validateSettings(settings)) return null;
  const props = fnFluidProps(settings)!;
  const { rho_kgm3: rho, nu_m2s: nu } = props;
  const compressibleFluid = fnFluidDef(settings.fluid).compressible;
  const compressLimit_Pa = 0.1 * settings.pressAbs_bar * 1e5;

  const n = segments.length;
  const results: FNSegmentResult[] = new Array(n);
  const errors: (string | null)[] = new Array(n).fill(null);

  // 말단여부 = 나를 부모로 갖는 행 없음 (전 행 기준)
  const isLeafArr = segments.map(seg =>
    seg.id.trim() !== '' && !segments.some(o => o !== seg && o.parentId.trim() === seg.id.trim()));

  // ── ① 위→아래 검증 ──
  const idIndex = new Map<string, number>();      // 확정된 ID → 행 index
  segments.forEach((seg, i) => {
    const id = seg.id.trim();
    if (id === '' || id.toUpperCase() === 'ROOT') { errors[i] = '❌구간 ID 오류 (빈값·ROOT 불가)'; return; }
    if (idIndex.has(id)) { errors[i] = '❌중복 ID'; return; }
    idIndex.set(id, i);

    const pid = seg.parentId.trim();
    if (pid.toUpperCase() !== 'ROOT') {
      const pi = segments.findIndex(o => o.id.trim() === pid);
      if (pi === -1) { errors[i] = '❌부모ID 없음'; return; }
      if (pi >= i) { errors[i] = '❌부모가 같은/아래 행'; return; }
    }
    errors[i] = validateRowValues(seg, isLeafArr[i]);
  });

  // ── ② 아래→위 Q 합산 (자식이 항상 부모보다 아래 행 — 역순 1패스로 확정) ──
  const Q = new Array<number>(n).fill(NaN);
  const flowDiv = settings.flowUnit === 'LPM' ? 60000 : 3600;   // LPM→m³/s ÷60000 · CMH ÷3600
  for (let i = n - 1; i >= 0; i--) {
    if (errors[i]) continue;
    const seg = segments[i];
    if (isLeafArr[i]) {
      Q[i] = seg.terminalFlow / flowDiv;
    } else {
      let sum = 0;
      for (let j = i + 1; j < n; j++) {
        if (segments[j].parentId.trim() !== seg.id.trim()) continue;
        if (errors[j] || !Number.isFinite(Q[j])) { errors[i] = '❌하위 구간 에러 — 계산 제외'; break; }
        sum += Q[j];
      }
      if (!errors[i]) Q[i] = sum;
    }
  }

  // ── ③ 위→아래 수리 계산 + 누적 ──
  const cumById = new Map<string, number>();
  segments.forEach((seg, i) => {
    const isLeaf = isLeafArr[i];
    if (errors[i]) { results[i] = emptyRow(seg.id, errors[i], isLeaf); return; }

    const pid = seg.parentId.trim();
    const parentCum = pid.toUpperCase() === 'ROOT' ? 0 : cumById.get(pid);
    if (parentCum === undefined) { results[i] = emptyRow(seg.id, '❌상위 구간 에러 — 계산 제외', isLeaf); return; }

    // 단면적 A (실단면) · 상당지름 De
    const A = seg.shape === 'circle'
      ? Math.PI * Math.pow(seg.D_mm / 1000, 2) / 4
      : (seg.a_mm / 1000) * (seg.b_mm / 1000);
    const De_mm = seg.shape === 'circle'
      ? seg.D_mm
      : 1.3 * Math.pow(seg.a_mm * seg.b_mm, 0.625) / Math.pow(seg.a_mm + seg.b_mm, 0.25);

    const q = Q[i];
    const V = q / A;

    // 유속 판정 + 제안D (적용 등급의 V_max 기준)
    const lim = settings.vLimits[seg.grade];
    const verdict: FNVerdict = V > lim.max ? 'high' : V < lim.min ? 'low' : 'ok';
    const suggestedD_mm = Math.sqrt(4 * q / (Math.PI * lim.max)) * 1000;

    const eps_mm = fnMaterial(seg.materialId).eps_mm[seg.condition];
    const Re = V * (De_mm / 1000) / nu;
    const regime: FNRegime = Re < 2300 ? 'laminar' : Re <= 4000 ? 'transition' : 'turbulent';

    // f: Re≤0→0 · 층류 64/Re · Re≥2300 전부 Swamee-Jain (엑셀 방식 — Colebrook 미사용)
    const f = Re <= 0 ? 0 : Re < 2300 ? 64 / Re : swameeJain(Re, eps_mm / De_mm);

    const De_m = De_mm / 1000;
    const dpFriction = 8 * f * seg.L_m * rho * q * q / (Math.PI * Math.PI * Math.pow(De_m, 5));
    const dpMinor = seg.sumK * rho * V * V / 2;
    const dpSegment = dpFriction + dpMinor + seg.equipLoss_Pa;
    const cum = dpSegment + parentCum;
    cumById.set(seg.id.trim(), cum);

    results[i] = {
      id: seg.id, error: null, isLeaf,
      Q_m3s: q, A_m2: A, De_mm, V_ms: V,
      verdict, suggestedD_mm, eps_mm, Re, regime, f,
      dpFriction_Pa: dpFriction, dpMinor_Pa: dpMinor, dpEquip_Pa: seg.equipLoss_Pa,
      dpSegment_Pa: dpSegment,
      cum_Pa: cum,
      cumPlusReq_Pa: cum + (isLeaf ? seg.pReq_Pa : 0),
      cum_mmAq: cum / FN_PA_PER_MMAQ,
      compressWarn: compressibleFluid && cum > compressLimit_Pa,
    };
  });

  // ── 판정 요약: 최대 (누적+요구압) vs 설계 가용정압 ──
  const designAvail = settings.pAvail_Pa * (1 - settings.alpha);
  let worstId: string | null = null;
  let worstDemand = 0;
  for (const r of results) {
    if (r.error) continue;
    if (worstId === null || r.cumPlusReq_Pa > worstDemand) { worstId = r.id; worstDemand = r.cumPlusReq_Pa; }
  }

  return {
    rows: results,
    rho_kgm3: rho, nu_m2s: nu, tempClamped: props.tempClamped,
    designAvail_Pa: designAvail,
    worstId, worstDemand_Pa: worstDemand,
    margin_Pa: designAvail - worstDemand,
    hasErrors: results.some(r => r.error !== null),
  };
}
