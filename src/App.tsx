// 루트 — 홈(카드 그리드) ↔ 워크스페이스(풀페이지 + 인스턴스 사이드바) 전환
// v5 디자인 토큰 기반. 다크모드 토글은 useTheme.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { calculators } from './config/calculators';
import type { CalculatorMeta, CardTabKey, FieldContext } from './config/calculators';
import CalculatorCard from './components/CalculatorCard';
import AppHeader from './components/AppHeader';
import Onboarding from './components/Onboarding';
import Modal from './components/Modal';
import WorkspaceSidebar, { type WorkspaceInstance } from './components/WorkspaceSidebar';
import HistoryPanel from './components/HistoryPanel';
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

type TabKey = CardTabKey | 'calculator';

type CalculatorComponentProps = {
  initialTab?: TabKey;
  initialState?: Record<string, any>;
  onSave?: (ctx: FieldContext) => void;
  onChain?: (calculatorId: string, initialState: Record<string, any>) => void;
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
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const activeInstance = instances.find(i => i.id === activeId) ?? null;
  const activeCalc = activeInstance ? calculators.find(c => c.id === activeInstance.calculatorId) : null;
  const ActiveComponent = activeInstance ? calculatorComponents[activeInstance.calculatorId] : null;

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
    setView('workspace');
  }

  function addInstance() {
    if (!activeInstance) return;
    const inst: WorkspaceInstance = {
      id: genId(),
      calculatorId: activeInstance.calculatorId,
      name: activeCalc?.title ?? activeInstance.name,
    };
    setInstances(prev => [...prev, inst]);
    setActiveId(inst.id);
  }

  function selectInstance(id: string) {
    setActiveId(id);
  }

  function renameInstance(id: string, name: string) {
    setInstances(prev => prev.map(i => i.id === id ? { ...i, name } : i));
  }

  function removeInstance(id: string) {
    setInstances(prev => {
      const filtered = prev.filter(i => i.id !== id);
      if (filtered.length === 0) {
        // 마지막 인스턴스 제거 → 홈으로
        setView('home');
        setActiveId(null);
        return [];
      }
      if (id === activeId) setActiveId(filtered[0].id);
      return filtered;
    });
    setInstanceInitialStates(prev => {
      if (!(id in prev)) return prev;
      const { [id]: _omit, ...rest } = prev;
      return rest;
    });
    setCurrentEntryByInstance(prev => {
      if (!(id in prev)) return prev;
      const { [id]: _omit, ...rest } = prev;
      return rest;
    });
  }

  function goHome() {
    setView('home');
    setActiveId(null);
    setInstances([]);
  }

  function handleUnitSystemChange(next: UnitSystem) {
    if (next === unitSystem) return;
    if (window.confirm('단위계를 변경하면 모든 입력값이 초기화됩니다. 계속할까요?')) {
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

  // 기록 항목 불러오기 — 현재 활성 인스턴스의 상태를 교체 + remount 강제
  // (인스턴스 섹션을 숨긴 화면에서 누적 인스턴스가 안 쌓이도록 하기 위함)
  const handleLoadEntry = useCallback((entry: HistoryEntry) => {
    if (!activeInstance) return;
    setInstances(prev => prev.map(i =>
      i.id === activeInstance.id ? { ...i, name: entry.title } : i
    ));
    setInstanceInitialStates(prev => ({ ...prev, [activeInstance.id]: entry.inputs }));
    setInstanceLoadEpoch(prev => ({ ...prev, [activeInstance.id]: (prev[activeInstance.id] ?? 0) + 1 }));
    setCurrentEntryByInstance(prev => ({ ...prev, [activeInstance.id]: entry.id }));
  }, [activeInstance]);

  // 비교 진입 (HistoryPanel onCompare → 선택된 entries 로드)
  // 비교 후 selection은 즉시 리셋 — 다음 비교 세션이 깨끗한 상태에서 시작되도록
  const handleStartCompare = useCallback(() => {
    if (!activeCalc) return;
    const entries = selectedHistoryIds
      .map(id => historyStore.load(id, activeCalc.id))
      .filter((e): e is HistoryEntry => e !== null);
    if (entries.length < 2) return;
    setCompareEntries(entries);
    setSelectedHistoryIds([]);
  }, [selectedHistoryIds, activeCalc]);

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

  // 모든 계산기에서 사이드바 기록 활성화 (인스턴스 섹션 숨김)
  const supportsHistory = !!activeCalc;
  // 펌프 시스템 계열만 비교 기능 활성화 (다른 계산기는 비교 모드 미지원)
  const supportsCompare = activeCalc?.id === 'pump-hvac';

  // 홈 화면
  if (view === 'home') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)' }}>
        <AppHeader
          theme={theme}
          onThemeChange={setTheme}
          onShowOnboarding={() => setOnboardingOpen(true)}
          unitSystem={unitSystem}
          onUnitSystemChange={handleUnitSystemChange}
        />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 60px' }}>
          {/* 타이틀 + 검색 */}
          <header style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, letterSpacing: -0.4 }}>
              기계설비 설계 도구
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 6, maxWidth: 640 }}>
              한국 실무 표준에 맞춘 펌프·배관 통합 설계. 카드를 눌러 워크스페이스를 시작하세요.
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
                placeholder="계산기 검색..."
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
        </div>

        <style>{`
          .calc-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
          }
          @media (max-width: 1024px) { .calc-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 640px)  { .calc-grid { grid-template-columns: 1fr; } }
        `}</style>

        <ChangelogButton onClick={() => setShowChangelog(true)} />
        {showChangelog && (
          <Modal title="패치노트" onClose={() => setShowChangelog(false)}>
            <ChangelogContent />
          </Modal>
        )}
        <Onboarding open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
      </div>
    );
  }

  // 워크스페이스 화면
  return (
    <div style={{ height: '100vh', backgroundColor: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}>
      <AppHeader
        theme={theme}
        onThemeChange={setTheme}
        onShowOnboarding={() => setOnboardingOpen(true)}
        unitSystem={unitSystem}
        onUnitSystemChange={handleUnitSystemChange}
        currentField={activeCalc?.title}
        onHome={goHome}
        onMobileMenuToggle={() => setMobileSidebarOpen(o => !o)}
        hideTools
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        <WorkspaceSidebar
          instances={instances}
          activeId={activeId}
          onSelect={selectInstance}
          onAdd={addInstance}
          onRename={renameInstance}
          onRemove={removeInstance}
          hideInstances={supportsHistory}
          mobileOpen={mobileSidebarOpen}
          onMobileItemSelect={() => setMobileSidebarOpen(false)}
          extraPanel={
            supportsHistory && activeCalc ? (
              <HistoryPanel
                calculatorId={activeCalc.id}
                refreshKey={historyRefreshKey}
                onLoadEntry={(entry) => { handleLoadEntry(entry); setMobileSidebarOpen(false); }}
                onChanged={handleHistoryChanged}
                selectable={supportsCompare}
                selectedIds={selectedHistoryIds}
                onToggleSelect={toggleHistorySelect}
                maxSelect={4}
                onCompare={handleStartCompare}
                onCompareToggleChange={handleCompareToggleChange}
                currentEntryId={activeInstance ? currentEntryByInstance[activeInstance.id] : undefined}
                variant="sidebar"
              />
            ) : undefined
          }
        />

        <div
          className={`workspace-overlay${mobileSidebarOpen ? ' is-open' : ''}`}
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden
        />

        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          {activeInstance && ActiveComponent && (
            <div className="workspace-main" style={{ padding: '20px 24px 60px' }}>
              <ActiveComponent
                key={`${activeInstance.id}-${unitSystem}-${instanceLoadEpoch[activeInstance.id] ?? 0}`}
                initialTab="calculator"
                initialState={instanceInitialStates[activeInstance.id]}
                onSave={handleSave}
                onChain={openCalculatorWithState}
              />
            </div>
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
