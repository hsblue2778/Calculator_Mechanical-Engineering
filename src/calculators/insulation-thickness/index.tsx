// 냉수배관 보온 두께 계산기 — 메인
// 사양 출처: 인수인계 사양서 §1~§12

import { useMemo, useState } from 'react';
import CalculatorTab from './tabs/CalculatorTab';
import { calculate, validate, type InsulationInputs } from './calc';
import type { FieldContext } from '../../config/calculators';

interface Props {
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

export default function InsulationThicknessCalculator({
  initialState, onSave, initialAction, onInitialActionDone,
}: Props) {
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

  function reset() {
    setStateFull(DEFAULT_STATE);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <CalculatorTab
        state={state}
        setState={setState}
        onReset={reset}
        onSave={onSave ? () => onSave({ inputs: state, outputs }) : undefined}
        canSave={canSave}
        initialAction={initialAction}
        onInitialActionDone={onInitialActionDone}
      />
    </div>
  );
}
