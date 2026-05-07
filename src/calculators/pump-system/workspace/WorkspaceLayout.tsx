// 펌프 시스템 워크스페이스 레이아웃 — 3-pane (Stepper · Main · StickyResults)
// 스크롤 리스너는 Modal 본문(closest scrollable ancestor)에 등록.

import { useEffect, useRef, useState } from 'react';
import SectionStepper, { type SectionItem } from './SectionStepper';
import StickyResults from './StickyResults';
import type { PumpHvacResult } from '../calc';
import type { PowerUnitKey } from '../units';

/** mainRef 엘리먼트에서 부모 방향으로 올라가며 실제 스크롤하는 ancestor를 모두 수집 */
function collectScrollableAncestors(el: HTMLElement | null): HTMLElement[] {
  const out: HTMLElement[] = [];
  let cur = el?.parentElement ?? null;
  while (cur) {
    const oy = getComputedStyle(cur).overflowY;
    if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') out.push(cur);
    cur = cur.parentElement;
  }
  return out;
}

interface Props {
  sections: SectionItem[];
  result: PumpHvacResult | null;
  headMarginPct: number;
  npshMargin: number;
  powerUnit: PowerUnitKey;
  children: React.ReactNode;       // 메인 본문 — 각 섹션은 id={section.id} 로 감싼 div
}

export default function WorkspaceLayout({
  sections, result, headMarginPct, npshMargin, powerUnit, children,
}: Props) {
  const mainRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');

  function jumpTo(id: string) {
    setActiveId(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // 스크롤 위치 기반 활성 섹션 추적
  // 실제 스크롤 컨테이너는 레이아웃에 따라 다름(워크스페이스: window, Modal: 본문 div).
  // 모든 overflow:auto/scroll ancestor + window에 리스너 부착해 어느 쪽이 스크롤해도 추적.
  useEffect(() => {
    const ids = sections.map(s => s.id);
    const handler = () => {
      let candidate = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120) candidate = id;
      }
      setActiveId(prev => prev !== candidate ? candidate : prev);
    };
    handler();
    const ancestors = collectScrollableAncestors(mainRef.current);
    const targets: (HTMLElement | Window)[] = [...ancestors, window];
    targets.forEach(t => t.addEventListener('scroll', handler, { passive: true }));
    return () => {
      targets.forEach(t => t.removeEventListener('scroll', handler));
    };
  }, [sections]);

  return (
    <div className="pump-workspace" style={{ display: 'flex', minHeight: 0, gap: 0 }}>
      <SectionStepper items={sections} activeId={activeId} onJump={jumpTo} />
      <main
        ref={mainRef}
        style={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column', gap: 16,
          paddingRight: 8,
        }}
      >
        {children}
      </main>
      <StickyResults
        result={result}
        headMarginPct={headMarginPct}
        npshMargin={npshMargin}
        powerUnit={powerUnit}
      />
    </div>
  );
}
