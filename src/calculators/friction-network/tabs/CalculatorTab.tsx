// 계통 압력손실 — 계산 탭 (계통설정 → 구간입력 → 구간결과 조립 + 우측 실시간 결과 패널)

import { AlertTriangle } from 'lucide-react';
import { fnRUnit, type FNSystemType } from '../../../data/frictionNetworkRef.ts';
import { findFittingK } from '../../../data/duct-fitting-k-values';
import type { FNNetworkResult, FNSegmentInput } from '../calc';
import type { FNSuggestion } from '../design';
import type { FNSettingsState, FNSegmentState } from '../index';
import { downloadCsv, downloadWordFile, printHtmlReport } from '../../../utils/exportUtils';
import { useInitialAction } from '../../../utils/useInitialAction';
import { buildFrictionNetworkReportHtml } from '../htmlReport';
import { buildFrictionNetworkCsvRows } from '../csvExport';
import SettingsPanel from './SettingsPanel';
import SegmentTable from './SegmentTable';
import ResultsPanel from './ResultsPanel';
import ActionBar from './ActionBar';
import StickyResults from './StickyResults';

interface Props {
  st: FNSettingsState;
  patchSettings: (patch: Partial<FNSettingsState>) => void;
  changeSystemType: (t: FNSystemType) => void;
  rows: FNSegmentState[];
  patchRow: (i: number, patch: Partial<FNSegmentState>) => void;
  addRow: () => void;
  removeRow: (i: number) => void;
  activeSegments: FNSegmentInput[];
  settingsError: string | null;
  net: FNNetworkResult | null;
  suggestions: Record<string, FNSuggestion>;
  pAvailEntered: boolean;
  designTotalFlow_m3s: number | null;
  onReset: () => void;
  initialAction?: string;              // 기록 ⋯ 메뉴 진입 시 1회 실행 (csv·word·pdf)
  onInitialActionDone?: () => void;
}

export default function CalculatorTab({
  st, patchSettings, changeSystemType,
  rows, patchRow, addRow, removeRow,
  activeSegments, settingsError, net, suggestions, pAvailEntered, designTotalFlow_m3s,
  onReset, initialAction, onInitialActionDone,
}: Props) {
  // 구간별 부속 선택 내역 요약 (구간ID → "90° 엘보 ×4 · 게이트밸브 ×1") — 산출서·CSV 표기용
  function buildFittingSummaries(): Record<string, string> {
    const byId: Record<string, string> = {};
    for (const r of rows) {
      const id = r.id.trim();
      if (!id || !r.fittings?.length) continue;
      byId[id] = r.fittings
        .map(f => `${findFittingK(f.fittingId)?.nameKo ?? f.fittingId} ×${f.qty}`)
        .join(' · ');
    }
    return byId;
  }

  function reportArgs() {
    return {
      st, segments: activeSegments, net: net!,
      suggestions, pAvailEntered, designTotalFlow_m3s,
      fittingSummaries: buildFittingSummaries(),
    };
  }
  function handleCsv() {
    if (!net) return;
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadCsv(`friction-network_${ts}.csv`, buildFrictionNetworkCsvRows(reportArgs()));
  }
  function handleWord() {
    if (!net) return;
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadWordFile(`friction-network_${ts}.doc`, buildFrictionNetworkReportHtml(reportArgs()));
  }
  function handlePdf() {
    if (!net) return;
    printHtmlReport(buildFrictionNetworkReportHtml(reportArgs()));
  }

  // 기록 ⋯ 메뉴 진입 액션 — 결과 준비 후 1회 자동 실행
  useInitialAction(initialAction, !!net, a => {
    if (a === 'csv') handleCsv();
    else if (a === 'word') handleWord();
    else if (a === 'pdf') handlePdf();
  }, onInitialActionDone);

  const actionBarProps = {
    canExport: !!net,
    onCsv: handleCsv, onWord: handleWord, onPdf: handlePdf,
    onReset,
  };

  // 목표 마찰률 R → Pa/m 환산 — 구간 R(mmAq/m) 초과 강조용 (미입력·무효 시 null)
  const targetRNum = parseFloat(st.targetR);
  const targetR_Pa_per_m = st.targetR.trim() !== '' && Number.isFinite(targetRNum) && targetRNum > 0
    ? targetRNum * fnRUnit(st.targetRUnit).toPaPerM
    : null;

  return (
    <div className="calc-workspace" style={{ display: 'flex', minHeight: 0, gap: 0 }}>
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 22, paddingRight: 8 }}>
        <SettingsPanel
          st={st}
          patchSettings={patchSettings}
          changeSystemType={changeSystemType}
          net={net}
          pAvailEntered={pAvailEntered}
        />

        {settingsError && <ErrorBanner message={settingsError} />}

        <SegmentTable
          rows={rows}
          patchRow={patchRow}
          addRow={addRow}
          removeRow={removeRow}
          flowUnit={st.flowUnit}
          systemType={st.systemType}
        />

        <ResultsPanel
          net={net}
          flowUnit={st.flowUnit}
          pAvailEntered={pAvailEntered}
          suggestions={suggestions}
          designTotalFlow_m3s={designTotalFlow_m3s}
          targetR_Pa_per_m={targetR_Pa_per_m}
        />

        <ActionBar className="calc-actions calc-actions-desktop" {...actionBarProps} />
      </main>

      <StickyResults net={net} flowUnit={st.flowUnit} pAvailEntered={pAvailEntered} />
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
