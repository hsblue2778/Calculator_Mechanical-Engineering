// 마찰손실 계통 계산기 — 계산 탭 (① 계통설정 → ② 구간입력 → ③ 구간결과 → ④ 판정 요약 조립)

import { useState } from 'react';
import { AlertTriangle, Check, RotateCcw, Save } from 'lucide-react';
import type { FNSystemType } from '../../../data/frictionNetworkRef.ts';
import type { FNNetworkResult } from '../calc';
import type { FNSuggestion } from '../design';
import type { FNSettingsState, FNSegmentState } from '../index';
import SettingsPanel from './SettingsPanel';
import SegmentTable from './SegmentTable';
import ResultsPanel from './ResultsPanel';
import { C } from '../styles';

interface Props {
  st: FNSettingsState;
  patchSettings: (patch: Partial<FNSettingsState>) => void;
  changeSystemType: (t: FNSystemType) => void;
  rows: FNSegmentState[];
  patchRow: (i: number, patch: Partial<FNSegmentState>) => void;
  addRow: () => void;
  removeRow: (i: number) => void;
  settingsError: string | null;
  net: FNNetworkResult | null;
  suggestions: Record<string, FNSuggestion>;
  pAvailEntered: boolean;
  designTotalFlow_m3s: number | null;
  onReset: () => void;
  onSave?: () => void;
  canSave?: boolean;
}

export default function CalculatorTab({
  st, patchSettings, changeSystemType,
  rows, patchRow, addRow, removeRow,
  settingsError, net, suggestions, pAvailEntered, designTotalFlow_m3s,
  onReset, onSave, canSave,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
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
      />

      <ResultsPanel
        net={net}
        flowUnit={st.flowUnit}
        pAvailEntered={pAvailEntered}
        suggestions={suggestions}
        designTotalFlow_m3s={designTotalFlow_m3s}
      />

      <div className="calc-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        {onSave && <SaveBtn onClick={onSave} enabled={!!canSave} />}
        <button
          onClick={onReset}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', fontSize: 14, fontWeight: 500,
            color: C.text, backgroundColor: 'transparent',
            border: `1px solid ${C.borderInput}`, borderRadius: 8,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <RotateCcw size={14} /> 초기화
        </button>
      </div>
    </div>
  );
}

function SaveBtn({ onClick, enabled }: { onClick: () => void; enabled: boolean }) {
  const [saved, setSaved] = useState(false);
  function handle() {
    onClick();
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }
  return (
    <button
      onClick={handle}
      disabled={!enabled}
      title={enabled ? '현재 계산을 기록에 저장' : '가용정압 입력·전 구간 에러 없음일 때 저장할 수 있습니다'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '10px 16px', fontSize: 13, fontWeight: 500,
        color: enabled ? 'var(--text-inverse)' : 'var(--border-subtle)',
        backgroundColor: enabled ? (saved ? 'var(--state-success)' : C.blue) : 'var(--border-default)',
        border: 'none', borderRadius: 8,
        cursor: enabled ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
        transition: 'background-color 0.15s',
      }}
    >
      {saved ? <Check size={14} /> : <Save size={14} />}
      {saved ? '저장됨' : '기록 저장'}
    </button>
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
