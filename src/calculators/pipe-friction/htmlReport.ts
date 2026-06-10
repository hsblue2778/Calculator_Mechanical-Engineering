// 관마찰손실 — HTML 산출서 (펌프 양식 채용, 표지 페이지 없음)
// 디자인 출처: pump-system/htmlReport (REPORT_CSS, pageHeader/pageFooter/secHeader)
// 내용: 조건·물성 산출 → 마찰계수 산출 과정(영역 판정·Colebrook 반복) → D-W 대입 → 최종 결과 → 출처

import logoDataUrl from '../../assets/report-logo.png?inline';
import { REPORT_CSS } from '../pump-system/htmlReport/styles';
import {
  esc, pageHeader, pageFooter, secHeader,
  makeDocNo, makeCalcDateTime, makeTodayStr,
} from '../pump-system/htmlReport/helpers';
import { PF_G, RE_LAMINAR_MAX, RE_TURBULENT_MIN } from './engine.ts';
import { fMethodLabel, pfWarnings } from './interpret.ts';
import { flowRegime, rangeStatus, RANGES, formatRe } from './analysis';
import { pfFlowUnitDef, convertSIToPFFlow } from './pfUnits.ts';
import { PRESSURE_UNITS } from './units';
import type { PipeFrictionController } from './usePipeFrictionState.ts';

const TOTAL_PAGES = 2;

