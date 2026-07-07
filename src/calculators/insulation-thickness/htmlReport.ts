// 냉수배관 보온재 선정 — HTML 산출서 (펌프 양식 채용, 표지 페이지 없음)
// 디자인 출처: pump-system/htmlReport (REPORT_CSS, pageHeader/pageFooter/secHeader)

import logoDataUrl from '../../assets/report-logo.png?inline';
import { REPORT_CSS } from '../pump-system/htmlReport/styles';
import {
  esc, pageHeader, pageFooter, secHeader,
  makeDocNo, makeCalcDateTime,
} from '../pump-system/htmlReport/helpers';
import type {
  PipeOdSpec, InsulationMaterial, InsulationInputs, InsulationOutputs,
} from './calc';
import { COMMERCIAL_THICKNESS_MM } from './calc';

// Magnus 식 상수 (calc.ts와 동일)
const MAGNUS_A = 17.625;
const MAGNUS_B = 243.04;

interface ProcessSteps {
  gamma_term1: number;
  gamma_term2: number;
  gamma: number;
  Td: number;
  P: number;
  Q: number;
  X: number;
  eX: number;
  d_m: number;
  d_mm: number;
  d_safe_mm: number;
  d_rec_m: number | null;
  D_outer: number | null;
  R_ins: number | null;
  R_conv: number | null;
  dT: number | null;
  Ts: number | null;
  margin: number | null;
}

function computeProcessSteps(args: {
  D: number; Ti: number; Ta: number; RH: number;
  k: number; ho: number; SF: number;
  d_rec_mm: number | null;
}): ProcessSteps {
  const { D, Ti, Ta, RH, k, ho, SF, d_rec_mm } = args;

  const gamma_term1 = (MAGNUS_A * Ta) / (MAGNUS_B + Ta);
  const gamma_term2 = Math.log(RH / 100);
  const gamma = gamma_term1 + gamma_term2;
  const Td = (MAGNUS_B * gamma) / (MAGNUS_A - gamma);

  const P = (2 * k) / (ho * D);
  const Q = (Ta - Ti) / (Ta - Td);
  const X = P * Q;
  const eX = Math.exp(X);
  const d_m = (D / 2) * (eX - 1);
  const d_mm = d_m * 1000;
  const d_safe_mm = d_mm * SF;

  let d_rec_m: number | null = null;
  let D_outer: number | null = null;
  let R_ins: number | null = null;
  let R_conv: number | null = null;
  let dT: number | null = null;
  let Ts: number | null = null;
  let margin: number | null = null;
  if (d_rec_mm != null) {
    d_rec_m = d_rec_mm / 1000;
    D_outer = D + 2 * d_rec_m;
    R_ins = Math.log(D_outer / D) / (2 * Math.PI * k);
    R_conv = 1 / (ho * Math.PI * D_outer);
    dT = (Ta - Ti) * R_conv / (R_ins + R_conv);
    Ts = Ta - dT;
    margin = Ts - Td;
  }

  return {
    gamma_term1, gamma_term2, gamma, Td,
    P, Q, X, eX, d_m, d_mm, d_safe_mm,
    d_rec_m, D_outer, R_ins, R_conv, dT, Ts, margin,
  };
}

function num(n: number | null, digits = 4): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

function fmt(n: number | null, digits = 1, suffix = ''): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(digits) + suffix;
}

interface ReportProps {
  pipe: PipeOdSpec;
  mat: InsulationMaterial;
  k: number;
  inputs: InsulationInputs;
  result: InsulationOutputs;
}

const TOTAL_PAGES = 3;

