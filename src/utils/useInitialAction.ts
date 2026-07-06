// 기록 ⋯ 메뉴에서 진입 시 마운트 직후 1회 실행할 내보내기·체이닝 액션 훅
// (기록 로드 → 계산기 remount → 결과 준비되면 run(action) 1회 실행 → done()으로 소비 알림)

import { useEffect, useRef } from 'react';

export function useInitialAction(
  action: string | undefined,
  ready: boolean,
  run: (action: string) => void,
  done?: () => void,
) {
  const ran = useRef(false);
  useEffect(() => {
    if (!action || ran.current || !ready) return;
    ran.current = true;
    run(action);
    done?.();
  }, [action, ready, run, done]);
}
