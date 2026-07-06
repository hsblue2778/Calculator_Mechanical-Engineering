// 냉수배관 보온 두께 계산기 — 메인 (계산 + 개요 + 예시)
// 사양 출처: 인수인계 사양서 §1~§12

import { useMemo, useState } from 'react';
import CalculatorTab from './tabs/CalculatorTab';
import OverviewTab from './tabs/OverviewTab';
import ExamplesTab, { type InsulationPreset } from './tabs/ExamplesTab';
import { calculate, validate, type InsulationInputs } from './calc';
import type { FieldContext } from '../../config/calculators';
import { C } from './styles';

type TabKey = 'calculator' | 'overview' | 'examples';

interface Props {
  initialTab?: string;
  initialState?: Record<string, any>;
  onSave?: (ctx: FieldContext) => void;
  initialAction?: string;              // 기록 ⋯ 메뉴 진입 시 1회 실행 (csv·html·pdf)
  onInitialActionDone?: () => void;
}

const DEFAULT_STATE: InsulationInputs = {
  pipeIdx: 5,           // 50A
  matIdx: 0,            // 고무발포
  customK: '',
  Ti: '', Ta: '', RH: '',
  ho: '9.3', safetyFactor: '1.2',
};

function normalizeTab(t?: string): TabKey {
  if (t === 'overview' || t === 'examples' || t === 'calculator') return t;
  return 'calculator';
}

export default function InsulationThicknessCalculator({
  initialTab, initialState, onSave, initialAction, onInitialActionDone,
}: Props) {
  const [tab, setTab] = useState<TabKey>(normalizeTab(initialTab));
  const [state, setStateFull] = useState<InsulationInputs>(() => ({
    ...DEFAULT_STATE,
    ...(initialState as Partial<InsulationInputs> | undefined),
  }));

  function setState(patch: Partial<InsulationInputs>) {
    setStateFull(prev => ({ ...prev, ...patch }));
  }

  const outputs = useMemo(() => {
    if (validate(state)) return null;
    return calculate(state);
  }, [state]);

  const canSave = !!outputs;

  function loadPreset(p: InsulationPreset) {
    setStateFull(p.state);
    setTab('calculator');
  }

  function reset() {
    setStateFull(DEFAULT_STATE);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Tabs value={tab} onChange={setTab} />

      {tab === 'calculator' && (
        <CalculatorTab
          state={state}
          setState={setState}
          onReset={reset}
          onSave={onSave ? () => onSave({ inputs: state, outputs }) : undefined}
          canSave={canSave}
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
