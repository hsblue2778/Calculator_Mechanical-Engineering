// 테마 영구화 — localStorage + data-theme 속성 토글
// 우선순위: localStorage('v5-theme') → matchMedia(prefers-color-scheme) → 'light'

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const STORAGE_KEY = 'v5-theme';

function readStored(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch { return null; }
}

function detectInitial(): Theme {
  const stored = readStored();
  if (stored) return stored;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
}

// 모듈 로드 시점에 즉시 적용 — FOUC 최소화
applyTheme(detectInitial());

export function useTheme(): [Theme, (next: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(() => detectInitial());
  useEffect(() => { applyTheme(theme); }, [theme]);
  return [theme, setThemeState];
}