export function buildInsulationReportHtml(props: ReportProps): string {
  const { pipe, mat, k, inputs, result } = props;
  const docNo = makeDocNo();
  const title = '보온재 선정 계산기 계산결과';
  const docLabel = title;
  const logo = logoDataUrl as string;

  const Ti = parseFloat(inputs.Ti);
  const Ta = parseFloat(inputs.Ta);
  const RH = parseFloat(inputs.RH);
  const ho = parseFloat(inputs.ho);
  const SF = parseFloat(inputs.safetyFactor);
  const ps = computeProcessSteps({
    D: pipe.od_m, Ti, Ta, RH, k, ho, SF,
    d_rec_mm: result.d_recommended_mm,
  });

  const inputRows: [string, string, string, string][] = [
    ['관경 (호칭)', `${pipe.nominalA}A`, '—', `외경 ${pipe.od_mm.toFixed(1)} mm`],
    ['보온재', mat.nameKo, '—', `k = ${k} W/(m·K)`],
    ['외기 온도 Tₐ', inputs.Ta, '°C', '—'],
    ['관내 유체 온도 Tᵢ', inputs.Ti, '°C', '—'],
    ['상대습도 RH', inputs.RH, '%', '—'],
    ['표면 열전달률 hₒ', inputs.ho, 'W/(m²·K)', '자연대류 실내 표준 9.3'],
    ['안전계수 SF', `× ${inputs.safetyFactor}`, '배수', '통상 1.0 ~ 1.5'],
  ];

  const outputRows: [string, string, string, string][] = [
    ['노점 온도 Tᴅ', fmt(result.Td, 2), '°C', 'Magnus 식'],
    ['한계 두께 d', fmt(result.d_mm, 2), 'mm', 'Tˢ = Tᴅ 되는 이론 최소'],
    ['안전 두께 (× SF)', fmt(result.d_safe_mm, 2), 'mm', `한계 × ${inputs.safetyFactor}`],
    ['추천 시판 두께',
      result.d_recommended_mm != null ? `${result.d_recommended_mm}` : '50+',
      'mm', '시판 라인업 [13·19·25·32·38·50]'],
    ['시공 후 표면 온도 Tˢ', fmt(result.Ts, 2), '°C', '추천 두께 적용 시 검산'],
    ['노점 대비 여유 폭', fmt(result.margin, 2), '°C', `Tˢ − Tᴅ → 등급 「${result.grade}」`],
  ];

  // STEP 4 시판 두께 매칭 행
  const dSafeMm = ps.d_safe_mm;
  const matchRows = COMMERCIAL_THICKNESS_MM.map(t => {
    const meets = t >= dSafeMm;
    const isPicked = t === result.d_recommended_mm;
    return `<tr${isPicked ? ' class="hl"' : ''}>
      <td class="c">${t} mm</td>
      <td class="c">${meets ? '<span class="badge-ok">조건 만족</span>' : '<span class="badge-warn">부족</span>'}</td>
      <td class="c">${isPicked ? '★ 선정' : ''}</td>
    </tr>`;
  }).join('');

  // 경고
  const warningsHtml = result.warnings.length > 0 ? `
  <table class="k">
    <colgroup><col style="width:8%"><col style="width:92%"></colgroup>
    <tr><th>#</th><th>주의 사항</th></tr>
    ${result.warnings.map((w, i) => `<tr><td class="c">${i + 1}</td><td>${esc(w)}</td></tr>`).join('')}
  </table>` : '';

  // 페이지 1: §1 입력 + §2 결과 요약 + §3 결과 상세
  const page1 = `
<section class="sheet">
  ${pageHeader(logo, docLabel, docNo, 1, TOTAL_PAGES)}

  ${secHeader('1.', '입력 요약')}
  <table class="k">
    <colgroup><col style="width:24%"><col style="width:30%"><col style="width:14%"><col style="width:32%"></colgroup>
    <tr><th>항목</th><th>값</th><th>단위</th><th>비고</th></tr>
    ${inputRows.map(r => `<tr><td>${esc(r[0])}</td><td class="num">${esc(r[1])}</td><td class="c">${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join('')}
  </table>

  ${secHeader('2.', '결과 요약')}
  <table class="k">
    <colgroup><col style="width:34%"><col style="width:33%"><col style="width:33%"></colgroup>
    <tr><th>결로 위험 등급</th><th>추천 시판 두께</th><th>노점 대비 여유</th></tr>
    <tr class="hl">
      <td class="c" style="font-size:14pt;font-weight:700">${esc(result.grade)}</td>
      <td class="c" style="font-size:14pt;font-weight:700">${result.d_recommended_mm != null ? `${result.d_recommended_mm} mm` : '50 mm 초과'}</td>
      <td class="c" style="font-size:12pt;font-weight:700">${result.margin != null ? `${result.margin >= 0 ? '+' : ''}${result.margin.toFixed(2)} °C` : '—'}</td>
    </tr>
  </table>
  <div class="note">등급 기준 · 안전 (여유 ≥ 3 °C) · 주의 (1 ~ 3 °C) · 위험 (&lt; 1 °C)</div>

  ${secHeader('3.', '계산 결과 상세')}
  <table class="k">
    <colgroup><col style="width:28%"><col style="width:22%"><col style="width:10%"><col style="width:40%"></colgroup>
    <tr><th>항목</th><th>값</th><th>단위</th><th>비고</th></tr>
    ${outputRows.map(r => `<tr><td>${esc(r[0])}</td><td class="num">${esc(r[1])}</td><td class="c">${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join('')}
  </table>

  ${warningsHtml}

  ${pageFooter(docNo, 1, TOTAL_PAGES)}
</section>`;

  // 페이지 2: §4 계산 프로세스 (STEP 1~3)
  const page2 = `
<section class="sheet">
  ${pageHeader(logo, docLabel, docNo, 2, TOTAL_PAGES)}

  ${secHeader('4.', '계산 프로세스 (단계별 검증)')}

  <p style="font-size:10pt;font-weight:700;margin:10px 0 4px 0">STEP 1 · 노점 온도 Tᴅ 산출 (Magnus 식)</p>
  <div class="note">외기 온도와 상대습도로부터 공기 중 수증기가 응결하기 시작하는 온도를 계산. 표면이 이 온도 이하로 떨어지면 결로 발생.</div>
  <table class="k">
    <colgroup><col style="width:18%"><col style="width:82%"></colgroup>
    <tr><td>공식</td><td><code>γ = a · Tₐ / (b + Tₐ) + ln(RH / 100)<br/>Tᴅ = b · γ / (a − γ)</code></td></tr>
    <tr><td>변수</td><td><code>a = ${MAGNUS_A}, b = ${MAGNUS_B} · Tₐ = ${Ta} °C · RH = ${RH} %</code></td></tr>
    <tr><td>대입</td><td><code>γ = ${MAGNUS_A} × ${Ta} / (${MAGNUS_B} + ${Ta}) + ln(${RH}/100) = ${num(ps.gamma_term1, 6)} + (${num(ps.gamma_term2, 6)}) = ${num(ps.gamma, 6)}</code></td></tr>
    <tr class="hl"><td>결과</td><td><code>∴ Tᴅ = ${num(ps.Td, 2)} °C</code></td></tr>
  </table>

  <p style="font-size:10pt;font-weight:700;margin:10px 0 4px 0">STEP 2 · 한계 두께 d 산출 (정상상태 직렬 열저항)</p>
  <div class="note">표면 온도 Tˢ가 정확히 노점 Tᴅ가 되는 이론 최소 두께. 원통 열저항 ln(D외/D)/(2πk)와 외표면 대류 1/(hₒπD외)을 직렬로 놓고 풀어 도출.</div>
  <table class="k">
    <colgroup><col style="width:18%"><col style="width:82%"></colgroup>
    <tr><td>공식</td><td><code>d = (D / 2) · (e^X − 1) · X = (2k / (hₒ · D)) · (Tₐ − Tᵢ) / (Tₐ − Tᴅ)</code></td></tr>
    <tr><td>변수</td><td><code>D = ${pipe.od_m.toFixed(4)} m · k = ${k} W/(m·K) · hₒ = ${ho} W/(m²·K) · Tᵢ = ${Ti} °C</code></td></tr>
    <tr><td>P</td><td><code>2k / (hₒ · D) = (2 × ${k}) / (${ho} × ${pipe.od_m.toFixed(4)}) = ${num(ps.P, 6)}</code></td></tr>
    <tr><td>Q</td><td><code>(Tₐ − Tᵢ) / (Tₐ − Tᴅ) = (${Ta} − ${Ti}) / (${Ta} − ${num(ps.Td, 2)}) = ${num(ps.Q, 6)}</code></td></tr>
    <tr><td>X · e^X</td><td><code>X = P · Q = ${num(ps.X, 6)} · e^X = ${num(ps.eX, 6)}</code></td></tr>
    <tr><td>대입</td><td><code>d = (${pipe.od_m.toFixed(4)} / 2) × (${num(ps.eX, 6)} − 1) = ${num(ps.d_m, 6)} m</code></td></tr>
    <tr class="hl"><td>결과</td><td><code>∴ d = ${num(ps.d_mm, 2)} mm</code></td></tr>
  </table>

  <p style="font-size:10pt;font-weight:700;margin:10px 0 4px 0">STEP 3 · 안전 두께 (한계 × 안전계수)</p>
  <div class="note">설치·시공 오차, 재료 열화, 환경 변동을 흡수하기 위해 한계 두께에 안전계수를 곱한 값. 통상 1.0 ~ 1.5.</div>
  <table class="k">
    <colgroup><col style="width:18%"><col style="width:82%"></colgroup>
    <tr><td>공식</td><td><code>d_safe = d × SF</code></td></tr>
    <tr><td>대입</td><td><code>d_safe = ${num(ps.d_mm, 2)} × ${SF}</code></td></tr>
    <tr class="hl"><td>결과</td><td><code>∴ d_safe = ${num(ps.d_safe_mm, 2)} mm</code></td></tr>
  </table>

  ${pageFooter(docNo, 2, TOTAL_PAGES)}
</section>`;

  // 페이지 3: §4 계산 프로세스 (STEP 4~5) + §5 표준
  const step5Html = ps.d_rec_m != null && ps.D_outer != null && ps.R_ins != null && ps.R_conv != null && ps.dT != null && ps.Ts != null && ps.margin != null ? `
  <table class="k">
    <colgroup><col style="width:18%"><col style="width:82%"></colgroup>
    <tr><td>공식</td><td><code>D외 = D + 2·d_rec · R_ins = ln(D외/D) / (2π·k) · R_conv = 1 / (hₒ·π·D외)<br/>ΔT = (Tₐ − Tᵢ) · R_conv / (R_ins + R_conv) · Tˢ = Tₐ − ΔT</code></td></tr>
    <tr><td>D외</td><td><code>${pipe.od_m.toFixed(4)} + 2 × ${num(ps.d_rec_m, 4)} = ${num(ps.D_outer, 4)} m</code></td></tr>
    <tr><td>R_ins</td><td><code>ln(${num(ps.D_outer, 4)} / ${pipe.od_m.toFixed(4)}) / (2π × ${k}) = ${num(ps.R_ins, 6)} (m·K/W)</code></td></tr>
    <tr><td>R_conv</td><td><code>1 / (${ho} × π × ${num(ps.D_outer, 4)}) = ${num(ps.R_conv, 6)} (m·K/W)</code></td></tr>
    <tr><td>ΔT</td><td><code>(${Ta} − ${Ti}) × ${num(ps.R_conv, 6)} / (${num(ps.R_ins, 6)} + ${num(ps.R_conv, 6)}) = ${num(ps.dT, 4)} °C</code></td></tr>
    <tr><td>Tˢ · 여유</td><td><code>Tˢ = ${Ta} − ${num(ps.dT, 4)} = ${num(ps.Ts, 2)} °C · 여유 = Tˢ − Tᴅ = ${num(ps.margin, 2)} °C</code></td></tr>
    <tr class="hl"><td>결과</td><td><code>∴ Tˢ = ${num(ps.Ts, 2)} °C, 여유 = ${num(ps.margin, 2)} °C → 등급 「${result.grade}」</code></td></tr>
  </table>` : '<div class="note">추천 시판 두께가 없어 검산 생략 (50 mm 초과 또는 보온 불필요).</div>';

  const page3 = `
<section class="sheet">
  ${pageHeader(logo, docLabel, docNo, 3, TOTAL_PAGES)}

  <p style="font-size:10pt;font-weight:700;margin:10px 0 4px 0">STEP 4 · 시판 두께 매칭</p>
  <div class="note">시판 보온재는 정해진 두께 라인업 [13·19·25·32·38·50] mm으로만 공급되므로, 안전 두께 이상이 되는 가장 작은 값을 선정.</div>
  <table class="k">
    <colgroup><col style="width:30%"><col style="width:40%"><col style="width:30%"></colgroup>
    <tr><th>시판 두께</th><th>d_safe (${num(ps.d_safe_mm, 2)} mm) 충족</th><th>선정</th></tr>
    ${matchRows}
  </table>

  <p style="font-size:10pt;font-weight:700;margin:10px 0 4px 0">STEP 5 · 시공 후 표면 온도 검산</p>
  <div class="note">실제 시판 두께를 적용했을 때 외표면 온도가 노점 위로 충분히 올라오는지 검증. 여유 = Tˢ − Tᴅ가 클수록 안전.</div>
  ${step5Html}

  ${secHeader('5.', '적용 표준')}
  <ul class="refs">
    <li><b>Magnus 식</b> — 노점 온도 산출 (a = 17.625, b = 243.04)</li>
    <li><b>정상상태 직렬 열저항 / Eckert-Drake</b> — 원통 단열 한계 두께</li>
    <li><b>KS 강관 외경표</b> — 호칭경별 외경 (KS D 3507 등)</li>
    <li>시판 보온재 두께 라인업 [13·19·25·32·38·50] mm — 국내 표준 유통</li>
    <li><b>ASHRAE Handbook — Fundamentals</b> (Insulation for Mechanical Systems)</li>
  </ul>

  <div class="note" style="margin-top:14px">
    면책 — 본 산출서는 학습·참고용입니다. 실제 설계·시공에는 관련 기준(KS·ASHRAE 등)을 직접 확인하고 자격을 갖춘 엔지니어의 검증을 거치십시오.
  </div>

  <div style="margin-top:auto;text-align:right;font-size:9pt;color:var(--mute);padding-top:10mm">
    계산 일시: ${esc(makeCalcDateTime())}
  </div>

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
