// 펌프 시스템 워크스페이스 좌측 섹션 스테퍼
// ✓ done / ⚠ warn / ○ pending 상태를 한 번에 보여주고 클릭 시 해당 섹션으로 스크롤

import { useState } from 'react';

export type SectionState = 'done' | 'warn' | 'error' | 'pending';

export interface SectionItem {
  id: string;
  label: string;
  state: SectionState;
  optional?: boolean;
}

interface Props {
  items: SectionItem[];
  activeId: string;
  onJump: (id: string) => void;
}

export default function SectionStepper({ items, activeId, onJump }: Props) {
  return (
    <aside
      style={{
        width: 200, flexShrink: 0,
        borderRight: '1px solid var(--border-subtle)',
        paddingRight: 12, marginRight: 12,
        display: 'flex', flexDirection: 'column', gap: 2,
        position: 'sticky', top: 0, alignSelf: 'flex-start',
        maxHeight: 'calc(90vh - 120px)', overflowY: 'auto',
      }}
    >
      <div
        style={{
          fontSize: 11, fontWeight: 600,
          color: 'var(--text-tertiary)',
          letterSpacing: 0.5, textTransform: 'uppercase',
          padding: '0 4px 8px',
        }}
      >
        섹션
      </div>
      {items.map((s, i) => (
        <StepperRow
          key={s.id}
          index={i}
          item={s}
          active={s.id === activeId}
          onClick={() => onJump(s.id)}
        />
      ))}
    </aside>
  );
}

function StepperRow({
  index, item, active, onClick,
}: {
  index: number;
  item: SectionItem;
  active: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const stateColor =
    item.state === 'done'  ? 'var(--state-success)' :
    item.state === 'warn'  ? 'var(--state-warn)' :
    item.state === 'error' ? 'var(--state-error)' :
    'var(--text-quaternary)';
  const stateBg =
    item.state === 'done'  ? 'var(--state-success-bg)' :
    item.state === 'warn'  ? 'var(--state-warn-bg)' :
    item.state === 'error' ? 'var(--state-error-bg)' :
    'var(--bg-surface-3)';
  const stateMark =
    item.state === 'done'  ? '✓' :
    item.state === 'warn'  ? '⚠' :
    item.state === 'error' ? '✕' :
    `${index + 1}`;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 10px', borderRadius: 6,
        background: active ? 'var(--bg-surface-3)' : hover ? 'var(--bg-hover)' : 'transparent',
        border: 'none', cursor: 'pointer',
        textAlign: 'left', width: '100%',
        color: 'var(--text-primary)',
        transition: 'background 0.12s',
      }}
    >
      <div
        style={{
          width: 20, height: 20, borderRadius: 999,
          background: stateBg,
          color: stateColor,
          fontSize: 11, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {stateMark}
      </div>
      <span
        style={{
          fontSize: 12, fontWeight: active ? 600 : 500,
          color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
          flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}
      >
        {item.label}
      </span>
      {item.optional && (
        <span style={{ fontSize: 10, color: 'var(--text-quaternary)' }}>선택</span>
      )}
    </button>
  );
}
