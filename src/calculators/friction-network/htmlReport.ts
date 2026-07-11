// 계통 압력손실 — HTML 산출서 (펌프 양식 채용, 표지 페이지 없음)
// 디자인 출처: pump-system/htmlReport (REPORT_CSS, pageHeader/pageFooter/secHeader)
// 구성: 결과 요약(KPI+판정) → 계통 조건 → 판정 상세·경고 → 구간 표(입력/수리/손실) → 출처

import logoDataUrl from '../../assets/report-logo.png?inline';
import { REPORT_CSS } from '../pump-system/htmlReport/styles';
import {
  esc, pageHeader, pageFooter, secHeader,
  makeDocNo, makeCalcDateTime,
  kpiStrip, verdictBadge, verdictLine,
} from '../pump-system/htmlReport/helpers';
import {
  FN_GRADES, FN_PA_PER_MMAQ, fnFluidDef, fnMaterial, fnRUnit,
} from '../../data/frictionNetworkRef.ts';
import {
  VERDICT_LABELS, REGIME_LABELS,
  type FNNetworkResult, type FNSegmentInput,
} from './calc';
import type { FNSuggestion } from './design';
import type { FNSettingsState } from './index';
import { buildFnWarnings } from './warnings';

const TOTAL_PAGES = 3;

const fmt = (v: number, dp = 1) => Number.isFinite(v) ? v.toFixed(dp) : '—';
const fmtInt = (v: number) => Number.isFinite(v) ? Math.round(v).toLocaleString() : '—';
// 단위 마찰손실(mmAq/m) — 배관 스케일(수십)은 2자리, 덕트 스케일(0.1 내외)은 3자리
const fmtUnitR = (v: number) => Number.isFinite(v) ? (v >= 1 ? v.toFixed(2) : v.toFixed(3)) : '—';

function gradeLabel(key: string): string {
  return FN_GRADES.find(g => g.key === key)?.label ?? key;
}

export interface FrictionNetworkReportArgs {
  st: FNSettingsState;
  segments: FNSegmentInput[];          // 계산에 실제 투입된 구간 (빈 행 제외)
  net: FNNetworkResult;
  suggestions: Record<string, FNSuggestion>;
  pAvailEntered: boolean;
  designTotalFlow_m3s: number | null;
  fittingSummaries?: Record<string, string>;   // 구간ID → 부속 선택 내역 (ΣK 산출 근거)
}

