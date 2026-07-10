// 내보내기 ▾ 드롭다운 — CSV/Word/PDF 버튼 통합 (하단 바 위쪽으로 팝오버)
import { useState } from 'react';
import { ChevronDown, Download, FileText, Printer } from 'lucide-react';

interface Props {
  enabled: boolean;
  onCsv: () => void;
  onWord: () => void;
  onPdf: () => void;
}

export default function ExportMenu({ enabled, onCsv, onWord, onPdf }: Props) {
  const [open, setOpen] = useState(false);
  const items = [
    { key: 'csv', icon: <Download size={14} />, label: 'CSV 내보내기', desc: '입력·결과를 CSV 파일로 저장', onClick: onCsv },
    { key: 'word', icon: <FileText size={14} />, label: 'Word로 저장', desc: 'PDF 산출서와 동일한 양식의 Word(.doc) 파일 다운로드', onClick: onWord },
    { key: 'pdf', icon: <Printer size={14} />, label: 'PDF로 저장', desc: "인쇄 다이얼로그에서 '대상: PDF로 저장' 선택", onClick: onPdf },
  ];
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={!enabled}
        title={enabled ? undefined : '결과 계산 후 내보낼 수 있습니다'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '10px 16px', fontSize: 14, fontWeight: 500,
          color: enabled ? 'var(--text-secondary)' : 'var(--text-quaternary)',
          backgroundColor: 'transparent',
          border: '1px solid var(--border-default)', borderRadius: 8,
          cursor: enabled ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
          opacity: enabled ? 1 : 0.6,
        }}
      >
        <Download size={14} /> 내보내기
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, zIndex: 41,
            minWidth: 260, padding: 6,
            backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)',
            borderRadius: 10, boxShadow: 'var(--shadow-md)',
          }}>
            {items.map(item => (
              <button
                key={item.key}
                onClick={() => { setOpen(false); item.onClick(); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '9px 12px', borderRadius: 7,
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {item.icon} {item.label}
                </span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {item.desc}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
