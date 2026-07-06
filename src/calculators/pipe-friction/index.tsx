// 관마찰손실 계산기 — 메인 컴포넌트 (계산 + 개요 + 예시)
// 계산 로직: engine.ts (영역별 마찰계수 + Darcy-Weisbach + Hazen-Williams)
// 상태 관리: usePipeFrictionState.ts (삼각 입력·ε/C 편집·구기록 정규화)

import { useState } from 'react';
import CalculatorTab from './tabs/CalculatorTab';
import OverviewTab from './tabs/OverviewTab';
import ExamplesTab from './tabs/ExamplesTab';
import { usePipeFrictionState, type PFPreset, type PipeFrictionController } from './usePipeFrictionState.ts';
import { pfFlowUnitDef } from './pfUnits.ts';
import { PRESSURE_UNITS } from './units';
import { PIPE_SIZE_MATERIALS } from '../../data/pipeSizes';
import type { PFMaterialId } from '../../data/pipeRoughness.ts';
import type { FieldContext } from '../../config/calculators';
import { C } from './styles';

type TabKey = 'calculator' | 'overview' | 'examples';

interface Props {
  initialTab?: string;
  initialState?: Record<string, any>;
  onSave?: (ctx: FieldContext) => void;
  onChain?: (calculatorId: string, initialState: Record<string, any>) => void;
  initialAction?: string;              // 기록 ⋯ 메뉴 진입 시 1회 실행 (csv·html·pdf·chain)
  onInitialActionDone?: () => void;
}

function normalizeTab(t?: string): TabKey {
  if (t === 'overview' || t === 'examples' || t === 'calculator') return t;
  return 'calculator';
}

// PFMaterialId → 관경 계산기 PIPE_SIZE_MATERIALS id (역매핑, 없으면 생략)
const SIZING_MAT_BY_PF: Partial<Record<PFMaterialId, string>> = {
  steel: 'sgp', sts304: 'sts10s', pvc: 'pvc-cpvc', copper: 'copper',
};

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return '';
  if (n >= 100) return n.toFixed(1);
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(3);
}

// 마찰손실 계산 결과 → 관경 계산기 initialState 페이로드
function buildChainPayload(pf: PipeFrictionController): Record<string, any> {
  const res = pf.res!;
  const st = pf.st;
  // 유량 — 관경 계산기는 m³/h·LPM만 지원 (m³/min → m³/h)
  const flowUnit: 'm3h' | 'lpm' = st.flowUnit === 'lpm' ? 'lpm' : 'm3h';
  const Qdisp = res.Q_m3s * pfFlowUnitDef(flowUnit).divisor;
  // 마찰손실(단위) — 압력 단위는 두 계산기 공유
  const pDef = PRESSURE_UNITS.find(u => u.key === st.pressureUnit)!;
  const dPdisp = res.deltaP_per_m_Pa * pDef.factor;

  const payload: Record<string, any> = {
    Q: formatNum(Qdisp),
    flowUnit,
    dP: dPdisp.toFixed(pDef.dpM),
    pressureUnit: st.pressureUnit,
    condition: st.condition,
    eps: st.epsStr,
    chainedFrom: 'pipe-friction',
  };
  const sizingId = SIZING_MAT_BY_PF[st.materialId];
  if (sizingId) {
    const idx = PIPE_SIZE_MATERIALS.findIndex(m => m.id === sizingId);
    if (idx >= 0) payload.matIdx = idx;
  }
  // 관경 계산기는 물·공기만 지원 — 그 외 유체는 기본값(물)에 맡김
  if (st.fluid === 'water' || st.fluid === 'air') {
    payload.fluid = st.fluid;
    payload.tempC = st.tempC;
    if (st.fluid === 'air') payload.pressureMmHg = st.pressureMmHg;
  }
  return payload;
}

export default function PipeFrictionCalculator({
  initialTab, initialState, onSave, onChain, initialAction, onInitialActionDone,
}: Props) {
  const [tab, setTab] = useState<TabKey>(normalizeTab(initialTab));
  const pf = usePipeFrictionState(initialState);

  function loadPreset(p: PFPreset) {
    pf.loadPreset(p);
    setTab('calculator');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Tabs value={tab} onChange={setTab} />

      {tab === 'calculator' && (
        <CalculatorTab
          pf={pf}
          onSave={onSave ? () => onSave({ inputs: pf.saveInputs(), outputs: pf.res }) : undefined}
          canSave={!!pf.res}
          onChain={onChain && pf.res ? () => onChain('pipe-sizing', buildChainPayload(pf)) : undefined}
          initialAction={initialAction}
          onInitialActionDone={onInitialActionDone}
        />
      )}
      {tab === 'overview' && <OverviewTab />}
      {tab === 'examples' && <ExamplesTab onLoad={loadPreset} />}
    </div>
  );
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
