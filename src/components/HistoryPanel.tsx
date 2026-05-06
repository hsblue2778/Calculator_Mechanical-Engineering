// 모달 좌측 기록 패널

import { useEffect, useRef, useState } from 'react';
import { X, Pencil, GitCompare } from 'lucide-react';
import {
  list, updateTitle, remove, formatRelativeTime, dateGroupOf,
  type HistoryEntry, type DateGroup,
} from '../state/historyStore';

interface Props {
  calculatorId: string;
  refreshKey: number;                              // 외부에서 저장·삭제 발생 시 증가시켜 재렌더 유도
  onLoadEntry: (entry: HistoryEntry) => void;
  onChanged?: () => void;                          // 패널 내부 변경 시 외부 알림
  // 비교 기능 (펌프 시스템 카테고리에서 활성, 옵셔널 — 미전달 시 기존 동작 유지)
  selectable?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  maxSelect?: number;
  onCompare?: () => void;
  onCompareToggleChange?: (active: boolean) => void; // 토글 ON/OFF 시 외부에 알림 (선택 리셋용)
  currentEntryId?: string;                          // 현재 워크스페이스에 로드된 항목 ID (시각 강조용)
  // 레이아웃 — 'modal' 기본 (220 고정폭·우측 보더), 'sidebar' (100% 폭·보더 없음)
  variant?: 'modal' | 'sidebar';
}

const GROUP_LABELS: Record<DateGroup, string> = {
  today:     '오늘',
  yesterday: '어제',
  week:      '지난 7일',
  older:     '그 이전',
};

