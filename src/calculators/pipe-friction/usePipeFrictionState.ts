// 관마찰손실 — 전체 상태 훅
// 삼각 입력(Q/V/D 2-of-3)의 inputOrder 규칙, ε·C 편집 상태, 구버전 저장 기록 정규화를 담당.

import { useMemo, useState } from 'react';
import {
  computePipeFriction, validatePipeFriction, resolveTriangle,
  type PFInputError, type PipeFrictionInput, type PipeFrictionResult, type TriField,
} from './engine.ts';
import {
  pfFluidMeta, pfKinematicViscosity, pfDensity,
  PF_PRESSURE_DEFAULT_MMHG, PF_PRESSURE_MIN_MMHG, PF_PRESSURE_MAX_MMHG,
  type PFFluid, PF_FLUIDS,
} from '../../data/fluidProperties.ts';
import { pfMaterial, type PFMaterialId, type PipeCondition, PF_MATERIALS } from '../../data/pipeRoughness.ts';
import { convertPFFlowToSI, convertSIToPFFlow, pfFlowUnitDef, type PFFlowUnitKey, PF_FLOW_UNITS } from './pfUnits.ts';
import type { PressureUnitKey } from './units';

export interface PFPreset {
  label: string;
  hint: string;
  fluid: PFFluid;
  tempC: string;
  materialId: PFMaterialId;
  condition: PipeCondition;
  fields: Partial<Record<TriField, string>>;  // 정확히 2개 (Q는 m³/h 기준 문자열, D는 mm)
  L: string;
  expect: string;
}

interface PFState {
  fluid: PFFluid;
  tempC: string;
  pressureMmHg: string;
  materialId: PFMaterialId;
  condition: PipeCondition;
  epsStr: string;
  cStr: string;
  triQ: string;
  triV: string;
  triD: string;
  inputOrder: TriField[];   // [oldest, newest] 최대 2개 — 여기 없는 1개가 자동 산출 대상
  L: string;
  fOverride: string;
  flowUnit: PFFlowUnitKey;
  pressureUnit: PressureUnitKey;
}

const LEGACY_MATERIAL_BY_IDX: PFMaterialId[] = ['steel', 'sts304', 'pvc', 'copper', 'pvdf'];

function defaultState(): PFState {
  const mat = pfMaterial('steel');
  return {
    fluid: 'water', tempC: '20', pressureMmHg: String(PF_PRESSURE_DEFAULT_MMHG),
    materialId: 'steel', condition: 'new',
    epsStr: String(mat.eps_mm.new), cStr: String(mat.hazenC.new),
    triQ: '', triV: '', triD: '', inputOrder: [],
    L: '', fOverride: '',
    flowUnit: 'm3h', pressureUnit: 'kPa',
  };
}

// 저장 기록(initialState) 정규화 — 구버전({inputMode, matIdx, Q, v, ...})·신버전 모두 수용, 절대 throw 금지
export function normalizeInitialState(s?: Record<string, any>): PFState {
  const d = defaultState();
  if (!s || typeof s !== 'object') return d;
  try {
    if ('inputMode' in s || 'matIdx' in s) {
      // 구버전 (고정 f 시절): 물 20°C 신관으로 보정, 입력값만 이관
      const matIdx = Number(s.matIdx);
      const materialId = LEGACY_MATERIAL_BY_IDX[matIdx] ?? 'steel';
      const mat = pfMaterial(materialId);
      const triQ = s.inputMode === 'v' ? '' : String(s.Q ?? '');
      const triV = s.inputMode === 'v' ? String(s.v ?? '') : '';
      const triD = String(s.D ?? '');
      const inputOrder: TriField[] = [];
      if (s.inputMode === 'v') { if (triV) inputOrder.push('V'); } else if (triQ) inputOrder.push('Q');
      if (triD) inputOrder.push('D');
      return {
        ...d,
        materialId,
        epsStr: String(mat.eps_mm.new), cStr: String(mat.hazenC.new),
        triQ, triV, triD, inputOrder,
        L: String(s.L ?? ''),
        fOverride: String(s.fOverride ?? ''),
        flowUnit: PF_FLOW_UNITS.some(u => u.key === s.flowUnit) ? s.flowUnit : 'm3h',
        pressureUnit: s.pressureUnit ?? 'kPa',
      };
    }
    // 신버전
    const fluid: PFFluid = PF_FLUIDS.some(f => f.key === s.fluid) ? s.fluid : d.fluid;
    const materialId: PFMaterialId = PF_MATERIALS.some(m => m.id === s.materialId) ? s.materialId : d.materialId;
    const condition: PipeCondition = s.condition === 'old' ? 'old' : 'new';
    const mat = pfMaterial(materialId);
    const triQ = String(s.Q ?? ''), triV = String(s.V ?? ''), triD = String(s.D ?? '');
    const byField: Record<TriField, string> = { Q: triQ, V: triV, D: triD };
    const rawOrder: TriField[] = Array.isArray(s.inputOrder)
      ? s.inputOrder.filter((f: any): f is TriField => f === 'Q' || f === 'V' || f === 'D')
      : [];
    const inputOrder = [...new Set(rawOrder)].filter(f => byField[f].trim() !== '').slice(-2);
    return {
      fluid,
      tempC: String(s.tempC ?? d.tempC),
      pressureMmHg: String(s.pressureMmHg ?? d.pressureMmHg),
      materialId, condition,
      epsStr: String(s.eps ?? mat.eps_mm[condition]),
      cStr: String(s.hazenC ?? mat.hazenC[condition]),
      triQ, triV, triD, inputOrder,
      L: String(s.L ?? ''),
      fOverride: String(s.fOverride ?? ''),
      flowUnit: PF_FLOW_UNITS.some(u => u.key === s.flowUnit) ? s.flowUnit : d.flowUnit,
      pressureUnit: s.pressureUnit ?? d.pressureUnit,
    };
  } catch {
    return d;
  }
}

