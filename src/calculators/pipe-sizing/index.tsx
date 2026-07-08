// 관경 계산기 — 메인 컴포넌트 (계산 + 개요 + 예시)
// 공식: Darcy-Weisbach + 유동 영역별 마찰계수 (pipe-friction 엔진 공용)
//   층류 64/Re · 천이 3차 보간 · 난류 Colebrook-White 반복해 · ε: 재질×신관/노후 (수정 가능)

import { useMemo, useState } from 'react';
import {
  FLOW_UNITS, PRESSURE_UNITS,
  type FlowUnitKey,
  type PressureUnitKey,
} from '../pipe-friction/units';
import { pfKinematicViscosity, pfDensity, pfFluidMeta } from '../../data/fluidProperties.ts';
import { pfMaterial, type PFMaterialId, type PipeCondition } from '../../data/pipeRoughness.ts';
import CalculatorTab, { type ChainTarget } from './tabs/CalculatorTab';
import OverviewTab from './tabs/OverviewTab';
import ExamplesTab, { type SizingPreset } from './tabs/ExamplesTab';
import { sizingTable, selectPipeSize, type SizingConditions, type SizingFluid, type SizingRow } from './calc';
import { displayToMmAq, mmAqToDisplay, convertFlowToLpm } from './units';
import { PIPE_SIZE_MATERIALS, PIPE_MATERIALS_V2 } from '../../data/pipeSizes';
import type { FieldContext } from '../../config/calculators';
import { C, PA_PER_MM_AQ } from './styles';

type TabKey = 'calculator' | 'overview' | 'examples';

interface Props {
  initialTab?: string;
  initialState?: Record<string, any>;
  onSave?: (ctx: FieldContext) => void;
  onChain?: (calculatorId: string, initialState: Record<string, unknown>) => void;
  initialAction?: string;              // 기록 ⋯ 메뉴 진입 시 1회 실행 (csv·word·pdf)
  onInitialActionDone?: () => void;
}

function normalizeTab(t?: string): TabKey {
  if (t === 'overview' || t === 'examples' || t === 'calculator') return t;
  return 'calculator';
}

// PIPE_SIZE_MATERIALS id → pipeRoughness PFMaterialId (ε 기본값 조회용)
export const PF_MATERIAL_BY_SIZING: Record<string, PFMaterialId> = {
  sgp: 'steel', sts10s: 'sts304', 'pvc-cpvc': 'pvc', copper: 'copper',
};

// PIPE_SIZE_MATERIALS id → 펌프 시스템 PIPE_MATERIALS_V2 id (체이닝용)
const PUMP_MAT_BY_SIZING: Record<string, string> = {
  sgp: 'sgp', sts10s: 'stainless', 'pvc-cpvc': 'pvc', copper: 'copper',
};

// 선정 결과 → 펌프 시스템 initialState 페이로드 (선정 관경·재질 → 흡입/토출 배관 행, 길이는 사용자 입력)
function buildPumpChainPayload(args: {
  selected: SizingRow; matId: string; Q: string; flowUnit: string;
  tempC: string; condition: PipeCondition;
}): Record<string, unknown> {
  const { selected, matId, Q, flowUnit, tempC, condition } = args;
  const pumpMatId = PUMP_MAT_BY_SIZING[matId] ?? 'sgp';
  const matV2 = PIPE_MATERIALS_V2.find(m => m.id === pumpMatId);
  const sched = matV2?.schedules[0];
  // 선정 호칭이 펌프 치수표에 없으면 같은 재질의 상위 호칭으로 스냅 (없으면 그대로 전달)
  const sizes = sched?.sizes ?? [];
  const nominalA = sizes.some(s => s.nominalA === selected.size.nominalA)
    ? selected.size.nominalA
    : (sizes.find(s => s.nominalA >= selected.size.nominalA)?.nominalA ?? selected.size.nominalA);
  const pipeRow = (uid: string) => ({
    uid, materialId: pumpMatId, scheduleId: sched?.id ?? 'ks-std',
    nominalA, lStr: '', lUnit: 'm',
  });
  return {
    Q, flowUnit,                    // 펌프도 m3h/lpm 동일 키
    fluid: 'water', tempC,
    pipeCondition: condition,
    sucPipeRows: [pipeRow('chain-suc-1')],
    disPipeRows: [pipeRow('chain-dis-1')],
    chainedFrom: 'pipe-sizing',
  };
}