export default function HistoryPanel({
  calculatorId, refreshKey, onLoadEntry, onChanged,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  maxSelect = 4,
  onCompare,
  onCompareToggleChange,
  currentEntryId,
  variant = 'modal',
}: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  // 비교 토글 ON/OFF (내부 상태)
  const [compareToggle, setCompareToggle] = useState(false);

  useEffect(() => {
    setEntries(list(calculatorId));
  }, [calculatorId, refreshKey]);

  // selectable=false로 전환 시 토글 초기화
  useEffect(() => {
    if (!selectable) setCompareToggle(false);
  }, [selectable]);

  // 토글 변화 시 외부 알림 (App에서 selectedIds 리셋용)
  useEffect(() => {
    onCompareToggleChange?.(compareToggle);
  }, [compareToggle, onCompareToggleChange]);

  function reload() {
    setEntries(list(calculatorId));
    onChanged?.();
  }

  function handleDelete(id: string) {
    remove(id, calculatorId);
    reload();
  }

  function handleTitleSave(id: string, newTitle: string) {
    const trimmed = newTitle.trim();
    if (trimmed) updateTitle(id, calculatorId, trimmed);
    setEditingId(null);
    reload();
  }

  const grouped = groupByDate(entries);
  const selectCount = selectedIds.length;
  const compareActive = selectable && compareToggle;

  const isSidebar = variant === 'sidebar';
  const outerStyle: React.CSSProperties = isSidebar
    ? { width: '100%', display: 'flex', flexDirection: 'column' }
    : {
        width: 220, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border-subtle)',
        paddingRight: 12, marginRight: 12,
      };

  return (
    <div style={outerStyle}>
      {/* 헤더 */}
      <div style={{
        fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
        marginBottom: 12, paddingBottom: 8,
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span>📋 기록 ({entries.length}/15)</span>
        {selectable && (
          <button
            onClick={() => setCompareToggle(v => !v)}
            title={compareToggle ? '비교 모드 끄기' : '비교 모드 켜기'}
            aria-label={compareToggle ? '비교 모드 끄기' : '비교 모드 켜기'}
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              fontSize: 11, fontWeight: 600,
              padding: '3px 7px',
              borderRadius: 5,
              border: `1px solid ${compareToggle ? 'var(--accent-primary)' : 'var(--border-default)'}`,
              background: compareToggle ? 'var(--accent-primary-bg-soft)' : 'transparent',
              color: compareToggle ? 'var(--accent-primary-hover)' : 'var(--text-tertiary)',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            <GitCompare size={11} />
            비교
          </button>
        )}
      </div>

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {entries.length === 0 ? (
          <div style={{
            fontSize: 12, color: 'var(--text-quaternary)',
            padding: '24px 4px', textAlign: 'center', lineHeight: 1.5,
          }}>
            아직 저장된<br />기록이 없습니다
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(['today', 'yesterday', 'week', 'older'] as DateGroup[]).map(group => {
              const items = grouped[group];
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <div style={{
                    fontSize: 10, color: 'var(--text-quaternary)', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: 0.3,
                    padding: '4px 2px', marginBottom: 4,
                  }}>
                    {GROUP_LABELS[group]}
                  </div>
                  {items.map(entry => (
                    <HistoryItem
                      key={entry.id}
                      entry={entry}
                      editing={editingId === entry.id}
                      onStartEdit={() => setEditingId(entry.id)}
                      onSubmitEdit={v => handleTitleSave(entry.id, v)}
                      onCancelEdit={() => setEditingId(null)}
                      onDelete={() => handleDelete(entry.id)}
                      onClick={() => {
                        if (compareActive) {
                          onToggleSelect?.(entry.id);
                        } else {
                          onLoadEntry(entry);
                        }
                      }}
                      // 비교 모드 props
                      compareMode={compareActive}
                      checked={selectedIds.includes(entry.id)}
                      checkDisabled={
                        compareActive &&
                        !selectedIds.includes(entry.id) &&
                        selectCount >= maxSelect
                      }
                      isCurrent={!compareActive && currentEntryId === entry.id}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 비교 버튼 — 토글 ON일 때 하단 고정 */}
      {compareActive && (
        <div style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <button
            onClick={() => { if (selectCount >= 2) onCompare?.(); }}
            disabled={selectCount < 2}
            style={{
              width: '100%',
              padding: '8px 0',
              fontSize: 12, fontWeight: 600,
              borderRadius: 6,
              border: 'none',
              cursor: selectCount >= 2 ? 'pointer' : 'not-allowed',
              background: selectCount >= 2 ? 'var(--accent-primary)' : 'var(--bg-active)',
              color: selectCount >= 2 ? '#FFFFFF' : 'var(--text-quaternary)',
              transition: 'background 0.15s',
            }}
          >
            비교 ({selectCount}/{maxSelect})
          </button>
        </div>
      )}
    </div>
  );
}

function HistoryItem({
  entry, editing, onStartEdit, onSubmitEdit, onCancelEdit, onDelete, onClick,
  compareMode, checked, checkDisabled, isCurrent,
}: {
  entry: HistoryEntry;
  editing: boolean;
  onStartEdit: () => void;
  onSubmitEdit: (value: string) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
  compareMode?: boolean;
  checked?: boolean;
  checkDisabled?: boolean;
  isCurrent?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [draft, setDraft] = useState(entry.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(entry.title); }, [entry.title]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // 우선순위: 비교 모드 체크됨 > 현재 로드됨 > 호버 > 기본
  const bg = checked
    ? 'var(--accent-primary-bg-soft)'
    : isCurrent
      ? 'var(--bg-hover)'
      : hover
        ? 'var(--bg-hover)'
        : 'transparent';
  const borderColor = isCurrent && !checked ? 'var(--accent-primary)' : 'transparent';

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        padding: '8px 8px',
        borderRadius: 6,
        backgroundColor: bg,
        border: `1px solid ${borderColor}`,
        cursor: editing ? 'text' : (checkDisabled ? 'not-allowed' : 'pointer'),
        transition: 'background-color 0.15s, border-color 0.15s',
        opacity: checkDisabled ? 0.5 : 1,
        display: 'flex', alignItems: 'flex-start', gap: 6,
      }}
      onClick={() => { if (!editing && !checkDisabled) onClick(); }}
    >
      {/* 비교 모드 체크박스 */}
      {compareMode && (
        <input
          type="checkbox"
          checked={!!checked}
          disabled={!!checkDisabled}
          onChange={() => { if (!checkDisabled) onClick(); }}
          onClick={e => e.stopPropagation()}
          style={{ marginTop: 2, flexShrink: 0, cursor: checkDisabled ? 'not-allowed' : 'pointer' }}
        />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onClick={e => e.stopPropagation()}
            onBlur={() => onSubmitEdit(draft)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); onSubmitEdit(draft); }
              if (e.key === 'Escape') { e.preventDefault(); setDraft(entry.title); onCancelEdit(); }
            }}
            style={{
              width: '100%',
              fontSize: 12, fontWeight: 500,
              padding: '2px 4px',
              border: '1px solid var(--border-focus)',
              borderRadius: 4,
              outline: 'none',
              fontFamily: 'inherit',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            }}
          />
        ) : (
          <div
            style={{
              fontSize: 12, fontWeight: 500, color: 'var(--text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              paddingRight: (!compareMode && hover) ? 40 : 0,
            }}
            title={entry.title}
          >
            {entry.title}
          </div>
        )}

        {!editing && (
          <div style={{ fontSize: 10, color: 'var(--text-quaternary)', marginTop: 2 }}>
            {formatRelativeTime(entry.timestamp)}
          </div>
        )}
      </div>

      {/* 펜·X 아이콘 — 비교 모드 OFF일 때만 노출 */}
      {!editing && !compareMode && hover && (
        <div style={{
          position: 'absolute', top: 6, right: 4,
          display: 'flex', gap: 2,
        }}>
          <IconBtn
            onClick={e => { e.stopPropagation(); onStartEdit(); }}
            aria-label="이름 수정"
            title="이름 수정"
          >
            <Pencil size={11} />
          </IconBtn>
          <IconBtn
            onClick={e => { e.stopPropagation(); onDelete(); }}
            aria-label="삭제"
            title="삭제"
          >
            <X size={12} />
          </IconBtn>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children, onClick, 'aria-label': ariaLabel, title,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  'aria-label': string;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      style={{
        width: 18, height: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
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

function groupByDate(entries: HistoryEntry[]): Record<DateGroup, HistoryEntry[]> {
  const groups: Record<DateGroup, HistoryEntry[]> = {
    today: [], yesterday: [], week: [], older: [],
  };
  for (const e of entries) {
    groups[dateGroupOf(e.timestamp)].push(e);
  }
  return groups;
}
