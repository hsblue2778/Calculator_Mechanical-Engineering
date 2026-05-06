// 관경 계산기 — 메인 컴포넌트 (계산 + 개요 + 예시)
// 공식: 정통 Darcy-Weisbach (재질별 고정 f)
// 출처: 일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p

import { useMemo, useState } from 'react';
import {
  FLOW_UNITS, PRESSURE_UNITS,
  type FlowUnitKey,
  type PressureUnitKey,
} from '../pipe-friction/units';
import { NU } from '../pipe-friction/calc';
import CalculatorTab from './tabs/CalculatorTab';
import OverviewTab from './tabs/OverviewTab';
import ExamplesTab, { type SizingPreset } from './tabs/ExamplesTab';
import { sizingTable, selectPipeSize } from './calc';
import { displayToMmAq, mmAqToDisplay, convertFlowToLpm } from './units';
import { PIPE_SIZE_MATERIALS } from '../../data/pipeSizes';
import type { FieldContext } from '../../config/calculators';
import { C, PA_PER_MM_AQ } from './styles';

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

export default function PipeSizingCalculator({
  initialTab, initialState, onSave,
}: Props) {
  const [tab, setTab] = useState<TabKey>(normalizeTab(initialTab));

  const [matIdx, setMatIdx] = useState<number>(() => initialState?.matIdx ?? 0);
  const [Q, setQ] = useState<string>(() => initialState?.Q ?? '');
  const [dP, setDP] = useState<string>(() => initialState?.dP ?? '');
  const [flowUnit, setFlowUnit] = useState<FlowUnitKey>(() => initialState?.flowUnit ?? 'm3h');
  const [pressureUnit, setPressureUnit] = useState<PressureUnitKey>(() => initialState?.pressureUnit ?? 'kPa');

  const inputs = { matIdx, Q, dP, flowUnit, pressureUnit };

  const outputs = useMemo(() => {
    const Q_lpm = convertFlowToLpm(Q, flowUnit);
    const allowable_mmAq = displayToMmAq(parseFloat(dP), pressureUnit);
    const mat = PIPE_SIZE_MATERIALS[matIdx];
    if (!mat || !Number.isFinite(Q_lpm) || !Number.isFinite(allowable_mmAq)) return null;

    const rows = sizingTable(Q_lpm, allowable_mmAq, mat);
    const selected = selectPipeSize(Q_lpm, allowable_mmAq, mat);
    let analysis: { V: number; Re: number; unitLoss_Pa: number } | null = null;
    if (selected) {
      const V = selected.v_ms;
      const D_m = selected.size.id_mm / 1000;
      const Re = V * D_m / NU;
      analysis = { V, Re, unitLoss_Pa: selected.dropPerM_mmAqPerM * PA_PER_MM_AQ };
    }
    return { rows, selected, analysis };
  }, [Q, dP, flowUnit, pressureUnit, matIdx]);

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
    setFlowUnit('lpm'); setPressureUnit('mmAq');
    setTab('calculator');
  }

  function reset() {
    setQ(''); setDP(''); setMatIdx(0);
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
          setMatIdx={setMatIdx}
          flowUnit={flowUnit} setFlowUnit={handleFlowUnitChange}
          pressureUnit={pressureUnit} setPressureUnit={handlePressureUnitChange}
          onReset={reset}
          onSave={onSave ? () => onSave({ inputs, outputs }) : undefined}
          canSave={!!outputs?.selected}
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
