// 한국식 / 미국식 단위계 분절형 토글
// 미국식 버튼은 항상 disabled (준비 중).
// 이 컴포넌트는 dumb — confirm 로직은 호출부(App.tsx)에서 처리.

import { useState } from 'react';
import type { UnitSystem } from '../state/unitSystemStore';

interface Props {
  unitSystem: UnitSystem;
  onChange: (next: UnitSystem) => void;
}

export default function UnitSystemToggle({ unitSystem, onChange }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 32,
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--bg-surface)',
      }}
    >
      <SegBtn
        label="한국식"
        active={unitSystem === 'kr'}
        onClick={() => onChange('kr')}
      />
      <div style={{ width: 1, height: '100%', background: 'var(--border-default)' }} />
      <SegBtn
        label="미국식"
        active={unitSystem === 'us'}
        onClick={() => {}}
        disabled
        title="미국식 단위는 준비 중입니다"
      />
    </div>
  );
}

function SegBtn({
  label, active, onClick, disabled = false, title,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  const [hover, setHover] = useState(false);

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => !disabled && setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      title={title}
      style={{
        height: '100%',
        padding: '0 12px',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        fontFamily: 'inherit',
        border: 'none',
        borderRadius: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: active
          ? 'var(--accent-primary-bg-soft)'
          : hover
          ? 'var(--bg-hover)'
          : 'transparent',
        color: disabled
          ? 'var(--text-quaternary)'
          : active
          ? 'var(--accent-primary-hover, #2563EB)'
          : 'var(--text-secondary)',
        transition: 'background 0.12s, color 0.12s',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}
