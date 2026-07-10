// 관마찰손실 계산기 — 메인 컴포넌트
// 계산 로직: engine.ts (영역별 마찰계수 + Darcy-Weisbach + Hazen-Williams)
// 상태 관리: usePipeFrictionState.ts (삼각 입력·ε/C 편집·구기록 정규화)

import CalculatorTab from './tabs/CalculatorTab';
import { usePipeFrictionState, type PipeFrictionController } from './usePipeFrictionState.ts';
import { pfFlowUnitDef } from './pfUnits.ts';
import { PRESSURE_UNITS } from './units';
import { PIPE_SIZE_MATERIALS } from '../../data/pipeSizes';
import type { PFMaterialId } from '../../data/pipeRoughness.ts';
import type { FieldContext } from '../../config/calculators';

interface Props {
  initialState?: Record<string, any>;
  onSave?: (ctx: FieldContext) => void;
  onChain?: (calculatorId: string, initialState: Record<string, any>) => void;
  initialAction?: string;              // 기록 ⋯ 메뉴 진입 시 1회 실행 (csv·html·pdf·chain)
  onInitialActionDone?: () => void;
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
  initialState, onSave, onChain, initialAction, onInitialActionDone,
}: Props) {
  const pf = usePipeFrictionState(initialState);
  // 체이닝으로 들어온 경우 — 발신 계산기 안내 배너 표시 (관경 계산기 역검증 등)
  const chainedFrom = typeof initialState?.chainedFrom === 'string' ? initialState.chainedFrom : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <CalculatorTab
        pf={pf}
        onSave={onSave ? () => onSave({ inputs: pf.saveInputs(), outputs: pf.res }) : undefined}
        canSave={!!pf.res}
        onChain={onChain && pf.res ? () => {
          // 화면이 관경 계산기로 교체되므로 보내기 직전 기록에 자동 저장
          if (onSave) onSave({ inputs: pf.saveInputs(), outputs: pf.res });
          onChain('pipe-sizing', buildChainPayload(pf));
        } : undefined}
        chainedFrom={chainedFrom}
        initialAction={initialAction}
        onInitialActionDone={onInitialActionDone}
      />
    </div>
  );
}
