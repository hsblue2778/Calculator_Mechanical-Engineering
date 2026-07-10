// 계통 압력손실 — 액션 바 (기록 저장 · 내보내기 ▾ · 초기화)
// pipe-friction ActionBar 패턴 차용

import { useState } from 'react';
import { RotateCcw, Save, Check } from 'lucide-react';
import ExportMenu from '../../../components/ExportMenu';
import { C } from '../styles';

export default function ActionBar({
  className, onSave, canSave, canExport, onCsv, onWord, onPdf, onReset,
}: {
  className: string;
  onSave?: () => void; canSave?: boolean;
  canExport: boolean;
  onCsv: () => void; onWord: () => void; onPdf: () => void; onReset: () => void;
}) {
  return (
    <div
      className={className}
      style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}
    >
      {onSave && <SaveBtn onClick={onSave} enabled={!!canSave} />}
      <ExportMenu enabled={canExport} onCsv={onCsv} onWord={onWord} onPdf={onPdf} />
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

