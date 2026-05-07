// 계산 기록 저장소 — localStorage 기반, 계산기별 분리
// key 형식: calc-history:<calculatorId>
//
// 스키마 버전 — 입력 형식이 바뀌면 CURRENT_HISTORY_VERSION 을 올린다.
// 읽을 때 version 이 다르면 조용히 건너뛴다 (구버전 기록은 별도 마이그레이션
// 함수가 추가되기 전까지는 무시). 새로 저장되는 항목엔 항상 현재 버전이 박힘.
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
}

const MAX_ENTRIES = 15;

function storageKey(calculatorId: string): string {
  return `calc-history:${calculatorId}`;
}

function readAll(calculatorId: string): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(calculatorId));
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

function writeAll(calculatorId: string, entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(storageKey(calculatorId), JSON.stringify(entries));
  } catch {
    // localStorage 용량 초과 등 — 조용히 실패 (UX는 유지)
  }
}

export function list(calculatorId: string): HistoryEntry[] {
  return readAll(calculatorId).sort((a, b) => b.timestamp - a.timestamp);
}

export function load(id: string, calculatorId: string): HistoryEntry | null {
  return readAll(calculatorId).find(e => e.id === id) ?? null;
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
}

export function save(params: SaveParams): HistoryEntry {
  const entries = readAll(params.calculatorId);
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
  };
  entries.push(entry);
  // FIFO — 15개 초과 시 timestamp 가장 오래된 것부터 제거
  entries.sort((a, b) => b.timestamp - a.timestamp);
  const trimmed = entries.slice(0, MAX_ENTRIES);
  writeAll(params.calculatorId, trimmed);
  return entry;
}

export function updateTitle(id: string, calculatorId: string, newTitle: string): void {
  const entries = readAll(calculatorId);
  const idx = entries.findIndex(e => e.id === id);
  if (idx < 0) return;
  entries[idx] = { ...entries[idx], title: newTitle };
  writeAll(calculatorId, entries);
}

export function remove(id: string, calculatorId: string): void {
  const entries = readAll(calculatorId).filter(e => e.id !== id);
  writeAll(calculatorId, entries);
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
