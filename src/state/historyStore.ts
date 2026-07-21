// 계산 기록 저장소 — localStorage 기반, 전 계산기 통합
// key 형식: calc-records:v2 (기록 전체), calc-projects:v1 (프로젝트)
// 구버전 calc-history:<calculatorId> 키는 최초 접근 시 1회 병합 마이그레이션 (원본 보존)
//
// 스키마 버전 — 입력 형식이 바뀌면 CURRENT_HISTORY_VERSION 을 올린다.
// 읽을 때 version 이 다르면 조용히 건너뛴다 (구버전 기록은 별도 마이그레이션
// 함수가 추가되기 전까지는 무시). 새로 저장되는 항목엔 항상 현재 버전이 박힘.
// 저장 레이아웃 버전은 키 이름(:v2)에 있음 — version 필드는 inputs 스키마 전용.
export const CURRENT_HISTORY_VERSION = 1;

export interface HistoryEntry {
  id: string;
  calculatorId: string;
  title: string;
  timestamp: number;
  version: number;
  inputs: Record<string, any>;
  outputs: Record<string, any> | null;
  parentEntryId?: string;
  kind?: 'session' | 'snapshot';   // 없으면 'snapshot' 취급 (레거시 호환)
  pinned?: boolean;
  projectId?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
}

const RECORDS_KEY = 'calc-records:v2';
const PROJECTS_KEY = 'calc-projects:v1';
const LEGACY_PREFIX = 'calc-history:';
// 최근 항목(비고정·프로젝트 미소속) 보관 상한 — 초과 시 오래된 것부터 제거
const MAX_RECENT = 50;

// 레거시 계산기별 키 → 통합 키 1회 병합 (calc-records:v2 부재 시에만 실행)
// 트림 없음 — 기존 기록은 전부 보존. 레거시 키도 지우지 않음 (마이그레이션 버그 대비).
function migrateIfNeeded(): void {
  if (localStorage.getItem(RECORDS_KEY) !== null) return;
  const merged: HistoryEntry[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(LEGACY_PREFIX)) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) ?? '');
      if (!Array.isArray(parsed)) continue;
      for (const e of parsed) {
        if (e && typeof e === 'object' && e.version === CURRENT_HISTORY_VERSION) {
          merged.push({ ...e, kind: e.kind ?? 'snapshot' });
        }
      }
    } catch {
      // 깨진 레거시 키는 건너뜀
    }
  }
  merged.sort((a, b) => b.timestamp - a.timestamp);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(merged));
}

function readAllRecords(): HistoryEntry[] {
  try {
    migrateIfNeeded();
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 버전 미일치 항목은 조용히 제외 — 깨진 형식의 결과를 복원하지 않기 위함
    return parsed.filter((e): e is HistoryEntry =>
      e && typeof e === 'object' && e.version === CURRENT_HISTORY_VERSION
    );
  } catch {
    return [];
  }
}

function writeAllRecords(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(entries));
  } catch {
    // localStorage 용량 초과 등 — 조용히 실패 (UX는 유지)
  }
}

// 고정·프로젝트 소속 기록은 제외하고, 나머지 중 최신 MAX_RECENT 개만 유지
function trimRecent(entries: HistoryEntry[]): HistoryEntry[] {
  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
  let recentCount = 0;
  return sorted.filter(e => {
    if (e.pinned || e.projectId) return true;
    recentCount++;
    return recentCount <= MAX_RECENT;
  });
}

export function list(calculatorId: string): HistoryEntry[] {
  return readAllRecords()
    .filter(e => e.calculatorId === calculatorId)
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function listAll(): HistoryEntry[] {
  return readAllRecords().sort((a, b) => b.timestamp - a.timestamp);
}

export function load(id: string): HistoryEntry | null {
  return readAllRecords().find(e => e.id === id) ?? null;
}

// 같은 baseTitle 을 가진 기록 수를 세어 (N) suffix 부여
function resolveUniqueTitle(entries: HistoryEntry[], baseTitle: string): string {
  const existingSameBase = entries
    .map(e => e.title)
    .filter(t => t === baseTitle || t.startsWith(`${baseTitle} (`));
  if (existingSameBase.length === 0) return baseTitle;
  // 기존 "(N)" 중 최대 숫자 추출
  let maxN = 0;
  for (const t of existingSameBase) {
    const m = t.match(/ \((\d+)\)$/);
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
  }
  return `${baseTitle} (${maxN + 1})`;
}

export interface SaveParams {
  calculatorId: string;
  baseTitle: string;                      // 계산기 메타의 title
  inputs: Record<string, any>;
  outputs: Record<string, any> | null;
  parentEntryId?: string;
  kind?: 'session' | 'snapshot';          // 기본 'snapshot' (수동 저장)
}

export function save(params: SaveParams): HistoryEntry {
  const entries = readAllRecords();
  const title = resolveUniqueTitle(entries, params.baseTitle);
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    calculatorId: params.calculatorId,
    title,
    timestamp: Date.now(),
    version: CURRENT_HISTORY_VERSION,
    inputs: params.inputs,
    outputs: params.outputs,
    parentEntryId: params.parentEntryId,
    kind: params.kind ?? 'snapshot',
  };
  entries.push(entry);
  writeAllRecords(trimRecent(entries));
  return entry;
}

