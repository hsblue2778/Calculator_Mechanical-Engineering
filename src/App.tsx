// 루트 — 홈(카드 그리드) ↔ 워크스페이스(계산기) 전환, 전역 사이드바 공통
// v5 디자인 토큰 기반. 다크모드 토글은 useTheme.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, History } from 'lucide-react';
import { calculators } from './config/calculators';
import type { CalculatorMeta, FieldContext } from './config/calculators';
import CalculatorCard from './components/CalculatorCard';
import AppHeader from './components/AppHeader';
import Onboarding from './components/Onboarding';
import Modal from './components/Modal';
import GlobalSidebar, { type EntryAction } from './components/GlobalSidebar';
import ExamplePicker from './components/ExamplePicker';
import { EXAMPLE_PRESETS, type ExamplePreset } from './config/examples';
import * as historyStore from './state/historyStore';
import type { HistoryEntry } from './state/historyStore';
import PipeFrictionCalculator from './calculators/pipe-friction';
import PipeSizingCalculator from './calculators/pipe-sizing';
import FrictionNetworkCalculator from './calculators/friction-network';
import PumpSystemCalculator from './calculators/pump-system';
import InsulationThicknessCalculator from './calculators/insulation-thickness';
import ComparisonView from './calculators/pump-system/tabs/ComparisonView';
import ChangelogButton from './components/ChangelogButton';
import ChangelogContent from './components/ChangelogContent';
import { useTheme } from './state/themeStore';
import { useUnitSystem } from './state/unitSystemStore';
import type { UnitSystem } from './state/unitSystemStore';

interface WorkspaceInstance {
  id: string;
  calculatorId: string;
  name: string;
}

type CalculatorComponentProps = {
  initialState?: Record<string, any>;
  onSave?: (ctx: FieldContext) => void;
  // 자동기록 — 렌더마다 현재 입력·결과를 보고 (중복 제거·디바운스는 App 담당)
  onStateChange?: (ctx: FieldContext) => void;
  onChain?: (calculatorId: string, initialState: Record<string, any>) => void;
  // 기록 ⋯ 메뉴에서 진입 시 마운트 직후 1회 실행할 내보내기·체이닝 액션
  initialAction?: EntryAction;
  onInitialActionDone?: () => void;
};

const calculatorComponents: Record<string, React.ComponentType<CalculatorComponentProps>> = {
  'pipe-friction': PipeFrictionCalculator,
  'pipe-sizing': PipeSizingCalculator,
  'friction-network': FrictionNetworkCalculator,
  'pump-hvac': (props: CalculatorComponentProps) => <PumpSystemCalculator field="hvac" {...props} />,
  'insulation-thickness': InsulationThicknessCalculator,
};

