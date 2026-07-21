// 전역 사이드바 — 홈·워크스페이스 공통
// 섹션: 새로 생성 · 프로젝트 · 고정됨 · 최근 항목 (Claude 사이드바 모델)
// 좁은 스크롤 컨테이너에서 팝오버가 잘리므로 메뉴·목록은 전부 인라인 확장 패턴 사용

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Pencil, Trash2, GitCompare, MoreVertical,
  FileDown, FileText, Printer, ArrowRight,
  Pin, PinOff, SquarePen, Folder, FolderPlus, FolderMinus,
  ChevronRight, ChevronDown,
} from 'lucide-react';
import { calculators } from '../config/calculators';
import * as historyStore from '../state/historyStore';
import type { HistoryEntry, Project, DateGroup } from '../state/historyStore';

// 기록 항목 ⋯ 메뉴의 내보내기·체이닝 액션 — 계산기별 지원 목록은 App에서 전달
export type EntryAction = 'csv' | 'word' | 'pdf' | 'chain';

const ENTRY_ACTION_META: Record<EntryAction, { label: string; icon: React.ReactNode }> = {
  csv:   { label: 'CSV로 저장',        icon: <FileDown size={13} /> },
  word:  { label: 'Word로 저장',       icon: <FileText size={13} /> },
  pdf:   { label: 'PDF로 저장',        icon: <Printer size={13} /> },
  chain: { label: '관경 선정으로 보내기', icon: <ArrowRight size={13} /> },
};

const GROUP_LABELS: Record<DateGroup, string> = {
  today:     '오늘',
  yesterday: '어제',
  week:      '지난 7일',
  older:     '그 이전',
};

// 계산기 id → 표시명 (기록 행 캡션용)
const CALC_TITLE: Record<string, string> = Object.fromEntries(
  calculators.map(c => [c.id, c.title]),
);

interface Props {
  refreshKey: number;                              // 외부에서 저장·삭제 발생 시 증가시켜 재렌더 유도
  currentEntryId?: string;                         // 현재 워크스페이스에 로드된 항목 ID (시각 강조용)
  onNewCalculator: (calculatorId: string) => void;
  onOpenEntry: (entry: HistoryEntry) => void;
  onEntryAction: (entry: HistoryEntry, action: EntryAction) => void;
  entryActionsByCalc: Record<string, EntryAction[]>;
  onChanged: () => void;                           // 패널 내부 변경(이름변경·삭제·고정·프로젝트) 시 외부 알림
  // 비교 기능 (펌프 시스템 활성 시)
  compareEnabled: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  maxSelect: number;
  onCompare: () => void;
  onCompareToggleChange: (active: boolean) => void;
  // 모바일 슬라이드오버
  mobileOpen: boolean;
}

