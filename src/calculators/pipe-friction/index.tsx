// 관마찰손실 계산기 — 메인 컴포넌트 (계산 + 개요 + 예시)
// 계산 로직: engine.ts (영역별 마찰계수 + Darcy-Weisbach + Hazen-Williams)
// 상태 관리: usePipeFrictionState.ts (삼각 입력·ε/C 편집·구기록 정규화)

import { useState } from 'react';
import CalculatorTab from './tabs/CalculatorTab';
import OverviewTab from './tabs/OverviewTab';
import ExamplesTab from './tabs/ExamplesTab';
import { usePipeFrictionState, type PFPreset } from './usePipeFrictionState.ts';
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
