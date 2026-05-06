import { useState } from 'react';
import { FileText } from 'lucide-react';

interface ChangelogButtonProps {
  onClick: () => void;
}

export default function ChangelogButton({ onClick }: ChangelogButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        left: 24,
        bottom: 24,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 40,
        padding: '8px 14px',
        backgroundColor: 'var(--bg-surface)',
        border: `1px solid ${hovered ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
        borderRadius: 12,
        boxShadow: hovered ? 'var(--shadow-lg)' : 'var(--shadow-md)',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      aria-label="패치노트 열기"
    >
      <FileText size={16} />
      패치노트
    </button>
  );
}
