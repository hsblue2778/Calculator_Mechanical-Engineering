// 계통 압력손실 — CSV 내보내기 행 구성
// ['항목','값','단위','비고'] 4열 규약 + 구간 결과 광폭 표 (pipe-friction/csvExport.ts 패턴)

import {
  FN_PA_PER_MMAQ, fnFluidDef, fnRUnit,
} from '../../data/frictionNetworkRef.ts';
import { VERDICT_LABELS, REGIME_LABELS, type FNNetworkResult } from './calc';
import type { FNSuggestion } from './design';
import type { FNSettingsState } from './index';

const fmt = (v: number, dp = 1) => Number.isFinite(v) ? v.toFixed(dp) : '—';
const fmtInt = (v: number) => Number.isFinite(v) ? String(Math.round(v)) : '—';
// 단위 마찰손실(mmAq/m) — 배관 스케일(수십)은 2자리, 덕트 스케일(0.1 내외)은 3자리
const fmtUnitR = (v: number) => Number.isFinite(v) ? (v >= 1 ? v.toFixed(2) : v.toFixed(3)) : '—';

export function buildFrictionNetworkCsvRows(args: {
  st: FNSettingsState;
  net: FNNetworkResult;
  suggestions: Record<string, FNSuggestion>;
  pAvailEntered: boolean;
  designTotalFlow_m3s: number | null;
  fittingSummaries?: Record<string, string>;   // 구간ID → 부속 선택 내역
}): (string | number)[][] {
  const { st, net, suggestions, pAvailEntered, designTotalFlow_m3s, fittingSummaries } = args;
  const flowMul = st.flowUnit === 'LPM' ? 60000 : 3600;
  const short = pAvailEntered && net.margin_Pa < 0;

  const rows: (string | number)[][] = [
    ['항목', '값', '단위', '비고'],
    ['계산기', '계통 압력손실', '', ''],
    ['계통 종류', st.systemType === 'duct' ? '덕트' : '배관', '', ''],
    ['유체', fnFluidDef(st.fluid).label, '', st.fluid === 'custom' ? 'ρ·ν 직접입력' : `${st.tempC} °C`],
    ['적용 밀도 ρ', net.rho_kgm3.toFixed(3), 'kg/m³', net.tempClamped ? '온도 범위 밖 — 경계값 clamp' : ''],
    ['적용 동점성 ν', (net.nu_m2s * 1e6).toFixed(4), '×10⁻⁶ m²/s', ''],
    ['가용정압 P_avail', pAvailEntered ? st.pAvail : '미입력', 'Pa', pAvailEntered ? '' : '여유 판정 생략'],
    ['여유율 α', st.alphaPct, '%', ''],
    ['설계 가용정압', pAvailEntered ? fmtInt(net.designAvail_Pa) : '—', 'Pa', 'P_avail×(1−α)'],
    ['목표 마찰률 R', st.targetR.trim() !== '' ? st.targetR : '—', fnRUnit(st.targetRUnit).label, '제안De 산출 전용'],
    ['', '', '', ''],
    ['최대 누적손실+요구압', fmtInt(net.worstDemand_Pa), 'Pa', net.worstId ? `구간 ${net.worstId}` : ''],
    ['최대 누적손실+요구압 (mmAq)', fmt(net.worstDemand_Pa / FN_PA_PER_MMAQ, 1), 'mmAq', ''],
    ['정압 여유/부족', pAvailEntered ? fmtInt(net.margin_Pa) : '—', 'Pa', pAvailEntered ? (short ? '부족 — 가용정압 초과' : '여유 OK') : '가용정압 미입력'],
    ['Σ말단유량', fmt(net.totalLeafFlow_m3s * flowMul, 1), st.flowUnit,
      designTotalFlow_m3s !== null ? `설계 총유량 ${fmt(designTotalFlow_m3s * flowMul, 1)} ${st.flowUnit} 대조` : ''],
    ['', '', '', ''],
    ['-- 구간 결과 --', '', '', ''],
    ['구간ID', '말단', `Q(${st.flowUnit})`, 'De(mm)', 'V(m/s)', '유속판정', '제안De(mm)', '제안규격',
      'Re', '유동', 'f', 'ΔP마찰(Pa)', 'R(mmAq/m)', 'ΔP부차(Pa)', 'ΔP기기(Pa)', 'ΔP구간(Pa)',
      '누적ΔP(Pa)', '누적(mmAq)', '누적+요구압(Pa)', '비고'],
  ];

  for (const r of net.rows) {
    if (r.error) {
      rows.push([r.id || '—', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', r.error]);
      continue;
    }
    const sug = suggestions[r.id];
    rows.push([
      r.id,
      r.isLeaf ? '말단' : '—',
      fmt(r.Q_m3s * flowMul, 1),
      fmt(r.De_mm, 1),
      fmt(r.V_ms, 3),
      VERDICT_LABELS[r.verdict],
      sug ? fmt(sug.suggest_mm, 1) : '—',
      sug?.snapLabel ?? '—',
      fmtInt(r.Re),
      REGIME_LABELS[r.regime],
      fmt(r.f, 5),
      fmt(r.dpFriction_Pa, 1),
      fmtUnitR(r.unitR_Pa_per_m / FN_PA_PER_MMAQ),
      fmt(r.dpMinor_Pa, 1),
      fmt(r.dpEquip_Pa, 1),
      fmt(r.dpSegment_Pa, 1),
      fmt(r.cum_Pa, 1),
      fmt(r.cum_mmAq, 1),
      fmt(r.cumPlusReq_Pa, 1),
      r.compressWarn ? '⚠구간분할 필요' : '',
    ]);
  }

  const fitEntries = Object.entries(fittingSummaries ?? {});
  if (fitEntries.length > 0) {
    rows.push(['', '', '', '']);
    rows.push(['-- 구간 부속 내역 --', '', '', '']);
    rows.push(['구간ID', '부속 내역 (ΣK 산출 근거)', '', '']);
    for (const [id, s] of fitEntries) rows.push([id, s, '', '']);
  }

  return rows;
}