// 선정 결과 → 마찰손실 계산기 initialState 페이로드 (Q·선정 내경 D 2-of-3 — Colebrook 정밀 역검증)
function buildPfChainPayload(args: {
  selected: SizingRow; matId: string; Q: string; flowUnit: string;
  fluid: SizingFluid; tempC: string; pressureMmHg: string;
  condition: PipeCondition; epsStr: string; pressureUnit: string;
}): Record<string, unknown> {
  const { selected, matId, Q, flowUnit, fluid, tempC, pressureMmHg, condition, epsStr, pressureUnit } = args;
  const payload: Record<string, unknown> = {
    Q, flowUnit,
    D: selected.size.id_mm.toFixed(1),
    inputOrder: ['Q', 'D'],          // V는 자동 산출
    L: '',                           // 배관 길이는 사용자 입력 (배너 안내)
    materialId: PF_MATERIAL_BY_SIZING[matId] ?? 'steel',
    condition,
    eps: epsStr,
    fluid, tempC,
    pressureUnit,
    chainedFrom: 'pipe-sizing',
  };
  if (fluid === 'air') payload.pressureMmHg = pressureMmHg;
  return payload;
}

export default function PipeSizingCalculator({
  initialTab, initialState, onSave, onChain, initialAction, onInitialActionDone,
}: Props) {
  const [tab, setTab] = useState<TabKey>(normalizeTab(initialTab));

  const [matIdx, setMatIdx] = useState<number>(() => initialState?.matIdx ?? 0);
  const [Q, setQ] = useState<string>(() => initialState?.Q ?? '');
  const [dP, setDP] = useState<string>(() => initialState?.dP ?? '');
  const [fluid, setFluid] = useState<SizingFluid>(() => (initialState?.fluid === 'air' ? 'air' : 'water'));
  const [tempC, setTempC] = useState<string>(() => initialState?.tempC ?? '20');
  const [pressureMmHg, setPressureMmHg] = useState<string>(() => initialState?.pressureMmHg ?? '760');
  const [condition, setCondition] = useState<PipeCondition>(
    () => (initialState?.condition === 'old' ? 'old' : 'new'),
  );
  const [epsStr, setEpsStr] = useState<string>(() => {
    if (initialState?.eps !== undefined) return String(initialState.eps);
    const id = PF_MATERIAL_BY_SIZING[PIPE_SIZE_MATERIALS[initialState?.matIdx ?? 0]?.id] ?? 'steel';
    return String(pfMaterial(id).eps_mm[initialState?.condition === 'old' ? 'old' : 'new']);
  });
  const [flowUnit, setFlowUnit] = useState<FlowUnitKey>(() => initialState?.flowUnit ?? 'm3h');
  const [pressureUnit, setPressureUnit] = useState<PressureUnitKey>(() => initialState?.pressureUnit ?? 'kPa');
  // 체이닝으로 들어온 경우 — 전달된 Q·ΔP/L 강조 및 안내 배너 표시 (마찰손실 계산기 등)
  const [chainedFrom] = useState<string | undefined>(() => initialState?.chainedFrom);

  const mat = PIPE_SIZE_MATERIALS[matIdx] ?? PIPE_SIZE_MATERIALS[0];
  const pfMat = pfMaterial(PF_MATERIAL_BY_SIZING[mat.id] ?? 'steel');
  const epsDefault = String(pfMat.eps_mm[condition]);

  function changeMaterial(idx: number) {
    setMatIdx(idx);
    const m = PIPE_SIZE_MATERIALS[idx] ?? PIPE_SIZE_MATERIALS[0];
    setEpsStr(String(pfMaterial(PF_MATERIAL_BY_SIZING[m.id] ?? 'steel').eps_mm[condition]));
  }

  function changeCondition(c: PipeCondition) {
    setCondition(c);
    setEpsStr(String(pfMat.eps_mm[c]));
  }

  // 유체 물성(온도·공기는 압력) + 조도 — 계산 조건 (sizingTable에 전달)
  const cond: SizingConditions | null = useMemo(() => {
    const t = parseFloat(tempC);
    const eps = parseFloat(epsStr);
    const meta = pfFluidMeta(fluid);
    const p = parseFloat(pressureMmHg);
    if (!Number.isFinite(t) || t < (meta.tempMin ?? 0) || t > (meta.tempMax ?? 100)) return null;
    if (!Number.isFinite(eps) || eps < 0) return null;
    if (fluid === 'air' && (!Number.isFinite(p) || p <= 0)) return null;
    return {
      nu_m2s: pfKinematicViscosity(fluid, t, p),
      rho_kgm3: pfDensity(fluid, t, p),
      eps_mm: eps,
    };
  }, [tempC, epsStr, fluid, pressureMmHg]);

  const inputs = { matIdx, Q, dP, fluid, tempC, pressureMmHg, condition, eps: epsStr, flowUnit, pressureUnit };

  const outputs = useMemo(() => {
    if (!cond) return null;
    const Q_lpm = convertFlowToLpm(Q, flowUnit);
    const allowable_mmAq = displayToMmAq(parseFloat(dP), pressureUnit);
    if (!mat || !Number.isFinite(Q_lpm) || !Number.isFinite(allowable_mmAq)) return null;

    const rows = sizingTable(Q_lpm, allowable_mmAq, mat, cond);
    const selected = selectPipeSize(Q_lpm, allowable_mmAq, mat, cond);
    let analysis: { V: number; Re: number; unitLoss_Pa: number } | null = null;
    if (selected) {
      analysis = {
        V: selected.v_ms,
        Re: selected.Re,
        unitLoss_Pa: selected.dropPerM_mmAqPerM * PA_PER_MM_AQ,
      };
    }
    return { rows, selected, analysis };
  }, [Q, dP, flowUnit, pressureUnit, mat, cond]);

  // 체이닝 — 화면이 대상 계산기로 교체되므로 보내기 직전 기록에 자동 저장 (작업 유실 방지)
  const selected = outputs?.selected ?? null;
  function chainTo(targetId: string, payload: Record<string, unknown>) {
    if (onSave && outputs?.selected) onSave({ inputs, outputs });
    onChain?.(targetId, payload);
  }
  const chainTargets: ChainTarget[] | undefined = onChain ? [
    {
      key: 'pump-hvac',
      label: '펌프 선정 시스템',
      desc: '선정 관경·재질 → 흡입/토출 배관 · 유량 → Q (배관 길이는 직접 입력)',
      disabledReason: !selected ? '선정 결과가 있어야 보낼 수 있습니다'
        : fluid !== 'water' ? '펌프 시스템은 액체(물) 전용입니다' : null,
      onSend: () => selected && chainTo('pump-hvac',
        buildPumpChainPayload({ selected, matId: mat.id, Q, flowUnit, tempC, condition })),
    },
    {
      key: 'pipe-friction',
      label: '마찰손실 계산기',
      desc: '선정 내경 D·유량 Q → 2-of-3 입력 (Colebrook 정밀 역검증)',
      disabledReason: !selected ? '선정 결과가 있어야 보낼 수 있습니다' : null,
      onSend: () => selected && chainTo('pipe-friction',
        buildPfChainPayload({ selected, matId: mat.id, Q, flowUnit, fluid, tempC, pressureMmHg, condition, epsStr, pressureUnit })),
    },
  ] : undefined;

  // 단위 변경 시 입력값 자동 환산 — 물리량 유지
  function handleFlowUnitChange(newUnit: FlowUnitKey) {
    if (newUnit === flowUnit) return;
    const q = parseFloat(Q);
    if (Number.isFinite(q) && q > 0) {
      const oldDef = FLOW_UNITS.find(u => u.key === flowUnit);
      const newDef = FLOW_UNITS.find(u => u.key === newUnit);
      if (oldDef && newDef) {
        const si = q / oldDef.divisor;
        const newVal = si * newDef.divisor;
        setQ(formatNumericValue(newVal));
      }
    }
    setFlowUnit(newUnit);
  }

  function handlePressureUnitChange(newUnit: PressureUnitKey) {
    if (newUnit === pressureUnit) return;
    const v = parseFloat(dP);
    if (Number.isFinite(v) && v > 0) {
      const mmAq = displayToMmAq(v, pressureUnit);
      const newDisplay = mmAqToDisplay(mmAq, newUnit);
      const def = PRESSURE_UNITS.find(u => u.key === newUnit);
      if (def && Number.isFinite(newDisplay)) {
        setDP(newDisplay.toFixed(def.dpM));
      }
    }
    setPressureUnit(newUnit);
  }

  function loadPreset(p: SizingPreset) {
    setQ(p.Q); setDP(p.dP);
    setMatIdx(p.matIdx);
    setFluid('water');
    setTempC('20');
    setPressureMmHg('760');
    setCondition('new');
    const m = PIPE_SIZE_MATERIALS[p.matIdx] ?? PIPE_SIZE_MATERIALS[0];
    setEpsStr(String(pfMaterial(PF_MATERIAL_BY_SIZING[m.id] ?? 'steel').eps_mm.new));
    setFlowUnit('lpm'); setPressureUnit('mmAq');
    setTab('calculator');
  }

  function reset() {
    setQ(''); setDP(''); setMatIdx(0);
    setFluid('water'); setTempC('20'); setPressureMmHg('760'); setCondition('new');
    setEpsStr(String(pfMaterial('steel').eps_mm.new));
    setFlowUnit('m3h'); setPressureUnit('kPa');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Tabs value={tab} onChange={setTab} />

      {tab === 'calculator' && (
        <CalculatorTab
          Q={Q} dP={dP}
          setQ={setQ}
          setDP={setDP}
          matIdx={matIdx}
          setMatIdx={changeMaterial}
          fluid={fluid} setFluid={setFluid}
          tempC={tempC} setTempC={setTempC}
          pressureMmHg={pressureMmHg} setPressureMmHg={setPressureMmHg}
          condition={condition} setCondition={changeCondition}
          epsStr={epsStr} setEpsStr={setEpsStr}
          epsDefault={epsDefault}
          cond={cond}
          flowUnit={flowUnit} setFlowUnit={handleFlowUnitChange}
          pressureUnit={pressureUnit} setPressureUnit={handlePressureUnitChange}
          onReset={reset}
          onSave={onSave ? () => onSave({ inputs, outputs }) : undefined}
          canSave={!!outputs?.selected}
          chainedFrom={chainedFrom}
          chainTargets={chainTargets}
          initialAction={initialAction}
          onInitialActionDone={onInitialActionDone}
        />
      )}
      {tab === 'overview' && <OverviewTab />}
      {tab === 'examples' && <ExamplesTab onLoad={loadPreset} />}
    </div>
  );
}

function formatNumericValue(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n < 1) return n.toFixed(2);
  if (n < 10) return n.toFixed(1);
  return n.toFixed(0);
}

function Tabs({ value, onChange }: { value: TabKey; onChange: (t: TabKey) => void }) {
  const items: { key: TabKey; label: string }[] = [
    { key: 'calculator', label: '계산' },
    { key: 'overview',   label: '개요' },
    { key: 'examples',   label: '예시' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.border}` }}>
      {items.map(item => {
        const active = value === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            style={{
              padding: '10px 16px', fontSize: 14,
              fontWeight: active ? 600 : 500,
              color: active ? C.blue : C.text,
              background: 'transparent', border: 'none',
              borderBottom: `2px solid ${active ? C.blue : 'transparent'}`,
              marginBottom: -1, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
