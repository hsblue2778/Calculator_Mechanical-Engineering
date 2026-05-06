// 라이트/다크 토글 버튼 (헤더 우측)

import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import type { Theme } from '../state/themeStore';

interface Props {
  theme: Theme;
  onChange: (next: Theme) => void;
}

export default function ThemeToggle({ theme, onChange }: Props) {
  const [hover, setHover] = useState(false);
  const isDark = theme === 'dark';
  return (
    <button
      onClick={() => onChange(isDark ? 'light' : 'dark')}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      style={{
        width: 32, height: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 8,
        border: '1px solid var(--border-default)',
        background: hover ? 'var(--bg-hover)' : 'var(--bg-surface)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
      }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
