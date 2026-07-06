// 관마찰손실 — 액션 바 (기록 저장 · CSV · HTML · PDF · 초기화)
// 기존 CalculatorTab에서 이동 — 동작 동일.

import { useState } from 'react';
import { RotateCcw, Printer, Download, Save, Check, FileDown, ArrowRight } from 'lucide-react';
import { C } from '../../styles';

export default function ActionBar({
  className, onSave, canSave, canExport, onCsv, onHtmlSave, onPdf, onReset, onChain,
}: {
  className: string;
  onSave?: () => void; canSave?: boolean;
  canExport: boolean;
  onCsv: () => void; onHtmlSave: () => void; onPdf: () => void; onReset: () => void;
  onChain?: () => void;
}) {
  return (
    <div
      className={className}
      style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}
    >
      {onChain && <ChainBtn onClick={onChain} />}
      {onSave && <SaveBtn onClick={onSave} enabled={!!canSave} />}
      <ActionBtn icon={<Download size={14} />} label="CSV 내보내기"
        enabled={canExport} onClick={onCsv} />
      <ActionBtn icon={<FileDown size={14} />} label="HTML로 저장하기"
        enabled={canExport} onClick={onHtmlSave}
        title="편집 가능한 HTML 산출서 파일 다운로드" />
      <ActionBtn icon={<Printer size={14} />} label="PDF로 저장"
        enabled={canExport} onClick={onPdf}
        title="인쇄 다이얼로그에서 '대상: PDF로 저장' 선택" />
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
      title={enabled ? '현재 계산을 기록에 저장' : '계산 결과가 유효할 때 저장할 수 있습니다'}
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

function ActionBtn({
  icon, label, enabled, onClick, title,
}: {
  icon: React.ReactNode; label: string; enabled: boolean;
  onClick: () => void; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '10px 16px', fontSize: 13, fontWeight: 500,
        color: enabled ? C.textDark : 'var(--text-quaternary)',
        backgroundColor: C.surface,
        border: `1px solid ${enabled ? C.borderInput : C.border}`, borderRadius: 8,
        cursor: enabled ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
      }}
    >
      {icon} {label}
    </button>
  );
}
