// ⓘ 정보 툴팁 — 라벨 옆 아이콘, 호버/클릭 시 도움말 표시
import { useState } from 'react';
import { Info } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export default function InfoTip({ children }: Props) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hover || pinned;
  return (
    <span style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}>
      <button
        type="button"
        aria-label="도움말"
        onClick={e => { e.stopPropagation(); setPinned(p => !p); }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', padding: 0, margin: 0,
          background: 'none', border: 'none', cursor: 'help',
          color: 'var(--text-quaternary)', fontFamily: 'inherit',
        }}
      >
        <Info size={13} />
      </button>
      {pinned && (
        <span style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setPinned(false)} />
      )}
      {open && (
        <span style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50,
          width: 'max-content', maxWidth: 260, padding: '8px 10px',
          backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          borderRadius: 8, boxShadow: 'var(--shadow-md)',
          fontSize: 12, fontWeight: 400, lineHeight: 1.5, color: 'var(--text-secondary)',
          textTransform: 'none', letterSpacing: 'normal', whiteSpace: 'normal',
          textAlign: 'left',
        }}>
          {children}
        </span>
      )}
    </span>
  );
}