function genId(): string {
  return 'inst-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// 기록 ⋯ 메뉴에 노출할 내보내기·체이닝 액션 — 전 계산기 CSV·Word·PDF 지원
const ENTRY_EXPORT_ACTIONS: Record<string, EntryAction[]> = {
  'pipe-friction': ['csv', 'word', 'pdf', 'chain'],
  'pipe-sizing': ['csv', 'word', 'pdf'],
  'insulation-thickness': ['csv', 'word', 'pdf'],
  'pump-hvac': ['csv', 'word', 'pdf'],
  'friction-network': ['csv', 'word', 'pdf'],
};

export default function App() {
  const [theme, setTheme] = useTheme();
  const [unitSystem, setUnitSystem] = useUnitSystem();
  const [view, setView] = useState<'home' | 'workspace'>('home');
  const [instances, setInstances] = useState<WorkspaceInstance[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showChangelog, setShowChangelog] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // 비교 모달 상태 (pump-hvac 등 펌프 시스템 계열 한정 사용)
  const [compareEntries, setCompareEntries] = useState<HistoryEntry[] | null>(null);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  // 인스턴스별 초기상태 (기록에서 불러온 경우만 채워짐)
  const [instanceInitialStates, setInstanceInitialStates] = useState<Record<string, Record<string, any>>>({});
  // 인스턴스별 로드 epoch — 기록을 다시 불러오면 ++해서 ActiveComponent를 강제 remount (initialState 재반영)
  const [instanceLoadEpoch, setInstanceLoadEpoch] = useState<Record<string, number>>({});
  // 인스턴스별 "현재 보고 있는 기록 ID" — 사이드바에서 시각 강조용
  const [currentEntryByInstance, setCurrentEntryByInstance] = useState<Record<string, string>>({});
  // 인스턴스별 "마운트 직후 실행할 액션" — 기록 ⋯ 메뉴의 내보내기·체이닝 (1회 소비 후 제거)
  const [instanceInitialAction, setInstanceInitialAction] = useState<Record<string, EntryAction>>({});
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const activeInstance = instances.find(i => i.id === activeId) ?? null;
  const activeCalc = activeInstance ? calculators.find(c => c.id === activeInstance.calculatorId) : null;
  const ActiveComponent = activeInstance ? calculatorComponents[activeInstance.calculatorId] : null;

  // 브라우저 히스토리 연동 — popstate 핸들러가 최신 값을 참조하도록 ref로 미러링
  const viewRef = useRef(view);
  const drawerRef = useRef(mobileSidebarOpen);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { drawerRef.current = mobileSidebarOpen; }, [mobileSidebarOpen]);

  // 검색 필터 (홈)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return calculators;
    return calculators.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.inputs.toLowerCase().includes(q) ||
      c.outputs.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = new Map<string, CalculatorMeta[]>();
    filtered.forEach(c => {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category)!.push(c);
    });
    return Array.from(map.entries());
  }, [filtered]);

  // 워크스페이스 진입 시 히스토리 항목 관리 — 홈에서는 push(뒤로가기로 복귀),
  // 이미 워크스페이스면 replace(항목 1개만 유지)
  function pushWorkspaceHistory() {
    if (viewRef.current === 'workspace') {
      window.history.replaceState({ screen: 'workspace' }, '');
    } else {
      window.history.pushState({ screen: 'workspace' }, '');
    }
  }

  function openCalculator(calculatorId: string) {
    const calc = calculators.find(c => c.id === calculatorId);
    if (!calc) return;
    const inst: WorkspaceInstance = {
      id: genId(),
      calculatorId,
      name: calc.title,
    };
    setInstances([inst]);
    setActiveId(inst.id);
    pushWorkspaceHistory();
    setView('workspace');
  }

  // 체이닝 — 다른 계산기를 초기 입력값과 함께 열어 현재 계산기를 교체
  function openCalculatorWithState(calculatorId: string, initialState: Record<string, any>) {
    const calc = calculators.find(c => c.id === calculatorId);
    if (!calc) return;
    const inst: WorkspaceInstance = {
      id: genId(),
      calculatorId,
      name: calc.title,
    };
    setInstances([inst]);
    setActiveId(inst.id);
    setInstanceInitialStates(prev => ({ ...prev, [inst.id]: initialState }));
    pushWorkspaceHistory();
    setView('workspace');
  }

  // 홈으로 상태 리셋 (popstate·직접 호출 공용) — 열린 드로어·비교 모달도 함께 정리
  const resetToHome = useCallback(() => {
    setView('home');
    setActiveId(null);
    setInstances([]);
    setMobileSidebarOpen(false);
    setCompareEntries(null);
  }, []);

  // UI 홈 이동 — 히스토리에 워크스페이스 항목이 있으면 back()으로 pop해 popstate가 리셋하도록 위임(일원화)
  function navigateHome() {
    if (window.history.state?.screen === 'workspace') {
      window.history.back();
    } else {
      resetToHome();
    }
  }

  function goHome() {
    navigateHome();
  }

  // 브라우저 뒤로가기 → 앱 내 화면 전환 (마운트 시 1회 등록)
  useEffect(() => {
    if (!window.history.state) window.history.replaceState({ screen: 'home' }, '');
    const onPopState = () => {
      // 1) 모바일 드로어가 열려 있으면 → 드로어만 닫고 현재 화면 유지 (뒤로가기 트랩)
      if (drawerRef.current) {
        setMobileSidebarOpen(false);
        window.history.pushState({ screen: viewRef.current }, '');
        return;
      }
      // 2) 워크스페이스면 → 홈으로 화면 전환
      if (viewRef.current === 'workspace') {
        resetToHome();
        return;
      }
      // 3) 홈이면 → 기본 동작(사이트 이탈) 허용
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [resetToHome]);

  // ── 자동기록 세션 엔진 ──────────────────────────────────────
  // 계산기가 렌더마다 onStateChange로 보고하는 inputs를 관찰:
  //  · 컴포넌트 key 변화(리마운트) → 이전 pending 플러시 후 baseline만 캡처 (쓰기 없음)
  //  · baseline과 동일한 inputs → 무시 (자동저장→refreshKey→재렌더 루프 차단, 필수)
  //  · 변경 → 1s 트레일링 디바운스 후 세션 기록 생성(첫 편집) 또는 갱신
  const autoRef = useRef<{
    key: string | null;             // ActiveComponent의 React key 미러
    instanceId: string | null;
    calculatorId: string | null;
    lastJson: string | null;        // baseline / 마지막 기록 시점의 inputs JSON
    sessionId: string | null;       // 바인딩된 세션 기록 ID (null = 아직 미생성)
    parentEntryId: string | null;   // 스냅샷에서 이어서 작업 시 출처 기록 ID
    timer: number | null;
    pending: FieldContext | null;
  }>({ key: null, instanceId: null, calculatorId: null, lastJson: null, sessionId: null, parentEntryId: null, timer: null, pending: null });
  // 기록 불러오기 시 다음 마운트에 적용할 세션 바인딩 (session=재개, snapshot=새 세션 시드)
  const pendingSessionRef = useRef<{ sessionId: string | null; parentEntryId: string | null } | null>(null);

  const flushAutoSave = useCallback(() => {
    const a = autoRef.current;
    if (a.timer !== null) { clearTimeout(a.timer); a.timer = null; }
    const ctx = a.pending;
    if (!ctx || !a.calculatorId) return;
    a.pending = null;
    // 세션 기록이 삭제·트림됐으면 바인딩 해제 후 새로 생성
    if (a.sessionId && !historyStore.load(a.sessionId)) a.sessionId = null;
    if (a.sessionId) {
      historyStore.updateEntry(a.sessionId, { inputs: ctx.inputs, outputs: ctx.outputs, timestamp: Date.now() });
    } else {
      const calc = calculators.find(c => c.id === a.calculatorId);
      const entry = historyStore.save({
        calculatorId: a.calculatorId,
        baseTitle: calc?.title ?? a.calculatorId,
        inputs: ctx.inputs,
        outputs: ctx.outputs,
        kind: 'session',
        parentEntryId: a.parentEntryId ?? undefined,
      });
      a.sessionId = entry.id;
      if (a.instanceId) {
        const instId = a.instanceId;
        setCurrentEntryByInstance(prev => ({ ...prev, [instId]: entry.id }));
      }
    }
    a.lastJson = JSON.stringify(ctx.inputs);
    setHistoryRefreshKey(k => k + 1);
  }, []);

  const handleStateChange = useCallback((ctx: FieldContext) => {
    if (!activeInstance) return;
    const key = `${activeInstance.id}-${unitSystem}-${instanceLoadEpoch[activeInstance.id] ?? 0}`;
    const a = autoRef.current;
    if (a.key !== key) {
      // 리마운트(새 세션·불러오기·단위계 변경 등) — baseline 캡처만, 기록 생성은 첫 편집부터
      flushAutoSave();
      a.key = key;
      a.instanceId = activeInstance.id;
      a.calculatorId = activeInstance.calculatorId;
      a.lastJson = JSON.stringify(ctx.inputs);
      const pend = pendingSessionRef.current;
      a.sessionId = pend?.sessionId ?? null;
      a.parentEntryId = pend?.parentEntryId ?? null;
      pendingSessionRef.current = null;
      return;
    }
    const json = JSON.stringify(ctx.inputs);
    if (json === a.lastJson) return;
    a.pending = ctx;
    if (a.timer !== null) clearTimeout(a.timer);
    a.timer = window.setTimeout(() => {
      autoRef.current.timer = null;
      flushAutoSave();
    }, 1000);
  }, [activeInstance, unitSystem, instanceLoadEpoch, flushAutoSave]);

  // 브라우저 종료·탭 전환 시 pending 플러시 (localStorage 쓰기는 동기라 pagehide에서 안전)
  useEffect(() => {
    const onPageHide = () => flushAutoSave();
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [flushAutoSave]);

  // 홈 복귀 시 플러시 — 계산기 언마운트 직전 편집(<1s) 유실 방지
  useEffect(() => {
    if (view === 'home') flushAutoSave();
  }, [view, flushAutoSave]);

  function handleUnitSystemChange(next: UnitSystem) {
    if (next === unitSystem) return;
    if (window.confirm('단위계를 변경하면 모든 입력값이 초기화됩니다. 계속할까요?')) {
      // 입력이 초기화되므로 세션 분리 — 이전 세션은 마지막 내용으로 보존
      flushAutoSave();
      autoRef.current.sessionId = null;
      autoRef.current.parentEntryId = null;
      setUnitSystem(next);
    }
  }

  // 저장 — pump-system 등 calc 내부에서 호출. localStorage history에 저장 + 토스트·기록 패널 갱신.
  const handleSave = useCallback((ctx: FieldContext) => {
    if (!activeCalc || !activeInstance) return;
    const entry = historyStore.save({
      calculatorId: activeCalc.id,
      baseTitle: activeCalc.title,
      inputs: ctx.inputs,
      outputs: ctx.outputs,
    });
    setHistoryRefreshKey(k => k + 1);
    setSaveToast(`저장됨 — ${entry.title}`);
    // 방금 저장한 항목이 곧 현재 워크스페이스 상태와 동일 — current로 표시
    setCurrentEntryByInstance(prev => ({ ...prev, [activeInstance.id]: entry.id }));
  }, [activeCalc, activeInstance]);

  // 토스트 자동 닫힘 (2.5s)
  useEffect(() => {
    if (!saveToast) return;
    const t = setTimeout(() => setSaveToast(null), 2500);
    return () => clearTimeout(t);
  }, [saveToast]);

  // 세션 기록은 이어서 갱신(재개), 스냅샷·레거시 기록은 불변 유지 —
  // 첫 편집 시 그 내용을 시드로 새 세션 생성 (parentEntryId 연결)
  const bindSessionForEntry = useCallback((entry: HistoryEntry) => {
    pendingSessionRef.current = entry.kind === 'session'
      ? { sessionId: entry.id, parentEntryId: null }
      : { sessionId: null, parentEntryId: entry.id };
  }, []);

  // 예시 프리셋 불러오기 — 기록 불러오기와 같은 경로(초기상태 교체 + remount)를 쓰되,
  // 기록에 바인딩하지 않음: 예시에서 편집을 시작하면 자동기록이 새 세션을 만든다
  const handleLoadExample = useCallback((preset: ExamplePreset) => {
    if (!activeInstance) return;
    pendingSessionRef.current = null;
    setInstanceInitialStates(prev => ({ ...prev, [activeInstance.id]: structuredClone(preset.state) }));
    setInstanceLoadEpoch(prev => ({ ...prev, [activeInstance.id]: (prev[activeInstance.id] ?? 0) + 1 }));
    setCurrentEntryByInstance(prev => {
      if (!(activeInstance.id in prev)) return prev;
      const rest = { ...prev };
      delete rest[activeInstance.id];
      return rest;
    });
  }, [activeInstance]);

  // 기록 항목 불러오기 (같은 계산기) — 현재 활성 인스턴스의 상태를 교체 + remount 강제
  const handleLoadEntry = useCallback((entry: HistoryEntry) => {
    if (!activeInstance) return;
    bindSessionForEntry(entry);
    setInstances(prev => prev.map(i =>
      i.id === activeInstance.id ? { ...i, name: entry.title } : i
    ));
    setInstanceInitialStates(prev => ({ ...prev, [activeInstance.id]: entry.inputs }));
    setInstanceLoadEpoch(prev => ({ ...prev, [activeInstance.id]: (prev[activeInstance.id] ?? 0) + 1 }));
    setCurrentEntryByInstance(prev => ({ ...prev, [activeInstance.id]: entry.id }));
  }, [activeInstance, bindSessionForEntry]);

  // 기록 열기 (전역 사이드바 공용) — 홈·다른 계산기에서도 해당 계산기로 전환해 복원
  const openEntry = useCallback((entry: HistoryEntry): string => {
    if (activeInstance && activeInstance.calculatorId === entry.calculatorId) {
      handleLoadEntry(entry);
      return activeInstance.id;
    }
    const inst: WorkspaceInstance = {
      id: genId(),
      calculatorId: entry.calculatorId,
      name: entry.title,
    };
    bindSessionForEntry(entry);
    setInstances([inst]);
    setActiveId(inst.id);
    setInstanceInitialStates(prev => ({ ...prev, [inst.id]: entry.inputs }));
    setCurrentEntryByInstance(prev => ({ ...prev, [inst.id]: entry.id }));
    pushWorkspaceHistory();
    setView('workspace');
    return inst.id;
  }, [activeInstance, handleLoadEntry, bindSessionForEntry]);

  // 기록 ⋯ 메뉴 내보내기·체이닝 — 해당 기록을 불러온 뒤 마운트 직후 액션 1회 자동 실행
  const handleEntryAction = useCallback((entry: HistoryEntry, action: EntryAction) => {
    const instId = openEntry(entry);
    setInstanceInitialAction(prev => ({ ...prev, [instId]: action }));
  }, [openEntry]);

  // 계산기가 액션을 소비하면 제거 (remount 시 재실행 방지)
  const handleInitialActionDone = useCallback(() => {
    if (!activeInstance) return;
    setInstanceInitialAction(prev => {
      if (!(activeInstance.id in prev)) return prev;
      const rest = { ...prev };
      delete rest[activeInstance.id];
      return rest;
    });
  }, [activeInstance]);

  // 비교 진입 (사이드바 onCompare → 선택된 entries 로드)
  // 비교 후 selection은 즉시 리셋 — 다음 비교 세션이 깨끗한 상태에서 시작되도록
  const handleStartCompare = useCallback(() => {
    const entries = selectedHistoryIds
      .map(id => historyStore.load(id))
      .filter((e): e is HistoryEntry => e !== null);
    if (entries.length < 2) return;
    setCompareEntries(entries);
    setSelectedHistoryIds([]);
  }, [selectedHistoryIds]);

  const toggleHistorySelect = useCallback((id: string) => {
    setSelectedHistoryIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }, []);

  const handleHistoryChanged = useCallback(() => {
    setHistoryRefreshKey(k => k + 1);
  }, []);

  // 토글 변화 시 selectedIds 즉시 리셋 (stale ID 누적 방지)
  const handleCompareToggleChange = useCallback(() => {
    setSelectedHistoryIds([]);
  }, []);

  // 기록 변화(저장·삭제) 시 selectedIds에서 더 이상 존재하지 않는 ID 자동 제거
  useEffect(() => {
    if (!activeCalc) return;
    const validIds = new Set(historyStore.list(activeCalc.id).map(e => e.id));
    setSelectedHistoryIds(prev => {
      const filtered = prev.filter(id => validIds.has(id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [historyRefreshKey, activeCalc]);

  // 펌프 시스템 계열만 비교 기능 활성화 (다른 계산기는 비교 모드 미지원)
  const supportsCompare = activeCalc?.id === 'pump-hvac';

  return (
    <div className="app-viewport" style={{ backgroundColor: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      <AppHeader
        theme={theme}
        onThemeChange={setTheme}
        onShowOnboarding={() => setOnboardingOpen(true)}
        unitSystem={unitSystem}
        onUnitSystemChange={handleUnitSystemChange}
        onHome={view === 'workspace' ? goHome : undefined}
        onMobileMenuToggle={() => setMobileSidebarOpen(o => !o)}
        hideTools={view === 'workspace'}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        <GlobalSidebar
          refreshKey={historyRefreshKey}
          currentEntryId={activeInstance ? currentEntryByInstance[activeInstance.id] : undefined}
          onNewCalculator={(id) => { openCalculator(id); setMobileSidebarOpen(false); }}
          onOpenEntry={(entry) => { openEntry(entry); setMobileSidebarOpen(false); }}
          onEntryAction={(entry, action) => { handleEntryAction(entry, action); setMobileSidebarOpen(false); }}
          entryActionsByCalc={ENTRY_EXPORT_ACTIONS}
          onChanged={handleHistoryChanged}
          compareEnabled={supportsCompare}
          selectedIds={selectedHistoryIds}
          onToggleSelect={toggleHistorySelect}
          maxSelect={4}
          onCompare={handleStartCompare}
          onCompareToggleChange={handleCompareToggleChange}
          mobileOpen={mobileSidebarOpen}
        />

        <div
          className={`workspace-overlay${mobileSidebarOpen ? ' is-open' : ''}`}
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden
        />

        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          {view === 'home' ? (
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 60px' }}>
              {/* 타이틀 + 검색 */}
              <header style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, letterSpacing: -0.4 }}>
                  MEP Engineering Tools
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 6, maxWidth: 640 }}>
                  한국 실무 표준에 맞춘 기계설비 설계 도구 모음. 카드를 눌러 워크스페이스를 시작하세요.
                </p>

                <div style={{ position: 'relative', marginTop: 18, width: 340, maxWidth: '100%' }}>
                  <Search
                    size={16}
                    style={{
                      position: 'absolute', left: 12, top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-quaternary)', pointerEvents: 'none',
                    }}
                  />
                  <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="도구 검색..."
                    style={{
                      width: '100%',
                      border: '1px solid var(--border-default)',
                      borderRadius: 8,
                      padding: '8px 14px 8px 36px',
                      fontSize: 14,
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                  />
                </div>
              </header>

              {grouped.length === 0 ? (
                <p style={{ color: 'var(--text-quaternary)', fontSize: 14, textAlign: 'center', padding: '64px 0' }}>
                  "{query}"에 해당하는 계산기가 없습니다.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {grouped.map(([category, calcs]) => (
                    <section key={category}>
                      <SectionHeading>{category}</SectionHeading>
                      <div className="calc-grid">
                        {calcs.map(calc => (
                          <CalculatorCard
                            key={calc.id}
                            calculator={calc}
                            onOpen={() => openCalculator(calc.id)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}

              <style>{`
                .calc-grid {
                  display: grid;
                  grid-template-columns: 1fr;
                  gap: 14px;
                }
              `}</style>

              <ChangelogButton onClick={() => setShowChangelog(true)} />
            </div>
          ) : (
            activeInstance && ActiveComponent && (
              <div className="workspace-main" style={{ padding: '20px 24px 60px', position: 'relative' }}>
                {/* 모바일 전용 기록 열기 버튼 (데스크톱은 좌측 사이드바로 접근) */}
                <div className="mobile-history-bar">
                  <button
                    onClick={() => setMobileSidebarOpen(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px', fontSize: 13, fontWeight: 600,
                      color: 'var(--accent-primary-hover)', background: 'var(--accent-primary-bg-soft)',
                      border: '1px solid var(--accent-primary)', borderRadius: 8,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <History size={15} /> 기록
                  </button>
                </div>
                {/* 계산기 식별 헤더 — 어느 계산기에 들어와 있는지 제목·분류·설명으로 표시 */}
                {activeCalc && (
                  <header
                    className="workspace-calc-header"
                    style={{
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                      gap: 12, flexWrap: 'wrap',
                      paddingBottom: 14, marginBottom: 22, borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span
                          aria-hidden
                          style={{ width: 4, height: 20, borderRadius: 2, background: 'var(--accent-primary)', flexShrink: 0 }}
                        />
                        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, letterSpacing: -0.3, wordBreak: 'keep-all' }}>
                          {activeCalc.title}
                        </h1>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                          color: 'var(--accent-primary-hover)', background: 'var(--accent-primary-bg-soft)',
                          border: '1px solid var(--accent-primary-bg)', whiteSpace: 'nowrap',
                        }}>
                          {activeCalc.category}
                        </span>
                      </div>
                      <p style={{ marginTop: 3, paddingLeft: 14, fontSize: 13, lineHeight: 1.5, color: 'var(--text-tertiary)', wordBreak: 'keep-all' }}>
                        {activeCalc.description}
                      </p>
                    </div>
                    {(EXAMPLE_PRESETS[activeCalc.id] ?? []).length > 0 && (
                      <ExamplePicker presets={EXAMPLE_PRESETS[activeCalc.id]} onLoad={handleLoadExample} />
                    )}
                  </header>
                )}
                <ActiveComponent
                  key={`${activeInstance.id}-${unitSystem}-${instanceLoadEpoch[activeInstance.id] ?? 0}`}
                  initialState={instanceInitialStates[activeInstance.id]}
                  onSave={handleSave}
                  onStateChange={handleStateChange}
                  onChain={openCalculatorWithState}
                  initialAction={instanceInitialAction[activeInstance.id]}
                  onInitialActionDone={handleInitialActionDone}
                />
              </div>
            )
          )}
        </main>
      </div>

      {/* 펌프 비교 모달 (선택 후 비교 버튼 클릭 시) */}
      {compareEntries && (
        <Modal
          title={`펌프 비교 (${compareEntries.length}개)`}
          onClose={() => setCompareEntries(null)}
          bodyWidth={Math.min(1100, compareEntries.length * 220 + 200)}
        >
          <ComparisonView
            entries={compareEntries}
            onBack={() => setCompareEntries(null)}
          />
        </Modal>
      )}

      {/* 저장 토스트 */}
      {saveToast && (
        <div
          style={{
            position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)',
            zIndex: 100,
            padding: '10px 18px',
            background: 'var(--state-success-bg)',
            color: 'var(--state-success-text)',
            border: '1px solid var(--state-success)',
            borderRadius: 8, fontSize: 13, fontWeight: 600,
            boxShadow: 'var(--shadow-lg)',
            pointerEvents: 'none',
          }}
        >
          ✓ {saveToast}
        </div>
      )}

      {showChangelog && (
        <Modal title="패치노트" onClose={() => setShowChangelog(false)}>
          <ChangelogContent />
        </Modal>
      )}
      <Onboarding open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)',
      letterSpacing: 0.5, textTransform: 'uppercase',
      margin: '0 0 12px',
    }}>
      {children}
    </h2>
  );
}