export default function GlobalSidebar({
  refreshKey, currentEntryId,
  onNewCalculator, onOpenEntry, onEntryAction, entryActionsByCalc, onChanged,
  compareEnabled, selectedIds, onToggleSelect, maxSelect, onCompare, onCompareToggleChange,
  mobileOpen,
}: Props) {
  // 순수 읽기 — refreshKey(외부 저장·삭제 신호) 변화 시 재조회 (setState-in-effect 회피)
  const entries = useMemo(() => { void refreshKey; return historyStore.listAll(); }, [refreshKey]);
  const projects = useMemo(() => { void refreshKey; return historyStore.listProjects(); }, [refreshKey]);

  const [newOpen, setNewOpen] = useState(false);
  // 행 상태 키 — 같은 기록이 여러 섹션(프로젝트·고정됨·최근)에 나타나므로 `${section}:${id}` 로 구분
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectMenuId, setProjectMenuId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [compareToggle, setCompareToggle] = useState(false);

  // 비교 불가 화면으로 전환 시 토글 초기화
  useEffect(() => {
    if (!compareEnabled) setCompareToggle(false);
  }, [compareEnabled]);

  // 토글 변화 시 외부 알림 (App에서 selectedIds 리셋용)
  useEffect(() => {
    onCompareToggleChange?.(compareToggle);
  }, [compareToggle, onCompareToggleChange]);

  const pinnedEntries = entries.filter(e => e.pinned);
  const grouped = groupByDate(entries);
  const compareActive = compareEnabled && compareToggle;
  const selectCount = selectedIds.length;

  function closeRowStates() {
    setMenuKey(null);
    setEditingKey(null);
  }

  function handleDelete(entry: HistoryEntry) {
    historyStore.remove(entry.id);
    closeRowStates();
    onChanged();
  }

  function handleTitleSave(id: string, newTitle: string) {
    const trimmed = newTitle.trim();
    if (trimmed) historyStore.updateTitle(id, trimmed);
    setEditingKey(null);
    onChanged();
  }

  function handleTogglePin(entry: HistoryEntry) {
    historyStore.setPinned(entry.id, !entry.pinned);
    setMenuKey(null);
    onChanged();
  }

  function handleAssignProject(entry: HistoryEntry, projectId: string) {
    historyStore.setProject(entry.id, projectId);
    setMenuKey(null);
    onChanged();
  }

  function handleCreateAndAssign(entry: HistoryEntry, name: string) {
    const p = historyStore.createProject(name);
    historyStore.setProject(entry.id, p.id);
    setMenuKey(null);
    onChanged();
  }

  function handleUnassignProject(entry: HistoryEntry) {
    historyStore.setProject(entry.id, undefined);
    setMenuKey(null);
    onChanged();
  }

  function handleCreateProject(name: string) {
    const trimmed = name.trim();
    if (trimmed) {
      const p = historyStore.createProject(trimmed);
      setExpandedProjects(prev => new Set(prev).add(p.id));
      onChanged();
    }
    setCreatingProject(false);
  }

  function handleRenameProject(id: string, name: string) {
    const trimmed = name.trim();
    if (trimmed) historyStore.renameProject(id, trimmed);
    setEditingProjectId(null);
    onChanged();
  }

  function handleRemoveProject(p: Project) {
    if (!window.confirm(`'${p.name}' 프로젝트를 삭제할까요?\n기록은 삭제되지 않고 최근 항목으로 이동합니다.`)) return;
    historyStore.removeProject(p.id);
    setProjectMenuId(null);
    onChanged();
  }

  function toggleProjectExpand(id: string) {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 공용 기록 행 렌더 — 섹션별 rowKey 로 편집·메뉴 상태 분리
  function renderEntry(entry: HistoryEntry, section: string, opts?: { indent?: boolean }) {
    const rowKey = `${section}:${entry.id}`;
    const isPumpRow = entry.calculatorId === 'pump-hvac';
    const rowCompareMode = compareActive && isPumpRow;
    return (
      <EntryRow
        key={rowKey}
        entry={entry}
        caption={CALC_TITLE[entry.calculatorId] ?? entry.calculatorId}
        indent={opts?.indent}
        editing={editingKey === rowKey}
        onStartEdit={() => { setEditingKey(rowKey); setMenuKey(null); }}
        onSubmitEdit={v => handleTitleSave(entry.id, v)}
        onCancelEdit={() => setEditingKey(null)}
        onDelete={() => handleDelete(entry)}
        onClick={() => {
          if (rowCompareMode) {
            onToggleSelect(entry.id);
          } else {
            closeRowStates();
            onOpenEntry(entry);
          }
        }}
        menuOpen={menuKey === rowKey}
        onToggleMenu={() => setMenuKey(k => k === rowKey ? null : rowKey)}
        actions={entryActionsByCalc[entry.calculatorId] ?? []}
        onAction={a => { setMenuKey(null); onEntryAction(entry, a); }}
        projects={projects}
        onTogglePin={() => handleTogglePin(entry)}
        onAssignProject={pid => handleAssignProject(entry, pid)}
        onCreateAndAssign={name => handleCreateAndAssign(entry, name)}
        onUnassignProject={() => handleUnassignProject(entry)}
        compareMode={rowCompareMode}
        checked={selectedIds.includes(entry.id)}
        checkDisabled={
          rowCompareMode &&
          !selectedIds.includes(entry.id) &&
          selectCount >= maxSelect
        }
        isCurrent={!compareActive && currentEntryId === entry.id}
      />
    );
  }

  return (
    <aside
      className={`workspace-sidebar${mobileOpen ? ' is-open' : ''}`}
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        padding: '14px 12px',
        display: 'flex', flexDirection: 'column',
        gap: 4,
        minHeight: 0,
      }}
    >
      {/* 새로 생성 */}
      <button
        onClick={() => setNewOpen(o => !o)}
        aria-expanded={newOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%',
          padding: '8px 10px',
          fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
          color: 'var(--text-primary)',
          background: newOpen ? 'var(--bg-hover)' : 'transparent',
          border: '1px solid var(--border-default)', borderRadius: 8,
          cursor: 'pointer',
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
        onMouseLeave={e => { if (!newOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <SquarePen size={15} />
        새로 생성
      </button>
      {newOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
          {calculators.map(c => (
            <button
              key={c.id}
              onClick={() => { setNewOpen(false); onNewCalculator(c.id); }}
              title={c.description}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%',
                padding: '7px 10px 7px 14px',
                fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                color: 'var(--text-secondary)',
                background: 'transparent', border: 'none', borderRadius: 6,
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Plus size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.title}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 스크롤 영역 — 프로젝트 · 고정됨 · 최근 항목 */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 프로젝트 */}
        <div>
          <SectionHeader
            label="프로젝트"
            action={
              <IconBtn onClick={e => { e.stopPropagation(); setCreatingProject(v => !v); }} title="새 프로젝트">
                <Plus size={13} />
              </IconBtn>
            }
          />
          {creatingProject && (
            <InlineNameInput
              placeholder="프로젝트 이름"
              onSubmit={handleCreateProject}
              onCancel={() => setCreatingProject(false)}
            />
          )}
          {projects.length === 0 && !creatingProject ? (
            <EmptyHint>프로젝트가 없습니다</EmptyHint>
          ) : (
            projects.map(p => {
              const projectEntries = entries.filter(e => e.projectId === p.id);
              const expanded = expandedProjects.has(p.id);
              return (
                <div key={p.id}>
                  <ProjectRow
                    project={p}
                    count={projectEntries.length}
                    expanded={expanded}
                    editing={editingProjectId === p.id}
                    menuOpen={projectMenuId === p.id}
                    onClick={() => toggleProjectExpand(p.id)}
                    onToggleMenu={() => setProjectMenuId(id => id === p.id ? null : p.id)}
                    onStartEdit={() => { setEditingProjectId(p.id); setProjectMenuId(null); }}
                    onSubmitEdit={v => handleRenameProject(p.id, v)}
                    onCancelEdit={() => setEditingProjectId(null)}
                    onDelete={() => handleRemoveProject(p)}
                  />
                  {expanded && (
                    projectEntries.length === 0 ? (
                      <EmptyHint indent>기록을 ⋯ 메뉴에서 추가하세요</EmptyHint>
                    ) : (
                      projectEntries.map(e => renderEntry(e, `prj-${p.id}`, { indent: true }))
                    )
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 고정됨 — 비어 있으면 섹션 숨김 */}
        {pinnedEntries.length > 0 && (
          <div>
            <SectionHeader label="고정됨" />
            {pinnedEntries.map(e => renderEntry(e, 'pinned'))}
          </div>
        )}

        {/* 최근 항목 */}
        <div>
          <SectionHeader
            label="최근 항목"
            action={compareEnabled ? (
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
            ) : undefined}
          />
          {entries.length === 0 ? (
            <EmptyHint>아직 저장된 기록이 없습니다</EmptyHint>
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
                    {items.map(e => renderEntry(e, 'recent'))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 비교 버튼 — 토글 ON일 때 하단 고정 */}
      {compareActive && (
        <div style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <button
            onClick={() => { if (selectCount >= 2) onCompare(); }}
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
    </aside>
  );
}

// ── 기록 행 ─────────────────────────────────────────────────────

function EntryRow({
  entry, caption, indent, editing, onStartEdit, onSubmitEdit, onCancelEdit, onDelete, onClick,
  menuOpen, onToggleMenu, actions, onAction,
  projects, onTogglePin, onAssignProject, onCreateAndAssign, onUnassignProject,
  compareMode, checked, checkDisabled, isCurrent,
}: {
  entry: HistoryEntry;
  caption: string;
  indent?: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onSubmitEdit: (value: string) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  actions: EntryAction[];
  onAction: (a: EntryAction) => void;
  projects: Project[];
  onTogglePin: () => void;
  onAssignProject: (projectId: string) => void;
  onCreateAndAssign: (name: string) => void;
  onUnassignProject: () => void;
  compareMode?: boolean;
  checked?: boolean;
  checkDisabled?: boolean;
  isCurrent?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const [draft, setDraft] = useState(entry.title);
  const [projSubOpen, setProjSubOpen] = useState(false);
  const [creatingInMenu, setCreatingInMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(entry.title); }, [entry.title]);
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);
  // 메뉴 닫힐 때 서브메뉴 상태 초기화
  useEffect(() => {
    if (!menuOpen) { setProjSubOpen(false); setCreatingInMenu(false); }
  }, [menuOpen]);

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
        padding: '8px 8px',
        marginLeft: indent ? 14 : 0,
        borderRadius: 6,
        backgroundColor: bg,
        border: `1px solid ${borderColor}`,
        cursor: editing ? 'text' : (checkDisabled ? 'not-allowed' : 'pointer'),
        transition: 'background-color 0.15s, border-color 0.15s',
        opacity: checkDisabled ? 0.5 : 1,
      }}
      onClick={() => { if (!editing && !checkDisabled) onClick(); }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
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
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 500, color: 'var(--text-primary)',
                overflow: 'hidden',
              }}
              title={entry.title}
            >
              {entry.pinned && <Pin size={10} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.title}
              </span>
            </div>
          )}

          {!editing && (
            <div style={{ fontSize: 10, color: 'var(--text-quaternary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {caption} · {historyStore.formatRelativeTime(entry.timestamp)}
            </div>
          )}
        </div>

        {/* ⋯ 더보기 — 항상 노출 (터치 접근성), 비교 모드에서는 숨김 */}
        {!editing && !compareMode && (
          <button
            onClick={e => { e.stopPropagation(); onToggleMenu(); }}
            aria-label="더보기"
            title="더보기"
            aria-expanded={menuOpen}
            style={{
              width: 28, height: 28, flexShrink: 0, marginTop: -2, marginRight: -4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: menuOpen ? 'var(--bg-active)' : 'transparent',
              border: 'none', borderRadius: 6,
              cursor: 'pointer', color: 'var(--text-tertiary)',
            }}
          >
            <MoreVertical size={15} />
          </button>
        )}
      </div>

      {/* ⋯ 메뉴 — 행 내부 인라인 확장 (스크롤 컨테이너에서 잘리지 않음) */}
      {menuOpen && !editing && !compareMode && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            marginTop: 6,
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            background: 'var(--bg-surface)',
            overflow: 'hidden',
            cursor: 'default',
          }}
        >
          <MenuItem icon={<Pencil size={13} />} label="이름 변경" onClick={onStartEdit} />
          <MenuItem
            icon={entry.pinned ? <PinOff size={13} /> : <Pin size={13} />}
            label={entry.pinned ? '고정 해제' : '고정'}
            onClick={onTogglePin}
          />
          <MenuItem
            icon={<FolderPlus size={13} />}
            label="프로젝트에 추가"
            trailing={projSubOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            onClick={() => setProjSubOpen(v => !v)}
          />
          {projSubOpen && (
            <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
              {projects.map(p => (
                <MenuItem
                  key={p.id}
                  icon={<Folder size={13} />}
                  label={p.name + (entry.projectId === p.id ? ' ✓' : '')}
                  indent
                  onClick={() => onAssignProject(p.id)}
                />
              ))}
              {creatingInMenu ? (
                <div style={{ padding: '4px 10px 6px 24px' }}>
                  <InlineNameInput
                    placeholder="프로젝트 이름"
                    onSubmit={name => { if (name.trim()) onCreateAndAssign(name.trim()); setCreatingInMenu(false); }}
                    onCancel={() => setCreatingInMenu(false)}
                  />
                </div>
              ) : (
                <MenuItem
                  icon={<Plus size={13} />}
                  label="새 프로젝트…"
                  indent
                  onClick={() => setCreatingInMenu(true)}
                />
              )}
            </div>
          )}
          {entry.projectId && (
            <MenuItem icon={<FolderMinus size={13} />} label="프로젝트에서 제거" onClick={onUnassignProject} />
          )}
          {actions.map(a => (
            <MenuItem key={a} icon={ENTRY_ACTION_META[a].icon} label={ENTRY_ACTION_META[a].label}
              onClick={() => onAction(a)} />
          ))}
          <MenuItem icon={<Trash2 size={13} />} label="삭제" danger
            onClick={() => { if (window.confirm(`'${entry.title}' 기록을 삭제할까요?`)) onDelete(); }} />
        </div>
      )}
    </div>
  );
}

// ── 프로젝트 행 ─────────────────────────────────────────────────

function ProjectRow({
  project, count, expanded, editing, menuOpen,
  onClick, onToggleMenu, onStartEdit, onSubmitEdit, onCancelEdit, onDelete,
}: {
  project: Project;
  count: number;
  expanded: boolean;
  editing: boolean;
  menuOpen: boolean;
  onClick: () => void;
  onToggleMenu: () => void;
  onStartEdit: () => void;
  onSubmitEdit: (value: string) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [draft, setDraft] = useState(project.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(project.name); }, [project.name]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '7px 8px',
        borderRadius: 6,
        backgroundColor: hover ? 'var(--bg-hover)' : 'transparent',
        cursor: editing ? 'text' : 'pointer',
        transition: 'background-color 0.15s',
      }}
      onClick={() => { if (!editing) onClick(); }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {expanded ? <ChevronDown size={12} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
                  : <ChevronRight size={12} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />}
        <Folder size={13} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
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
                if (e.key === 'Escape') { e.preventDefault(); setDraft(project.name); onCancelEdit(); }
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
            <span
              title={project.name}
              style={{
                display: 'block',
                fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {project.name}
              <span style={{ fontWeight: 500, color: 'var(--text-quaternary)', marginLeft: 5 }}>{count}</span>
            </span>
          )}
        </div>
        {!editing && (
          <button
            onClick={e => { e.stopPropagation(); onToggleMenu(); }}
            aria-label="프로젝트 더보기"
            title="더보기"
            aria-expanded={menuOpen}
            style={{
              width: 24, height: 24, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: menuOpen ? 'var(--bg-active)' : 'transparent',
              border: 'none', borderRadius: 6,
              cursor: 'pointer', color: 'var(--text-tertiary)',
            }}
          >
            <MoreVertical size={14} />
          </button>
        )}
      </div>

      {menuOpen && !editing && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            marginTop: 6,
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            background: 'var(--bg-surface)',
            overflow: 'hidden',
            cursor: 'default',
          }}
        >
          <MenuItem icon={<Pencil size={13} />} label="이름 변경" onClick={onStartEdit} />
          <MenuItem icon={<Trash2 size={13} />} label="삭제" danger onClick={onDelete} />
        </div>
      )}
    </div>
  );
}

// ── 공용 소품 ───────────────────────────────────────────────────

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
        width: 20, height: 20,
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

function SectionHeader({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
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
        {label}
      </span>
      {action}
    </div>
  );
}

function InlineNameInput({
  placeholder, onSubmit, onCancel,
}: {
  placeholder: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      placeholder={placeholder}
      onClick={e => e.stopPropagation()}
      onBlur={() => { draft.trim() ? onSubmit(draft) : onCancel(); }}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); onSubmit(draft); }
        if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      }}
      style={{
        width: '100%', fontSize: 12, fontWeight: 500,
        padding: '5px 8px', marginBottom: 4,
        border: '1px solid var(--border-focus)', borderRadius: 6,
        background: 'var(--bg-surface)', color: 'var(--text-primary)',
        outline: 'none', fontFamily: 'inherit',
      }}
    />
  );
}

function EmptyHint({ children, indent }: { children: React.ReactNode; indent?: boolean }) {
  return (
    <div style={{
      fontSize: 11, color: 'var(--text-quaternary)',
      padding: '6px 4px', paddingLeft: indent ? 22 : 4, lineHeight: 1.5,
    }}>
      {children}
    </div>
  );
}

function MenuItem({
  icon, label, onClick, danger, indent, trailing,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
  indent?: boolean; trailing?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', minHeight: 34,
        display: 'flex', alignItems: 'center', gap: 8,
        padding: indent ? '7px 10px 7px 24px' : '7px 10px',
        background: 'transparent', border: 'none',
        fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
        color: danger ? 'var(--state-error-text)' : 'var(--text-secondary)',
        cursor: 'pointer', textAlign: 'left',
      }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      {icon}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {trailing}
    </button>
  );
}

function groupByDate(entries: HistoryEntry[]): Record<DateGroup, HistoryEntry[]> {
  const groups: Record<DateGroup, HistoryEntry[]> = {
    today: [], yesterday: [], week: [], older: [],
  };
  for (const e of entries) {
    groups[historyStore.dateGroupOf(e.timestamp)].push(e);
  }
  return groups;
}