// 세션 자동기록 갱신 — 같은 기록의 inputs/outputs/timestamp 만 교체
export function updateEntry(
  id: string,
  patch: { inputs: Record<string, any>; outputs: Record<string, any> | null; timestamp: number },
): void {
  const entries = readAllRecords();
  const idx = entries.findIndex(e => e.id === id);
  if (idx < 0) return;
  entries[idx] = { ...entries[idx], ...patch };
  writeAllRecords(trimRecent(entries));
}

export function updateTitle(id: string, newTitle: string): void {
  const entries = readAllRecords();
  const idx = entries.findIndex(e => e.id === id);
  if (idx < 0) return;
  entries[idx] = { ...entries[idx], title: newTitle };
  writeAllRecords(entries);
}

export function remove(id: string): void {
  writeAllRecords(readAllRecords().filter(e => e.id !== id));
}

export function setPinned(id: string, pinned: boolean): void {
  const entries = readAllRecords();
  const idx = entries.findIndex(e => e.id === id);
  if (idx < 0) return;
  entries[idx] = { ...entries[idx], pinned: pinned || undefined };
  writeAllRecords(entries);
}

export function setProject(id: string, projectId: string | undefined): void {
  const entries = readAllRecords();
  const idx = entries.findIndex(e => e.id === id);
  if (idx < 0) return;
  entries[idx] = { ...entries[idx], projectId };
  writeAllRecords(entries);
}

// ── 프로젝트 ─────────────────────────────────────────────────────

function readProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is Project =>
      p && typeof p === 'object' && typeof p.id === 'string' && typeof p.name === 'string'
    );
  } catch {
    return [];
  }
}

function writeProjects(projects: Project[]): void {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch {
    // 조용히 실패
  }
}

export function listProjects(): Project[] {
  return readProjects().sort((a, b) => b.createdAt - a.createdAt);
}

export function createProject(name: string): Project {
  const project: Project = { id: crypto.randomUUID(), name, createdAt: Date.now() };
  writeProjects([...readProjects(), project]);
  return project;
}

export function renameProject(id: string, name: string): void {
  writeProjects(readProjects().map(p => p.id === id ? { ...p, name } : p));
}

// 프로젝트만 삭제 — 소속 기록은 지우지 않고 미소속(최근 항목)으로 되돌림
export function removeProject(id: string): void {
  writeProjects(readProjects().filter(p => p.id !== id));
  const entries = readAllRecords();
  let changed = false;
  const cleared = entries.map(e => {
    if (e.projectId !== id) return e;
    changed = true;
    return { ...e, projectId: undefined };
  });
  if (changed) writeAllRecords(cleared);
}

// 상대 시간 문자열 — "방금 전", "2분 전", "3시간 전", "어제", "N일 전", "YYYY-MM-DD"
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diffMs = now - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return '방금 전';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return '어제';
  if (diffDay < 7) return `${diffDay}일 전`;
  const d = new Date(timestamp);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// 날짜 그룹 — 오늘 / 어제 / 지난 7일 / 그 이전
export type DateGroup = 'today' | 'yesterday' | 'week' | 'older';

export function dateGroupOf(timestamp: number, now: number = Date.now()): DateGroup {
  const d = new Date(timestamp);
  const nowDate = new Date(now);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const todayStart = startOfDay(nowDate);
  const yesterdayStart = todayStart - 86400 * 1000;
  const weekStart = todayStart - 7 * 86400 * 1000;
  const ts = d.getTime();
  if (ts >= todayStart) return 'today';
  if (ts >= yesterdayStart) return 'yesterday';
  if (ts >= weekStart) return 'week';
  return 'older';
}
