// 관마찰손실 — 액션 바 (내보내기 ▾ · 초기화)
// 기존 CalculatorTab에서 이동 — 동작 동일.

import { RotateCcw, ArrowRight } from 'lucide-react';
import ExportMenu from '../../../../components/ExportMenu';
import { C } from '../../styles';

export default function ActionBar({
  className, canExport, onCsv, onWord, onPdf, onReset, onChain,
}: {
  className: string;
  canExport: boolean;
  onCsv: () => void; onWord: () => void; onPdf: () => void; onReset: () => void;
  onChain?: () => void;
}) {
  return (
    <div
      className={className}
      style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}
    >
      {onChain && <ChainBtn onClick={onChain} />}
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

function ChainBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="현재 유량·마찰손실(ΔP/L) 값을 관경 계산기로 전달해 적정 관경을 역산출합니다"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '10px 16px', fontSize: 13, fontWeight: 600,
        color: 'var(--text-inverse)', backgroundColor: C.blue,
        border: 'none', borderRadius: 8,
        cursor: 'pointer', fontFamily: 'inherit',
      }}
    >
      관경 계산기로 보내기 <ArrowRight size={14} />
    </button>
  );
}
