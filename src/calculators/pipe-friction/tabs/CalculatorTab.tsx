// 관마찰손실 — 계산 탭 (섹션 조립)
// 조건 설정 → 단위 → 흐름 조건(2-of-3) → 마찰계수 → 결과/경고 + 우측 실시간 패널

import { AlertTriangle } from 'lucide-react';
import ChainBanner from '../../../components/ChainBanner';
import UnitPanel from '../../../components/UnitPanel';
import { PRESSURE_UNITS, type PressureUnitKey } from '../units';
import { PF_FLOW_UNITS, type PFFlowUnitKey } from '../pfUnits.ts';
import type { PipeFrictionController } from '../usePipeFrictionState.ts';
import ConditionSection from './sections/ConditionSection';
import TriangleSection from './sections/TriangleSection';
import FrictionFactorSection from './sections/FrictionFactorSection';
import ActionBar from './sections/ActionBar';
import ResultBlocks from './ResultBlocks';
import StickyResults from './StickyResults';
import { buildPipeFrictionCsvRows } from '../csvExport.ts';
import { buildPipeFrictionReportHtml } from '../htmlReport';
import { downloadCsv, downloadWordFile, printHtmlReport } from '../../../utils/exportUtils';
import { useInitialAction } from '../../../utils/useInitialAction';

interface Props {
  pf: PipeFrictionController;
  onSave?: () => void;
  canSave?: boolean;
  onChain?: () => void;
  chainedFrom?: string;                // 체이닝 수신 안내 배너 (관경 계산기 역검증 등)
  initialAction?: string;              // 기록 ⋯ 메뉴 진입 시 1회 실행 (csv·word·pdf·chain)
  onInitialActionDone?: () => void;
}

export default function CalculatorTab({ pf, onSave, canSave, onChain, chainedFrom, initialAction, onInitialActionDone }: Props) {
  const { st, patch, res, error } = pf;
  const pressDef = PRESSURE_UNITS.find(u => u.key === st.pressureUnit)!;
  const showError = !!error && error.field !== 'pair';

  function handleCsv() {
    if (!res) return;
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadCsv(`pipe-friction_${ts}.csv`, buildPipeFrictionCsvRows(pf, pressDef));
  }
  function handleWord() {
    if (!res) return;
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadWordFile(`pipe-friction_${ts}.doc`, buildPipeFrictionReportHtml(pf));
  }
  function handlePdf() {
    if (!res) return;
    printHtmlReport(buildPipeFrictionReportHtml(pf));
  }

  // 기록 ⋯ 메뉴 진입 액션 — 결과 준비 후 1회 자동 실행
  useInitialAction(initialAction, !!res, a => {
    if (a === 'csv') handleCsv();
    else if (a === 'word') handleWord();
    else if (a === 'pdf') handlePdf();
    else if (a === 'chain') onChain?.();
  }, onInitialActionDone);

  const actionBarProps = {
    onSave, canSave,
    canExport: !!res,
    onCsv: handleCsv, onWord: handleWord, onPdf: handlePdf,
    onReset: pf.reset,
    onChain,
  };

  return (
    <div className="calc-workspace" style={{ display: 'flex', minHeight: 0, gap: 0 }}>
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20, paddingRight: 8 }}>
        {chainedFrom === 'pipe-sizing' && (
          <ChainBanner>
            관경 계산기에서 전달된 <b>선정 내경 D·유량 Q</b> 값입니다. 배관 길이 L을 입력하면 Colebrook 기반 마찰손실이 정밀 산출됩니다.
          </ChainBanner>
        )}
        <ConditionSection pf={pf} />

        <UnitPanel
          flowOptions={PF_FLOW_UNITS.map(u => ({ key: u.key, label: u.label }))}
          flowValue={st.flowUnit}
          onFlowChange={val => pf.changeFlowUnit(val as PFFlowUnitKey)}
          pressureOptions={PRESSURE_UNITS.map(u => ({ key: u.key, label: u.label }))}
          pressureValue={st.pressureUnit}
          onPressureChange={val => patch({ pressureUnit: val as PressureUnitKey })}
        />

        <TriangleSection pf={pf} />
        <FrictionFactorSection pf={pf} />

        {showError ? (
          <ErrorBanner message={error!.message} />
        ) : (
          <ResultBlocks pf={pf} />
        )}

        <ActionBar className="calc-actions calc-actions-desktop" {...actionBarProps} />
      </main>

      <StickyResults pf={pf} pressDef={pressDef} />
      <ActionBar className="calc-actions calc-actions-mobile" {...actionBarProps} />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '12px 16px',
      backgroundColor: 'var(--state-error-bg)', border: '1px solid var(--state-error-text)',
      borderLeft: '3px solid var(--state-error)',
      borderRadius: 6, color: 'var(--state-error-text)', fontSize: 13,
    }}>
      <AlertTriangle size={16} />
      <span>{message}</span>
    </div>
  );
}