export function buildFrictionNetworkReportHtml(args: FrictionNetworkReportArgs): string {
  const { st, segments, net, suggestions, pAvailEntered, designTotalFlow_m3s, fittingSummaries } = args;

  const docNo = makeDocNo();
  const title = '계통 압력손실 계산결과';
  const logo = logoDataUrl as string;
  const flowMul = st.flowUnit === 'LPM' ? 60000 : 3600;
  const fluidDef = fnFluidDef(st.fluid);
  const short = pAvailEntered && net.margin_Pa < 0;

  // §1 계통 조건
  const condRows: [string, string, string, string][] = [
    ['계통 종류', st.systemType === 'duct' ? '덕트' : '배관', '—', '목표 유속범위·유량 단위 기본값 기준'],
    ['유체', fluidDef.label, '—', st.fluid === 'custom' ? 'ρ·ν 직접입력' : '참조표 선형보간'],
    ...(st.fluid !== 'custom'
      ? [['온도', st.tempC, '°C', net.tempClamped ? '범위 밖 — 경계값 clamp' : '—'] as [string, string, string, string]]
      : []),
    ...(fluidDef.pressCorrect || fluidDef.compressible
      ? [['절대압 P_abs', st.pressAbs, 'bar a', fluidDef.pressCorrect ? '공기 물성 압력 보정' : '압축성 경고 기준'] as [string, string, string, string]]
      : []),
    ['적용 밀도 ρ', net.rho_kgm3.toFixed(3), 'kg/m³', '—'],
    ['적용 동점성 ν', (net.nu_m2s * 1e6).toFixed(4), '×10⁻⁶ m²/s', '—'],
    ['말단유량 단위', st.flowUnit, '—', st.flowUnit === 'LPM' ? 'Q = LPM÷60000 (m³/s)' : 'Q = CMH÷3600 (m³/s)'],
    ['가용정압 P_avail', pAvailEntered ? st.pAvail : '—', 'Pa', pAvailEntered ? '—' : '미입력 — 여유 판정 생략'],
    ['여유율 α', st.alphaPct, '%', '설계 가용정압 = P_avail×(1−α)'],
    ['설계 가용정압', pAvailEntered ? fmtInt(net.designAvail_Pa) : '—', 'Pa',
      pAvailEntered ? `${fmt(net.designAvail_Pa / FN_PA_PER_MMAQ, 1)} mmAq` : '—'],
    ['목표 마찰률 R', st.targetR.trim() !== '' ? st.targetR : '—', fnRUnit(st.targetRUnit).label, '제안De 산출 전용 — 손실 계산 미사용'],
    ['설계 총유량', designTotalFlow_m3s !== null ? st.designTotalFlow : '—', st.flowUnit, 'Σ말단유량 대조용'],
  ];

  // §2 구간 입력 — 계산 투입 행 그대로
  const inputRows = segments.map((seg, i) => {
    const isLeaf = net.rows[i]?.isLeaf ?? false;
    const dim = seg.shape === 'circle' ? `D ${fmt(seg.D_mm, 1)}` : `${fmt(seg.a_mm, 0)}×${fmt(seg.b_mm, 0)}`;
    const matLabel = `${fnMaterial(seg.materialId).label} (${seg.condition === 'new' ? '신관' : '노후'})`;
    return `<tr>
      <td>${esc(seg.id)}</td>
      <td>${esc(seg.parentId)}</td>
      <td class="c">${esc(gradeLabel(seg.grade))}</td>
      <td class="c">${seg.shape === 'circle' ? '원형' : '사각'}</td>
      <td class="num">${dim}</td>
      <td class="num">${fmt(seg.L_m, 1)}</td>
      <td class="num">${fmt(seg.sumK, 2)}</td>
      <td class="num">${fmtInt(seg.equipLoss_Pa)}</td>
      <td>${esc(matLabel)}</td>
      <td class="num">${isLeaf ? fmt(seg.terminalFlow, 1) : '—'}</td>
      <td class="num">${isLeaf ? fmtInt(seg.pReq_Pa) : '—'}</td>
    </tr>`;
  }).join('');

  // §3 구간 수리 특성 · §4 구간 손실·누적
  const hydroRows = net.rows.map(r => {
    const worst = r.id === net.worstId && !r.error;
    if (r.error) {
      return `<tr><td>${esc(r.id || '—')}</td><td colspan="10">${esc(r.error)}</td></tr>`;
    }
    const sug = suggestions[r.id];
    const verdictCell = r.verdict === 'ok'
      ? '<span class="badge-ok">OK</span>'
      : `<span class="badge-warn">${esc(VERDICT_LABELS[r.verdict])}</span>`;
    return `<tr${worst ? ' class="hl"' : ''}>
      <td>${esc(r.id)}${worst ? ' ★' : ''}</td>
      <td class="c">${r.isLeaf ? '말단' : '—'}</td>
      <td class="num">${fmt(r.Q_m3s * flowMul, 1)}</td>
      <td class="num">${fmt(r.De_mm, 1)}</td>
      <td class="num">${fmt(r.V_ms, 3)}</td>
      <td class="c">${verdictCell}</td>
      <td class="num">${sug ? fmt(sug.suggest_mm, 1) : '—'}</td>
      <td class="c">${esc(sug?.snapLabel ?? '—')}</td>
      <td class="num">${fmtInt(r.Re)}</td>
      <td class="c">${esc(REGIME_LABELS[r.regime])}</td>
      <td class="num">${fmt(r.f, 5)}</td>
    </tr>`;
  }).join('');

  // 목표 마찰률 R (Pa/m 환산) — 구간 R 초과 시 ▲ 표기 (흑백 인쇄 대비 색상 미사용)
  const targetRNum = parseFloat(st.targetR);
  const targetR_Pa_per_m = st.targetR.trim() !== '' && Number.isFinite(targetRNum) && targetRNum > 0
    ? targetRNum * fnRUnit(st.targetRUnit).toPaPerM
    : null;

  const lossRows = net.rows.map(r => {
    const worst = r.id === net.worstId && !r.error;
    if (r.error) {
      return `<tr><td>${esc(r.id || '—')}</td><td colspan="8">${esc(r.error)}</td></tr>`;
    }
    const overR = targetR_Pa_per_m !== null && Number.isFinite(r.unitR_Pa_per_m) && r.unitR_Pa_per_m > targetR_Pa_per_m;
    return `<tr${worst ? ' class="hl"' : ''}>
      <td>${esc(r.id)}${worst ? ' ★' : ''}</td>
      <td class="num">${fmt(r.dpFriction_Pa, 1)}</td>
      <td class="num">${fmtUnitR(r.unitR_Pa_per_m / FN_PA_PER_MMAQ)}${overR ? ' ▲' : ''}</td>
      <td class="num">${fmt(r.dpMinor_Pa, 1)}</td>
      <td class="num">${fmt(r.dpEquip_Pa, 1)}</td>
      <td class="num">${fmt(r.dpSegment_Pa, 1)}</td>
      <td class="num">${fmt(r.cum_Pa, 1)}</td>
      <td class="num">${fmt(r.cum_mmAq, 1)}</td>
      <td class="num">${fmt(r.cumPlusReq_Pa, 1)}${r.compressWarn ? ' ⚠' : ''}</td>
    </tr>`;
  }).join('');

  // §5 판정 요약 + 경고
  const marginCell = pAvailEntered
    ? (short
      ? `<span class="badge-warn">정압 부족</span> ${fmtInt(Math.abs(net.margin_Pa))} Pa 초과`
      : `<span class="badge-ok">정압 여유</span> ${fmtInt(net.margin_Pa)} Pa`)
    : '가용정압 미입력 — 판정 생략';
  const totalFlowNote = designTotalFlow_m3s !== null
    ? `설계 총유량 ${fmt(designTotalFlow_m3s * flowMul, 1)} ${st.flowUnit} 대조`
    : '설계 총유량 미입력';

  const warns = buildFnWarnings(net, pAvailEntered, suggestions, designTotalFlow_m3s, st.flowUnit);
  const warnRows = warns.map(w => `
    <tr>
      <td class="c">${w.level === 'error' ? '<span class="badge-warn">위험</span>' : w.level === 'warn' ? '<span class="badge-warn">주의</span>' : '<span class="badge-ok">참고</span>'}</td>
      <td>${esc(w.title)}</td>
      <td class="wrap">${esc(w.msg)}</td>
    </tr>`).join('');

  // §1 결과 요약 — KPI 밴드 + 판정
  const kpis = kpiStrip([
    { label: '최대 누적손실+요구압', value: fmtInt(net.worstDemand_Pa), unit: 'Pa', sub: `${fmt(net.worstDemand_Pa / FN_PA_PER_MMAQ, 1)} mmAq${net.worstId ? ` · 최불리 구간 ${esc(net.worstId)} ★` : ''}` },
    { label: '설계 가용정압', value: pAvailEntered ? fmtInt(net.designAvail_Pa) : '—', unit: pAvailEntered ? 'Pa' : undefined, sub: `P_avail × (1 − α ${esc(st.alphaPct)}%)` },
    { label: '정압 여유', value: pAvailEntered ? `${net.margin_Pa >= 0 ? '+' : '−'}${fmtInt(Math.abs(net.margin_Pa))}` : '—', unit: pAvailEntered ? 'Pa' : undefined, sub: pAvailEntered ? `${fmt(Math.abs(net.margin_Pa) / FN_PA_PER_MMAQ, 1)} mmAq ${short ? '부족' : '여유'}` : '가용정압 미입력' },
    { label: 'Σ말단유량', value: fmt(net.totalLeafFlow_m3s * flowMul, 1), unit: st.flowUnit, sub: esc(totalFlowNote) },
  ]);
  const errorWarnCount = warns.filter(w => w.level === 'error').length;
  const verdictParts: string[] = [
    pAvailEntered
      ? `정압 판정 ${verdictBadge(short ? 'risk' : 'ok', short ? '정압 부족' : '정압 여유')}`
      : verdictBadge('info', '가용정압 미입력 — 판정 생략'),
    ...(errorWarnCount > 0 ? [verdictBadge('risk', `위험 경고 ${errorWarnCount}건`)] : []),
  ];

  const page1 = `
<section class="sheet">
  ${pageHeader(logo, title, docNo, 1, TOTAL_PAGES)}

  ${secHeader('1.', '결과 요약')}
  ${kpis}
  ${verdictLine(verdictParts)}

  ${secHeader('2.', '계통 조건')}
  <table class="k">
    <colgroup><col style="width:22%"><col style="width:26%"><col style="width:16%"><col style="width:36%"></colgroup>
    <tr><th>항목</th><th>값</th><th>단위</th><th>비고</th></tr>
    ${condRows.map(r => `<tr><td>${esc(r[0])}</td><td class="num">${esc(r[1])}</td><td class="c">${esc(r[2])}</td><td class="wrap">${esc(r[3])}</td></tr>`).join('')}
  </table>

  ${secHeader('3.', '판정 요약 상세')}
  <table class="k">
    <colgroup><col style="width:30%"><col style="width:70%"></colgroup>
    <tr><th>항목</th><th>값</th></tr>
    <tr class="total"><td>최대 누적손실+요구압${net.worstId ? ` (구간 ${esc(net.worstId)})` : ''}</td>
      <td>${fmtInt(net.worstDemand_Pa)} Pa (${fmt(net.worstDemand_Pa / FN_PA_PER_MMAQ, 1)} mmAq)</td></tr>
    <tr><td>설계 가용정압 P_avail×(1−α)</td>
      <td>${pAvailEntered ? `${fmtInt(net.designAvail_Pa)} Pa (${fmt(net.designAvail_Pa / FN_PA_PER_MMAQ, 1)} mmAq)` : '— (가용정압 미입력)'}</td></tr>
    <tr><td>정압 여유 / 부족</td><td>${marginCell}</td></tr>
    <tr><td>Σ말단유량</td><td>${fmt(net.totalLeafFlow_m3s * flowMul, 1)} ${esc(st.flowUnit)} — ${esc(totalFlowNote)}</td></tr>
  </table>

  ${warns.length > 0 ? `
  <table class="k">
    <colgroup><col style="width:10%"><col style="width:26%"><col style="width:64%"></colgroup>
    <tr><th>등급</th><th>항목</th><th>설명</th></tr>
    ${warnRows}
  </table>` : '<p class="note">경고 없음 — 전 구간 유효.</p>'}

  ${pageFooter(docNo, 1, TOTAL_PAGES, '본 산출서는 설계 단계 검토용입니다.')}
</section>`;

  const page2 = `
<section class="sheet">
  ${pageHeader(logo, title, docNo, 2, TOTAL_PAGES)}

  ${secHeader('4.', '구간 입력')}
  <table class="k dense">
    <tr>
      <th>구간 ID</th><th>부모 ID</th><th>등급</th><th>형상</th><th>치수 (mm)</th>
      <th>L (m)</th><th>ΣK</th><th>기기손실 (Pa)</th><th>재질 (상태)</th>
      <th>말단유량 (${esc(st.flowUnit)})</th><th>요구압 (Pa)</th>
    </tr>
    ${inputRows}
  </table>
  <p class="note">부모ID 트리 기준 말단→상류 Q 합산. 비말단 구간의 말단유량·요구압은 미사용.</p>
  ${Object.keys(fittingSummaries ?? {}).length > 0 ? `
  <p class="note">부속 내역 (ΣK 산출 근거 — 배관: Perry's 8th Ed · 덕트: 편람 표 10·11): ${Object.entries(fittingSummaries!).map(([id, s]) => `<b>${esc(id)}</b> ${esc(s)}`).join(' / ')}</p>` : ''}

  ${secHeader('5.', '구간 수리 특성')}
  <table class="k dense">
    <tr>
      <th>구간</th><th>말단</th><th>Q (${esc(st.flowUnit)})</th><th>De (mm)</th><th>V (m/s)</th>
      <th>유속판정</th><th>제안De (mm)</th><th>제안 규격</th><th>Re</th><th>유동</th><th>f</th>
    </tr>
    ${hydroRows}
  </table>
  <p class="note">★ = 최대 (누적손실+요구압) 구간 · 제안De = max(유속 기준, 마찰률 R 기준) · f: 층류 64/Re · Re≥2,300 Swamee-Jain</p>

  ${pageFooter(docNo, 2, TOTAL_PAGES, '본 산출서는 설계 단계 검토용입니다.')}
</section>`;

  const page3 = `
<section class="sheet">
  ${pageHeader(logo, title, docNo, 3, TOTAL_PAGES)}

  ${secHeader('6.', '구간 손실 · 누적')}
  <table class="k dense">
    <tr>
      <th>구간</th><th>ΔP마찰 (Pa)</th><th>R (mmAq/m)</th><th>ΔP부차 (Pa)</th><th>ΔP기기 (Pa)</th><th>ΔP구간 (Pa)</th>
      <th>누적ΔP (Pa)</th><th>누적 (mmAq)</th><th>누적+요구압 (Pa)</th>
    </tr>
    ${lossRows}
  </table>
  <p class="note">R = ΔP마찰/L (단위 마찰손실)${targetR_Pa_per_m !== null ? ` · ▲ = 목표 마찰률 R(${fmtUnitR(targetR_Pa_per_m / FN_PA_PER_MMAQ)} mmAq/m) 초과` : ''} · 누적ΔP = ΔP구간 + 부모 누적 (ROOT→0) · ⚠ = 누적ΔP &gt; 0.1·P_abs (압축성 한계 — 구간분할 필요)</p>

  ${secHeader('7.', '적용 공식 · 출처')}
  <ul class="refs">
    <li><b>ΔP 마찰</b> = 8fLρQ²/(π²·De⁵) — Q형 Darcy-Weisbach</li>
    <li><b>마찰계수 f</b> — 층류 64/Re · Re≥2,300 Swamee-Jain(1976) 0.25/[log₁₀(ε/(3.7De)+5.74/Re⁰·⁹)]²</li>
    <li><b>상당지름 De</b> (사각) = 1.3(ab)⁰·⁶²⁵/(a+b)⁰·²⁵</li>
    <li><b>ΔP 부차</b> = ΣK·ρV²/2 — 부속 K값 직접입력</li>
    <li><b>환산</b> mmAq = Pa / 9.80665</li>
    <li><b>판정</b> — 최대(누적손실+요구압) vs 설계 가용정압 P_avail×(1−α)</li>
    <li><b>출처</b> — 참조 엑셀 '마찰손실 계통 계산기' 공식 이식</li>
  </ul>

  <p class="note" style="margin-top:14px">
    계산 일시: ${esc(makeCalcDateTime())}
  </p>

  ${pageFooter(docNo, 3, TOTAL_PAGES, '본 산출서는 설계 단계 검토용입니다.')}
</section>`;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
<style>
${REPORT_CSS}
</style>
</head>
<body>

${page1}
${page2}
${page3}

</body>
</html>`;
}
