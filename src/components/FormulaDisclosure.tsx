// 수식 접기 — "수식 보기" 클릭 시 펼침 (기본 접힘)
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  label?: string;
  children: React.ReactNode;
}

export default function FormulaDisclosure({ label = '수식 보기', children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <details
      open={open}
      onToggle={e => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary style={{
        cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)',
        display: 'inline-flex', alignItems: 'center', gap: 5,
        listStyle: 'none', userSelect: 'none',
      }}>
        <ChevronDown size={13} style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
        {label}
      </summary>
      <div style={{ marginTop: 10, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 2 }}>
        {children}
      </div>
    </details>
  );
}
