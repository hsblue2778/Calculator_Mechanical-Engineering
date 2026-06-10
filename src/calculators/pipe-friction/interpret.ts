// 관마찰손실 — 결과 해석 (경고·마찰계수 적용식 라벨)
// 신규 엔진(PipeFrictionResult) 전용. analysis.ts의 warnings()는 pipe-sizing이 공유하므로 불변 유지.

import type { WarningItem } from '../../components/WarningList';
import type { FMethod, PipeFrictionResult } from './engine.ts';

export function fMethodLabel(m: FMethod): string {
  switch (m) {
    case 'laminar':      return '층류 64/Re';
    case 'interpolated': return '천이 보간';
    case 'colebrook':    return 'Colebrook-White';
    case 'override':     return '수동 입력';
  }
}

export function pfWarnings(res: PipeFrictionResult, isWater: boolean): WarningItem[] {
  const ws: WarningItem[] = [];
  const V = res.V_ms;
  const unitLossPa = res.deltaP_per_m_Pa;

  if (isWater) {
    // 물 배관 실무 권장 범위 — analysis.ts RANGES와 동일 기준
    if (V > 3.0)      ws.push({ level: 'error', title: '유속 과다', msg: `${V.toFixed(2)} m/s — 소음·에로젼·수격 위험` });
    else if (V > 2.5) ws.push({ level: 'warn',  title: '유속 높음', msg: `${V.toFixed(2)} m/s — 2.5 m/s 초과` });
    if (V < 0.6)      ws.push({ level: 'warn',  title: '저유속',    msg: `${V.toFixed(2)} m/s — 침전·공기정체 우려` });

    if (unitLossPa > 400)      ws.push({ level: 'warn', title: '단위손실 과다', msg: `${unitLossPa.toFixed(0)} Pa/m — 펌프 동력 낭비. 관경 상향 검토.` });
    else if (unitLossPa < 100) ws.push({ level: 'info', title: '단위손실 여유', msg: `${unitLossPa.toFixed(0)} Pa/m — 관경 축소 검토 가능` });
  } else {
    ws.push({ level: 'info', title: '권장 범위 미적용', msg: '유속·단위손실 권장 범위와 게이지는 물 배관 기준 — 현재 유체에는 적용하지 않습니다.' });
  }

  if (res.fMethod === 'laminar') {
    ws.push({ level: 'info', title: '층류 유동', msg: `f = 64/Re 자동 적용 (Re = ${res.Re.toFixed(0)})` });
  }
  if (res.fMethod === 'interpolated') {
    ws.push({ level: 'warn', title: '천이역 불확정 구간', msg: 'Re 2,300~4,000은 확정 공식이 없어 층류·난류 끝값의 3차 보간값입니다. 신뢰도가 낮으므로 유속·관경 조정을 권장합니다.' });
  }
  if (res.fMethod === 'override') {
    ws.push({ level: 'info', title: '수동 마찰계수 적용 중', msg: `f = ${res.f} — 영역별 자동 산출(Colebrook-White 등)을 사용하지 않습니다.` });
  }
  if (!res.fConverged) {
    ws.push({ level: 'error', title: 'Colebrook 미수렴', msg: 'Newton 반복이 수렴하지 않아 Swamee-Jain 근사값으로 대체했습니다. 입력값을 확인하세요.' });
  }
  if (res.relRough > 0.05) {
    ws.push({ level: 'warn', title: '상대조도 범위 초과', msg: `ε/D = ${res.relRough.toFixed(4)} — Moody 선도 적용 범위(≤0.05)를 벗어났습니다.` });
  }

  return ws;
}