function formatFlow(n: number): string {
  if (!Number.isFinite(n)) return '';
  if (n >= 100) return n.toFixed(1);
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(3);
}

export function usePipeFrictionState(initialState?: Record<string, any>) {
  const [st, setSt] = useState<PFState>(() => normalizeInitialState(initialState));
  const patch = (p: Partial<PFState>) => setSt(prev => ({ ...prev, ...p }));

  const fluidMeta = pfFluidMeta(st.fluid);
  const mat = pfMaterial(st.materialId);
  const epsDefault = String(mat.eps_mm[st.condition]);
  const cDefault = String(mat.hazenC[st.condition]);

  // ── 삼각 입력 ──
  const triStr: Record<TriField, string> = { Q: st.triQ, V: st.triV, D: st.triD };
  const derivedField: TriField | null = st.inputOrder.length === 2
    ? (['Q', 'V', 'D'] as TriField[]).find(f => !st.inputOrder.includes(f))!
    : null;

  function editTri(field: TriField, raw: string) {
    const key = field === 'Q' ? 'triQ' : field === 'V' ? 'triV' : 'triD';
    setSt(prev => ({
      ...prev,
      [key]: raw,
      inputOrder: raw.trim() === ''
        ? prev.inputOrder.filter(f => f !== field)
        : [...prev.inputOrder.filter(f => f !== field), field].slice(-2),
    }));
  }

  // ── 유체 물성 자동 산출 (삼각 입력·L과 무관 — 엑셀 PHASE 0 개념) ──
  const fluidProps = useMemo(() => {
    const isFixed = fluidMeta.mode === 'fixed';
    const t = isFixed ? 20 : parseFloat(st.tempC);
    const p = fluidMeta.hasPressure ? parseFloat(st.pressureMmHg) : PF_PRESSURE_DEFAULT_MMHG;
    if (!isFixed) {
      const lo = fluidMeta.tempMin ?? 0, hi = fluidMeta.tempMax ?? 100;
      if (!Number.isFinite(t) || t < lo || t > hi) return null;
      if (fluidMeta.hasPressure && (!Number.isFinite(p) || p < PF_PRESSURE_MIN_MMHG || p > PF_PRESSURE_MAX_MMHG)) return null;
    }
    return {
      nu: pfKinematicViscosity(st.fluid, t, p),
      rho: pfDensity(st.fluid, t, p),
    };
  }, [st.fluid, st.tempC, st.pressureMmHg, fluidMeta]);

  // ── 삼각 관계 즉시 해석 (L·조도와 무관 — 엑셀 PHASE 1 개념) ──
  const knownSI = useMemo(() => {
    const known: Partial<Record<TriField, number>> = {};
    for (const f of st.inputOrder) {
      if (f === 'Q') known.Q = convertPFFlowToSI(parseFloat(st.triQ), st.flowUnit);
      if (f === 'V') known.V = parseFloat(st.triV);
      if (f === 'D') known.D = parseFloat(st.triD) / 1000;
    }
    return known;
  }, [st.inputOrder, st.triQ, st.triV, st.triD, st.flowUnit]);

  const triResolved = useMemo(() => {
    for (const f of st.inputOrder) {
      const v = knownSI[f];
      if (v === undefined || !Number.isFinite(v) || v <= 0) return null;
    }
    return resolveTriangle(knownSI);
  }, [knownSI, st.inputOrder]);

  // ── 엔진 입력 구성 ──
  const engineInput: PipeFrictionInput = useMemo(() => {
    const known = knownSI;
    return {
      fluid: st.fluid,
      tempC: parseFloat(st.tempC),
      pressureMmHg: fluidMeta.hasPressure ? parseFloat(st.pressureMmHg) : undefined,
      eps_mm: parseFloat(st.epsStr),
      hazenC: parseFloat(st.cStr),
      known,
      L_m: parseFloat(st.L),
      fOverride: st.fOverride.trim() === '' ? undefined : parseFloat(st.fOverride),
    };
  }, [st, fluidMeta.hasPressure, knownSI]);

  const error: PFInputError | null = useMemo(() => validatePipeFriction(engineInput), [engineInput]);
  const res: PipeFrictionResult | null = useMemo(
    () => (error ? null : computePipeFriction(engineInput)),
    [engineInput, error],
  );

  // 파생 필드 표시값 (state에 역기록하지 않음 — 반올림 피드백 루프 차단)
  // L·조도 입력 전에도 삼각 관계(triResolved)만으로 즉시 표시
  const triDisplay: Record<TriField, string> = {
    Q: derivedField === 'Q' ? (triResolved ? formatFlow(convertSIToPFFlow(triResolved.Q_m3s, st.flowUnit)) : '') : st.triQ,
    V: derivedField === 'V' ? (triResolved ? triResolved.V_ms.toFixed(3) : '') : st.triV,
    D: derivedField === 'D' ? (triResolved ? (triResolved.D_m * 1000).toFixed(1) : '') : st.triD,
  };

  // ── 핸들러 ──
  function changeFlowUnit(next: PFFlowUnitKey) {
    if (next === st.flowUnit) return;
    setSt(prev => {
      let triQ = prev.triQ;
      if (prev.inputOrder.includes('Q')) {
        const q = parseFloat(prev.triQ);
        if (Number.isFinite(q) && q > 0) {
          const si = q / pfFlowUnitDef(prev.flowUnit).divisor;
          triQ = formatFlow(si * pfFlowUnitDef(next).divisor);
        }
      }
      return { ...prev, flowUnit: next, triQ };
    });
  }

  function changeMaterial(id: PFMaterialId) {
    const m = pfMaterial(id);
    patch({ materialId: id, epsStr: String(m.eps_mm[st.condition]), cStr: String(m.hazenC[st.condition]) });
  }

  function changeCondition(c: PipeCondition) {
    patch({ condition: c, epsStr: String(mat.eps_mm[c]), cStr: String(mat.hazenC[c]) });
  }

  function reset() {
    setSt(defaultState());
  }

  function loadPreset(p: PFPreset) {
    const m = pfMaterial(p.materialId);
    const order: TriField[] = (['Q', 'V', 'D'] as TriField[]).filter(f => p.fields[f] !== undefined);
    setSt({
      ...defaultState(),
      fluid: p.fluid, tempC: p.tempC,
      materialId: p.materialId, condition: p.condition,
      epsStr: String(m.eps_mm[p.condition]), cStr: String(m.hazenC[p.condition]),
      triQ: p.fields.Q ?? '', triV: p.fields.V ?? '', triD: p.fields.D ?? '',
      inputOrder: order.slice(0, 2),
      L: p.L,
    });
  }

  // 기록 저장용 컨텍스트 — 파생 필드는 산출 표시값 스냅샷으로 저장 (self-describing)
  function saveInputs(): Record<string, any> {
    return {
      fluid: st.fluid, tempC: st.tempC, pressureMmHg: st.pressureMmHg,
      materialId: st.materialId, condition: st.condition,
      eps: st.epsStr, hazenC: st.cStr,
      Q: triDisplay.Q, V: triDisplay.V, D: triDisplay.D,
      inputOrder: st.inputOrder,
      L: st.L, fOverride: st.fOverride,
      flowUnit: st.flowUnit, pressureUnit: st.pressureUnit,
    };
  }

  return {
    st, patch,
    fluidMeta, mat, epsDefault, cDefault, fluidProps,
    triStr, triDisplay, derivedField, editTri,
    engineInput, error, res,
    changeFlowUnit, changeMaterial, changeCondition, reset, loadPreset, saveInputs,
  };
}

export type PipeFrictionController = ReturnType<typeof usePipeFrictionState>;
