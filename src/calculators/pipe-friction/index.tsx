// 관마찰손실 계산기 — 메인 컴포넌트 (계산 + 개요 + 예시)
// 공식 출처: 일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p — Darcy-Weisbach
//   hf = 8 × f × L × Q² / (π² × g × D⁵)

import { useMemo, useState } from 'react';
import { FLOW_UNITS, type FlowUnitKey, type PressureUnitKey } from './units';
import CalculatorTab from './tabs/CalculatorTab';
import OverviewTab from './tabs/OverviewTab';
import ExamplesTab, { type FrictionPreset } from './tabs/ExamplesTab';
import { computeFriction, computeFrictionFromV } from './calc';
import { PIPE_MATERIALS } from '../../data/pipeMaterials';
import type { FieldContext } from '../../config/calculators';
import { C } from './styles';

type TabKey = 'calculator' | 'overview' | 'examples';

interface Props {
  initialTab?: string;
  initialState?: Record<string, any>;
  onSave?: (ctx: FieldContext) => void;
}

function normalizeTab(t?: string): TabKey {
  if (t === 'overview' || t === 'examples' || t === 'calculator') return t;
  return 'calculator';
}

export default function PipeFrictionCalculator({
  initialTab, initialState, onSave,
}: Props) {
  const [tab, setTab] = useState<TabKey>(normalizeTab(initialTab));

  const [inputMode, setInputMode] = useState<'Q' | 'v'>(() => initialState?.inputMode ?? 'Q');
  const [matIdx, setMatIdx] = useState<number>(() => initialState?.matIdx ?? 0);
  const [Q, setQ] = useState<string>(() => initialState?.Q ?? '');
  const [v, setV] = useState<string>(() => initialState?.v ?? '');
  const [D, setD] = useState<string>(() => initialState?.D ?? '');
  const [L, setL] = useState<string>(() => initialState?.L ?? '');
  const [fOverride, setFOverride] = useState<string>(() => initialState?.fOverride ?? '');
  const [flowUnit, setFlowUnit] = useState<FlowUnitKey>(() => initialState?.flowUnit ?? 'm3h');
  const [pressureUnit, setPressureUnit] = useState<PressureUnitKey>(() => initialState?.pressureUnit ?? 'kPa');

  function handleInputModeChange(next: 'Q' | 'v') {
    if (next === inputMode) return;
    if (next === 'Q') setQ('');
    else setV('');
    setInputMode(next);
  }

  const inputs = inputMode === 'v'
    ? { inputMode, matIdx, v, D, L, fOverride, flowUnit, pressureUnit }
    : { inputMode, matIdx, Q, D, L, fOverride, flowUnit, pressureUnit };

  // 결과 계산 — onSave 콜백용
  const outputs = useMemo(() => {
    const D_mm = parseFloat(D);
    const L_m = parseFloat(L);
    const mat = PIPE_MATERIALS[matIdx];
    const f = fOverride.trim() ? parseFloat(fOverride) : mat?.frictionFactor;
    if (!f || !Number.isFinite(D_mm) || !Number.isFinite(L_m)) return null;
    if (inputMode === 'v') return computeFrictionFromV({ v_str: v, D_mm, L_m, f });
    return computeFriction({ Q_str: Q, flowUnit, D_mm, L_m, f });
  }, [inputMode, Q, v, D, L, fOverride, flowUnit, matIdx]);

  // 단위 변경 시 입력값 자동 환산 — 물리량 유지, 표시 단위만 바뀜
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

  function loadPreset(p: FrictionPreset) {
    setInputMode('Q');
    setQ(p.Q); setV(''); setD(p.D); setL(p.L);
    setMatIdx(p.matIdx);
    setFOverride('');
    setTab('calculator');
  }

  function reset() {
    setInputMode('Q');
    setQ(''); setV(''); setD(''); setL(''); setFOverride(''); setMatIdx(0);
    setFlowUnit('m3h');
    setPressureUnit('kPa');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Tabs value={tab} onChange={setTab} />

      {tab === 'calculator' && (
        <CalculatorTab
          inputMode={inputMode} setInputMode={handleInputModeChange}
          Q={Q} v={v} D={D} L={L}
          setQ={setQ}
          setV={setV}
          setD={setD}
          setL={setL}
          matIdx={matIdx}
          setMatIdx={setMatIdx}
          fOverride={fOverride}
          setFOverride={setFOverride}
          flowUnit={flowUnit} setFlowUnit={handleFlowUnitChange}
          pressureUnit={pressureUnit} setPressureUnit={setPressureUnit}
          onReset={reset}
          onSave={onSave ? () => onSave({ inputs, outputs }) : undefined}
          canSave={!!outputs}
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
