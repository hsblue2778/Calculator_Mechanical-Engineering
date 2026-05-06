// 단위계 영구화 — localStorage 기반
// 우선순위: localStorage('v5-unit-system') → 'kr'
// themeStore 패턴 복제. DOM 속성 즉시 반영 불필요(테마와 달리 FOUC 없음).

import { useEffect, useState } from 'react';

export type UnitSystem = 'kr' | 'us';
const STORAGE_KEY = 'v5-unit-system';

function readStored(): UnitSystem | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'kr' || v === 'us' ? v : null;
  } catch { return null; }
}

function detectInitial(): UnitSystem {
  return readStored() ?? 'kr';
}

function persist(us: UnitSystem) {
  try { localStorage.setItem(STORAGE_KEY, us); } catch { /* ignore */ }
}

export function useUnitSystem(): [UnitSystem, (next: UnitSystem) => void] {
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(() => detectInitial());
  useEffect(() => { persist(unitSystem); }, [unitSystem]);
  return [unitSystem, setUnitSystemState];
}
