// 풀페이지 워크스페이스 좌측 사이드바
// v5 prototype 차용 — 인스턴스 색상·#XXX 랜덤 ID 라벨 제거

import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, X } from 'lucide-react';

export interface WorkspaceInstance {
  id: string;
  calculatorId: string;
  name: string;
}

interface Props {
  instances: WorkspaceInstance[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
  // 옵션 슬롯 — 인스턴스 아래에 기록·비교 등 부가 패널을 주입
  extraPanel?: React.ReactNode;
  // 인스턴스 섹션을 숨김 — extraPanel만 표시 (펌프 시스템처럼 기록 기반 워크플로우용)
  hideInstances?: boolean;
}

export default function WorkspaceSidebar({
  instances, activeId, onSelect, onAdd, onRename, onRemove, extraPanel, hideInstances,
}: Props) {
  return (
    <aside
      style={{
        width: 220, flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        padding: '14px 12px',
        display: 'flex', flexDirection: 'column',
        gap: 4,
        minHeight: 0,
      }}
    >
      {!hideInstances && (
        <>
          <div
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 4px 6px',
            }}
          >
            <span
              style={{
                fontSize: 11, fontWeight: 600,
                color: 'var(--text-tertiary)',
                letterSpacing: 0.5, textTransform: 'uppercase',
              }}
            >
              인스턴스
            </span>
            <button
              onClick={onAdd}
              title="새 인스턴스"
              aria-label="새 인스턴스"
              style={{
                width: 22, height: 22,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--border-default)', borderRadius: 6,
                background: 'var(--bg-surface)', color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {instances.map(inst => (
              <InstanceRow
                key={inst.id}
                inst={inst}
                active={inst.id === activeId}
                canRemove={instances.length > 1}
                onSelect={() => onSelect(inst.id)}
                onRename={(name) => onRename(inst.id, name)}
                onRemove={() => onRemove(inst.id)}
              />
            ))}
          </div>
        </>
      )}

      {extraPanel && (
        <div style={{
          marginTop: hideInstances ? 0 : 16,
          paddingTop: hideInstances ? 0 : 12,
          borderTop: hideInstances ? 'none' : '1px solid var(--border-subtle)',
          display: 'flex', flexDirection: 'column',
          flex: 1, minHeight: 0,
        }}>
          {extraPanel}
        </div>
      )}
    </aside>
  );
}

function InstanceRow({
  inst, active, canRemove, onSelect, onRename, onRemove,
}: {
  inst: WorkspaceInstance;
  active: boolean;
  canRemove: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onRemove: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(inst.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(inst.name); }, [inst.name]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== inst.name) onRename(trimmed);
    setEditing(false);
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => { if (!editing) onSelect(); }}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 10px', borderRadius: 8,
        background: active ? 'var(--accent-primary-bg-soft)' : hover ? 'var(--bg-hover)' : 'transparent',
        border: `1px solid ${active ? 'var(--accent-primary)' : 'transparent'}`,
        cursor: editing ? 'text' : 'pointer',
        transition: 'background 0.12s',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onClick={e => e.stopPropagation()}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commit(); }
              if (e.key === 'Escape') { e.preventDefault(); setDraft(inst.name); setEditing(false); }
            }}
            style={{
              width: '100%', fontSize: 12, fontWeight: 600,
              padding: '2px 4px',
              border: '1px solid var(--border-focus)', borderRadius: 4,
              background: 'var(--bg-surface)', color: 'var(--text-primary)',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        ) : (
          <div
            title={inst.name}
            style={{
              fontSize: 12,
              fontWeight: active ? 600 : 500,
              color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              paddingRight: hover ? 36 : 0,
            }}
          >
            {inst.name}
          </div>
        )}
      </div>

      {!editing && hover && (
        <div
          style={{
            position: 'absolute', top: 6, right: 4,
            display: 'flex', gap: 2,
          }}
        >
          <IconBtn
            onClick={e => { e.stopPropagation(); setDraft(inst.name); setEditing(true); }}
            title="이름 변경"
          >
            <Pencil size={11} />
          </IconBtn>
          {canRemove && (
            <IconBtn
              onClick={e => { e.stopPropagation(); onRemove(); }}
              title="삭제"
            >
              <X size={12} />
            </IconBtn>
          )}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children, onClick, title,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 18, height: 18,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 'none', borderRadius: 4,
        cursor: 'pointer', color: 'var(--text-tertiary)',
      }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-active)'; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {children}
    </button>
  );
}
