// 관마찰손실 — 계산 탭 (섹션 조립)
// 조건 설정 → 단위 → 흐름 조건(2-of-3) → 마찰계수 → 결과/경고 + 우측 실시간 패널

import { AlertTriangle } from 'lucide-react';
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
import { downloadCsv, downloadHtmlFile, printHtmlReport } from '../../../utils/exportUtils';

interface Props {
  pf: PipeFrictionController;
  onSave?: () => void;
  canSave?: boolean;
}

export default function CalculatorTab({ pf, onSave, canSave }: Props) {
  const { st, patch, res, error } = pf;
  const pressDef = PRESSURE_UNITS.find(u => u.key === st.pressureUnit)!;
  const showError = !!error && error.field !== 'pair';

  function handleCsv() {
    if (!res) return;
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadCsv(`pipe-friction_${ts}.csv`, buildPipeFrictionCsvRows(pf, pressDef));
  }
  function handleHtmlSave() {
    if (!res) return;
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadHtmlFile(`pipe-friction_${ts}.html`, buildPipeFrictionReportHtml(pf));
  }
  function handlePdf() {
    if (!res) return;
    printHtmlReport(buildPipeFrictionReportHtml(pf));
  }

  const actionBarProps = {
    onSave, canSave,
    canExport: !!res,
    onCsv: handleCsv, onHtmlSave: handleHtmlSave, onPdf: handlePdf,
    onReset: pf.reset,
  };

  return (
    <div className="calc-workspace" style={{ display: 'flex', minHeight: 0, gap: 0 }}>
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20, paddingRight: 8 }}>
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
