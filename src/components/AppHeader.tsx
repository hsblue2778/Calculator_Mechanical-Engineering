// 앱 헤더 — 로고·앱명·(컨텍스트 크럼) + 우측 액션(인쇄·도움말·단위계·테마)

import { useState } from 'react';
import { HelpCircle, Printer, Menu } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import UnitSystemToggle from './UnitSystemToggle';
import type { Theme } from '../state/themeStore';
import type { UnitSystem } from '../state/unitSystemStore';

interface Props {
  theme: Theme;
  onThemeChange: (next: Theme) => void;
  onShowOnboarding: () => void;
  unitSystem: UnitSystem;
  onUnitSystemChange: (next: UnitSystem) => void;
  // Phase 2 대비 옵셔널 (현재 미사용)
  currentField?: string;
  onHome?: () => void;
  onPrint?: () => void;
  onMobileMenuToggle?: () => void;
}

export default function AppHeader({
  theme, onThemeChange, onShowOnboarding,
  unitSystem, onUnitSystemChange,
  currentField, onHome, onPrint, onMobileMenuToggle,
}: Props) {
  return (
    <header
      className="app-header"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 22px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky', top: 0, zIndex: 30,
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {onMobileMenuToggle && (
          <button
            className="mobile-menu-btn"
            onClick={onMobileMenuToggle}
            aria-label="메뉴 열기"
            style={{
              width: 32, height: 32,
              alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none',
              borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)',
            }}
          >
            <Menu size={18} />
          </button>
        )}
        <button
          onClick={onHome}
          disabled={!onHome}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'transparent', border: 'none',
            cursor: onHome ? 'pointer' : 'default',
            padding: 0, color: 'var(--text-primary)', minWidth: 0,
          }}
        >
          <div
            style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #3B82F6, #0EA5E9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFF', fontWeight: 700,
            }}
          >
            S
          </div>
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>종합 계산기</div>
            <div className="app-header-subtitle" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              기계설비 설계 도구
            </div>
          </div>
        </button>
        {currentField && (
          <>
            <span style={{ color: 'var(--text-quaternary)' }}>›</span>
            <span
              style={{
                fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {currentField}
            </span>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {onPrint && (
          <HeaderButton onClick={onPrint} icon={<Printer size={14} />} label="산출서 인쇄" />
        )}
        <HeaderButton
          onClick={onShowOnboarding}
          icon={<HelpCircle size={14} />}
          label="도움말"
          variant="ghost"
        />
        <UnitSystemToggle unitSystem={unitSystem} onChange={onUnitSystemChange} />
        <ThemeToggle theme={theme} onChange={onThemeChange} />
      </div>
    </header>
  );
}

function HeaderButton({
  onClick, icon, label, variant = 'default',
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'ghost';
}) {
  const [hover, setHover] = useState(false);
  const isGhost = variant === 'ghost';
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', fontSize: 12, fontWeight: 500,
        background: hover
          ? 'var(--bg-hover)'
          : isGhost ? 'transparent' : 'var(--bg-surface)',
        color: isGhost ? 'var(--text-secondary)' : 'var(--text-primary)',
        border: `1px solid ${isGhost ? 'transparent' : 'var(--border-default)'}`,
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'background 0.12s',
      }}
    >
      {icon}
      <span className="app-header-btn-label">{label}</span>
    </button>
  );
}
