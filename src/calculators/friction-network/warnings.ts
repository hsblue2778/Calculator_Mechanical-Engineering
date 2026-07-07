// 계통 압력손실 — 맥락 경고 목록 구성 (화면 WarningList · 산출서 htmlReport 공용)

import type { WarningItem } from '../../components/WarningList';
import type { FNNetworkResult, FNFlowUnit } from './calc';
import type { FNSuggestion } from './design';

export function buildFnWarnings(
  net: FNNetworkResult, pAvailEntered: boolean,
  suggestions: Record<string, FNSuggestion>,
  designTotalFlow_m3s: number | null, flowUnit: FNFlowUnit,
): WarningItem[] {
  const items: WarningItem[] = [];
  for (const r of net.rows) {
    if (r.error) items.push({ level: 'error', title: `구간 ${r.id || '(ID 없음)'}`, msg: `${r.error} — 이 행은 계산에서 제외되었습니다.` });
  }
  if (pAvailEntered && net.margin_Pa < 0) {
    items.push({
      level: 'error', title: '정압 부족',
      msg: `최대 누적손실+요구압(${Math.round(net.worstDemand_Pa)} Pa)이 설계 가용정압(${Math.round(net.designAvail_Pa)} Pa)을 초과합니다. 관경 확대·경로 단축 또는 팬/펌프 정압 상향이 필요합니다.`,
    });
  }
  // 설계 총유량 ↔ Σ말단유량 대조 (차이 0.5% 초과 시)
  if (designTotalFlow_m3s !== null) {
    const mul = flowUnit === 'LPM' ? 60000 : 3600;
    const relPct = (net.totalLeafFlow_m3s - designTotalFlow_m3s) / designTotalFlow_m3s * 100;
    if (Math.abs(relPct) > 0.5) {
      items.push({
        level: 'warn', title: '설계 총유량 불일치',
        msg: `Σ말단유량 ${(net.totalLeafFlow_m3s * mul).toFixed(1)} ${flowUnit} ≠ 설계 총유량 ${(designTotalFlow_m3s * mul).toFixed(1)} ${flowUnit} (${relPct >= 0 ? '+' : ''}${relPct.toFixed(1)}%) — 말단유량 배분을 확인하세요.`,
      });
    }
  }
  for (const r of net.rows) {
    if (r.error) continue;
    if (r.verdict === 'high') {
      const d = suggestions[r.id]?.suggest_mm ?? r.suggestedD_mm;
      items.push({
        level: 'warn', title: `구간 ${r.id} ▲유속초과`,
        msg: `V=${r.V_ms.toFixed(2)} m/s가 적용 최대를 초과 — 제안 관경 ${d.toFixed(1)} mm 이상으로 확대 검토.`,
      });
    } else if (r.verdict === 'low') {
      items.push({
        level: 'warn', title: `구간 ${r.id} ▼과대관경`,
        msg: `V=${r.V_ms.toFixed(3)} m/s가 적용 최소 미만 — 관경 축소(비용·침전 측면) 검토.`,
      });
    }
    if (r.compressWarn) {
      items.push({
        level: 'warn', title: `구간 ${r.id} ⚠구간분할 필요`,
        msg: `누적 ΔP(${Math.round(r.cum_Pa)} Pa)가 절대압의 10%를 초과 — 비압축성 가정 한계. 구간을 분할해 압력별로 재계산하세요.`,
      });
    }
    if (r.regime === 'transition') {
      items.push({
        level: 'info', title: `구간 ${r.id} ⚠천이역`,
        msg: `Re=${Math.round(r.Re)} (2,300~4,000) — 천이역은 f 불확실성이 큼. 이 계산기는 엑셀 방식대로 Swamee-Jain을 적용합니다.`,
      });
    }
  }
  if (net.tempClamped) {
    items.push({ level: 'info', title: '온도 clamp', msg: '입력 온도가 유체 참조표 범위를 벗어나 경계값 물성으로 계산했습니다.' });
  }
  return items;
}
