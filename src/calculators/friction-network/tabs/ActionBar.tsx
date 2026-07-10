// 계통 압력손실 — 액션 바 (기록 저장 · CSV · Word · PDF · 초기화)
// pipe-friction ActionBar 패턴 차용

import { useState } from 'react';
import { RotateCcw, Printer, Download, Save, Check, FileText } from 'lucide-react';
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
      <ActionBtn icon={<Download size={14} />} label="CSV 내보내기"
        enabled={canExport} onClick={onCsv} />
      <ActionBtn icon={<FileText size={14} />} label="Word로 저장"
        enabled={canExport} onClick={onWord}
        title="PDF 산출서와 동일한 양식의 Word(.doc) 파일 다운로드" />
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