export function buildPipeFrictionReportHtml(pf: PipeFrictionController): string {
  const { st, res, mat, fluidMeta, derivedField, triDisplay, epsDefault, cDefault } = pf;
  if (!res) return '';

  const pressDef = PRESSURE_UNITS.find(u => u.key === st.pressureUnit)!;
  const flowLabel = pfFlowUnitDef(st.flowUnit).label;
  const condLabel = st.condition === 'new' ? '신관' : '노후';
  const isWater = st.fluid === 'water';
  const isFixed = fluidMeta.mode === 'fixed';
  const regime = flowRegime(res.Re);
  const rangeV = rangeStatus(res.V_ms, RANGES.velocity);
  const rangeU = rangeStatus(res.deltaP_per_m_Pa, RANGES.unitLossPa);
  const warns = pfWarnings(res, isWater);

  const docNo = makeDocNo();
  const today = makeTodayStr();
  const title = '관마찰손실 계산결과';
  const logo = logoDataUrl as string;
  const auto = (f: 'Q' | 'V' | 'D') => (derivedField === f ? '자동 산출' : '입력값');
  const epsEdited = st.epsStr.trim() !== epsDefault;
  const cEdited = st.cStr.trim() !== cDefault;

  // §1 입력·조건 요약
  const inputRows: [string, string, string, string][] = [
    ['유체', fluidMeta.label, '—', isFixed ? '상온·1atm 단일 물성 (문헌 표 5)' : '온도별 물성표'],
    ...(isFixed ? [] : [['온도', st.tempC, '°C', '물성 선형보간'] as [string, string, string, string]]),
    ...(fluidMeta.hasPressure ? [['압력', st.pressureMmHg, 'mmHg', '공기 ν·ρ에 반영 (이상기체)'] as [string, string, string, string]] : []),
    ['배관 재질', `${mat.nameKo}${mat.abbreviation ? ` (${mat.abbreviation})` : ''}`, '—', condLabel],
    ['절대조도 ε', st.epsStr, 'mm', epsEdited ? `기본 ${epsDefault} → 사용자 수정` : '재질×상태 기본값'],
    ...(isWater ? [['H-W 조도계수 C', st.cStr, '—', cEdited ? `기본 ${cDefault} → 사용자 수정` : '재질×상태 기본값'] as [string, string, string, string]] : []),
    ['유량 Q', triDisplay.Q, flowLabel, auto('Q')],
    ['유속 V', triDisplay.V, 'm/s', auto('V')],
    ['관 내경 D', triDisplay.D, 'mm', auto('D')],
    ['배관 길이 L', st.L, 'm', '입력값'],
  ];

  // §2 물성·조도 산출
  const propItems: string[] = [
    isFixed
      ? `ν = ${res.nu_m2s.toExponential(4)} m²/s (문헌 표 5 단일값)`
      : `ν = ${(res.nu_m2s * 1e6).toPrecision(4)}×10⁻⁶ m²/s (${fluidMeta.label} ${esc(st.tempC)}°C${fluidMeta.hasPressure ? `, ${esc(st.pressureMmHg)} mmHg` : ''} — 물성표 선형보간)`,
    isFixed
      ? `ρ = ${res.rho_kgm3} kg/m³ (문헌 표 5 단일값)`
      : st.fluid === 'air'
        ? `ρ = 1.293 × 273.15/(273.15+${esc(st.tempC)}) × (${esc(st.pressureMmHg)}/760) = ${res.rho_kgm3.toFixed(4)} kg/m³ (이상기체)`
        : `ρ = ${res.rho_kgm3.toFixed(1)} kg/m³ (NIST WebBook 보간)`,
    `A = π × D²/4 = π × (${res.D_m.toFixed(5)})²/4 = ${res.A_m2.toFixed(6)} m²`,
    derivedField === 'Q'
      ? `Q = A × V = ${res.A_m2.toFixed(6)} × ${res.V_ms.toFixed(3)} = ${res.Q_m3s.toFixed(6)} m³/s (자동 산출)`
      : derivedField === 'V'
        ? `V = Q/A = ${res.Q_m3s.toFixed(6)} / ${res.A_m2.toFixed(6)} = ${res.V_ms.toFixed(3)} m/s (자동 산출)`
        : `D = √(4Q/(πV)) = ${(res.D_m * 1000).toFixed(1)} mm (자동 산출)`,
    `Re = V·D/ν = ${res.V_ms.toFixed(3)} × ${res.D_m.toFixed(5)} / ${res.nu_m2s.toExponential(4)} = ${formatRe(res.Re)} (${regime.label})`,
    `ε/D = ${st.epsStr} mm / ${(res.D_m * 1000).toFixed(1)} mm = ${res.relRough.toExponential(4)}`,
  ];

  // §3 마찰계수 산출
  const fRows: string[] = [];
  fRows.push(`유동 영역 판정: Re = ${formatRe(res.Re)} → ${regime.label} (층류 &lt; ${RE_LAMINAR_MAX.toLocaleString()} / 천이 ≤ ${RE_TURBULENT_MIN.toLocaleString()} / 난류 &gt; ${RE_TURBULENT_MIN.toLocaleString()})`);
  switch (res.fMethod) {
    case 'laminar':
      fRows.push(`층류: f = 64/Re = 64/${res.Re.toFixed(1)} = ${res.f.toFixed(6)}`);
      break;
    case 'interpolated':
      fRows.push(`천이(불확정 구간): f(2,300)=64/2,300=${(64 / RE_LAMINAR_MAX).toFixed(6)} ↔ f(4,000)=Colebrook 값의 3차 보간 = ${res.f.toFixed(6)}`);
      break;
    case 'colebrook':
      fRows.push(`Colebrook-White: 1/√f = −2log₁₀(ε/(3.7D) + 2.51/(Re√f)) — Newton 반복 ${res.fIterations ?? '—'}회, 잔차 &lt; 10⁻¹⁰ → f = ${res.f.toFixed(6)}`);
      break;
    case 'override':
      fRows.push(`사용자 수동 입력: f = ${res.f} (영역별 자동 산출 미사용)`);
      break;
  }
  fRows.push(res.fSwameeJain !== null
    ? `Swamee-Jain 검산: f = 0.25/[log₁₀(ε/(3.7D)+5.74/Re⁰·⁹)]² = ${res.fSwameeJain.toFixed(6)} (적용 마찰계수와 ${(100 * (res.f - res.fSwameeJain) / res.fSwameeJain).toFixed(2)}% 차)`
    : 'Swamee-Jain 검산: 적용범위 외 (유효범위 Re &gt; 4,000)');
  if (!res.fConverged) fRows.push('주의: Colebrook 반복 미수렴 — Swamee-Jain 근사값으로 대체됨');

  // §4 D-W 대입
  const dwItems: string[] = [
    `hL = f × (L/D) × V²/(2g) = ${res.f.toFixed(6)} × (${esc(st.L)}/${res.D_m.toFixed(5)}) × ${res.V_ms.toFixed(3)}²/(2 × ${PF_G}) = ${res.hL_m.toFixed(4)} m`,
    `ΔP = ρ × g × hL = ${res.rho_kgm3.toFixed(4)} × ${PF_G} × ${res.hL_m.toFixed(4)} = ${Math.round(res.deltaP_Pa).toLocaleString()} Pa`,
    `단위 마찰손실 = ΔP/L = ${res.deltaP_per_m_Pa.toFixed(2)} Pa/m`,
  ];

  // §5 최종 결과
  const resultRows: [string, string, string, string][] = [
    ['유량 Q', `${convertSIToPFFlow(res.Q_m3s, st.flowUnit).toFixed(2)}`, flowLabel, auto('Q')],
    ['유속 V', res.V_ms.toFixed(3), 'm/s', isWater ? rangeV.label : '—'],
    ['관 내경 D', (res.D_m * 1000).toFixed(1), 'mm', auto('D')],
    ['레이놀즈수 Re', formatRe(res.Re), '—', regime.label],
    ['마찰계수 f', res.f.toFixed(6), '—', fMethodLabel(res.fMethod)],
    ['수두 hL', res.hL_m.toFixed(4), 'm', '—'],
    ['총 마찰손실 ΔP', (res.deltaP_Pa * pressDef.factor).toFixed(pressDef.dp), pressDef.label, '—'],
    ['단위 마찰손실', (res.deltaP_per_m_Pa * pressDef.factor).toFixed(pressDef.dpM), `${pressDef.label}/m`, isWater ? rangeU.label : '—'],
  ];

  const warnRows = warns.map(w => `
    <tr>
      <td class="c">${w.level === 'error' ? '<span class="badge-warn">위험</span>' : w.level === 'warn' ? '<span class="badge-warn">주의</span>' : '<span class="badge-ok">참고</span>'}</td>
      <td>${esc(w.title)}</td>
      <td>${esc(w.msg)}</td>
    </tr>`).join('');

  const page1 = `
<section class="sheet">
  ${pageHeader(logo, title, docNo, 1, TOTAL_PAGES)}

  ${secHeader('1.', '입력 · 조건 요약')}
  <table class="k">
    <colgroup><col style="width:24%"><col style="width:30%"><col style="width:12%"><col style="width:34%"></colgroup>
    <tr><th>항목</th><th>값</th><th>단위</th><th>비고</th></tr>
    ${inputRows.map(r => `<tr><td>${esc(r[0])}</td><td class="num">${esc(r[1])}</td><td class="c">${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join('')}
  </table>

  ${secHeader('2.', '물성 · 흐름 조건 산출')}
  <table class="k">
    <colgroup><col style="width:8%"><col style="width:92%"></colgroup>
    <tr><th>#</th><th>식 / 대입</th></tr>
    ${propItems.map((s, i) => `<tr><td class="c">${i + 1}</td><td><code>${s}</code></td></tr>`).join('')}
  </table>

  ${secHeader('3.', '마찰계수 f 산출')}
  <table class="k">
    <colgroup><col style="width:8%"><col style="width:92%"></colgroup>
    <tr><th>#</th><th>과정</th></tr>
    ${fRows.map((s, i) => `<tr><td class="c">${i + 1}</td><td><code>${s}</code></td></tr>`).join('')}
  </table>
  <div class="note">층류 f=64/Re · 천이(2,300~4,000) 3차 보간(불확정 구간) · 난류 Colebrook-White 반복해 — Swamee-Jain은 검산 병기</div>

  ${pageFooter(docNo, 1, TOTAL_PAGES)}
</section>`;

  const page2 = `
<section class="sheet">
  ${pageHeader(logo, title, docNo, 2, TOTAL_PAGES)}

  ${secHeader('4.', 'Darcy-Weisbach 대입 과정')}
  <table class="k">
    <colgroup><col style="width:8%"><col style="width:92%"></colgroup>
    <tr><th>#</th><th>식 / 대입</th></tr>
    ${dwItems.map((s, i) => `<tr><td class="c">${i + 1}</td><td><code>${s}</code></td></tr>`).join('')}
  </table>

  ${secHeader('5.', '최종 결과')}
  <table class="k">
    <colgroup><col style="width:30%"><col style="width:24%"><col style="width:14%"><col style="width:32%"></colgroup>
    <tr><th>항목</th><th>값</th><th>단위</th><th>비고</th></tr>
    ${resultRows.map(r => `<tr${r[0] === '총 마찰손실 ΔP' ? ' class="hl"' : ''}>
      <td>${esc(r[0])}</td><td class="num">${esc(r[1])}</td><td class="c">${esc(r[2])}</td><td class="c">${esc(r[3])}</td></tr>`).join('')}
  </table>
  ${warns.length > 0 ? `
  <table class="k">
    <colgroup><col style="width:14%"><col style="width:24%"><col style="width:62%"></colgroup>
    <tr><th>등급</th><th>항목</th><th>설명</th></tr>
    ${warnRows}
  </table>` : '<div class="note">권장 범위 내 — 추가 경고 없음</div>'}

  ${secHeader('6.', '적용 표준 · 출처')}
  <ul class="refs">
    <li><b>Darcy-Weisbach · Colebrook-White(1939) · Swamee-Jain(1976)</b> — 마찰손실·마찰계수</li>
    <li><b>천이역 3차 보간</b> — EPANET 2 천이역 보간 방식 준용 (경계 2,300/4,000)</li>
    <li><b>물성</b> — 참조 엑셀 '마찰손실 계산기' ν표 · NIST WebBook(물 ρ) · 설비공학 문헌 표 2(공기)·표 5(기타 유체) · 이상기체</li>
    <li><b>ε · C값</b> — Moody(1944) · ASHRAE Fundamentals Ch.22 · NFPA 13 · KDS 57 · GF SYGEF Handbook · PPI(1971)</li>
    <li><b>SAREK 설비편람</b> — 권장 유속 / 단위 마찰손실 범위 (물 배관)</li>
  </ul>

  <div style="margin-top:auto;text-align:right;font-size:9pt;color:var(--mute);padding-top:10mm">
    계산 일시: ${esc(makeCalcDateTime())}
  </div>

  ${pageFooter(docNo, 2, TOTAL_PAGES, '본 산출서는 설계 단계 검토용입니다.')}
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

<div class="toolbar">
  <div class="name">${esc(title)} · ${esc(today)}</div>
  <div class="actions">
    <button onclick="window.print()" class="primary">📄 PDF로 저장 / 인쇄</button>
  </div>
</div>

${page1}
${page2}

</body>
</html>`;
}
