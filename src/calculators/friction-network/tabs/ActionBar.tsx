// 계통 압력손실 — 액션 바 (내보내기 ▾ · 초기화)
// pipe-friction ActionBar 패턴 차용

import { RotateCcw } from 'lucide-react';
import ExportMenu from '../../../components/ExportMenu';
import { C } from '../styles';

export default function ActionBar({
  className, canExport, onCsv, onWord, onPdf, onReset,
}: {
  className: string;
  canExport: boolean;
  onCsv: () => void; onWord: () => void; onPdf: () => void; onReset: () => void;
}) {
  return (
    <div
      className={className}
      style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}
    >
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
