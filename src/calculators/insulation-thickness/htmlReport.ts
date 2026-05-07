// 냉수배관 보온재 선정 — HTML 산출서 (단일 페이지)
// downloadHtmlFile()로 .html 파일 저장하면 단독 문서로 열림. 인쇄 시 PDF 변환 가능.

import type {
  PipeOdSpec, InsulationMaterial, InsulationInputs, InsulationOutputs,
} from './calc';
import { COMMERCIAL_THICKNESS_MM } from './calc';

// Magnus 식 상수 (calc.ts와 동일)
const MAGNUS_A = 17.625;
const MAGNUS_B = 243.04;

// 단계별 중간 계산값 — 클라이언트 검증용 프로세스 표시
interface ProcessSteps {
  // STEP 1
  gamma_term1: number;       // a·Ta/(b+Ta)
  gamma_term2: number;       // ln(RH/100)
  gamma: number;
  Td: number;
  // STEP 2
  P: number;                 // 2k/(h_o·D)
  Q: number;                 // (Ta-Ti)/(Ta-Td)
  X: number;                 // P·Q
  eX: number;                // e^X
  d_m: number;
  d_mm: number;
  // STEP 3
  d_safe_mm: number;
  // STEP 5
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

interface ReportProps {
  pipe: PipeOdSpec;
  mat: InsulationMaterial;
  k: number;
  inputs: InsulationInputs;
  result: InsulationOutputs;
}

function fmt(n: number | null, digits = 1, suffix = ''): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(digits) + suffix;
}

function gradeColor(g: string): string {
  if (g === '안전') return '#16A34A';
  if (g === '주의') return '#D97706';
  return '#DC2626';
}

function makeDocNo(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INS-${y}${m}${day}-${r}`;
}

// 5단계 프로세스 HTML 생성 — 공식·대입·중간값·결과를 모두 명시
function buildProcessHtml(args: {
  pipe: PipeOdSpec; k: number;
  Ti: number; Ta: number; RH: number; ho: number; SF: number;
  ps: ProcessSteps;
  result: InsulationOutputs;
}): string {
  const { pipe, k, Ti, Ta, RH, ho, SF, ps, result } = args;
  const D = pipe.od_m;

  // STEP 4 — 시판 매칭 후보 평가 (각 두께가 d_safe 이상인지)
  const dSafeMm = ps.d_safe_mm;
  const matchRows = COMMERCIAL_THICKNESS_MM.map(t => {
    const meets = t >= dSafeMm;
    const isPicked = t === result.d_recommended_mm;
    return `<tr>
      <td style="padding:3px 10px;${isPicked ? 'background:#FEF3C7;font-weight:700;' : ''}">${t} mm</td>
      <td style="padding:3px 10px;color:${meets ? '#16A34A' : '#94A3B8'};">${meets ? '✓ 조건 만족' : '× 부족'}</td>
      <td style="padding:3px 10px;">${isPicked ? '<b style="color:#D97706;">★ 선정</b>' : ''}</td>
    </tr>`;
  }).join('');

  return `
    <div class="step">
      <h4>STEP 1 · 노점 온도 Tᴅ 산출 (Magnus 식)</h4>
      <p class="desc">외기 온도와 상대습도로부터 공기 중 수증기가 응결하기 시작하는 온도를 계산합니다. 표면이 이 온도 이하로 떨어지면 결로 발생.</p>
      <div class="formula">γ = a · Tₐ / (b + Tₐ) + ln(RH / 100)
Tᴅ = b · γ / (a − γ)</div>
      <div class="vars"><b>a</b> = ${MAGNUS_A}, <b>b</b> = ${MAGNUS_B} (Magnus 상수) · <b>Tₐ</b> = ${Ta} °C · <b>RH</b> = ${RH} %</div>
      <div class="substitution">γ = ${MAGNUS_A} × ${Ta} / (${MAGNUS_B} + ${Ta}) + ln(${RH}/100)</div>
      <div class="substitution">  = ${num(ps.gamma_term1, 6)} + (${num(ps.gamma_term2, 6)})</div>
      <div class="substitution">  = ${num(ps.gamma, 6)}</div>
      <div class="substitution">Tᴅ = ${MAGNUS_B} × ${num(ps.gamma, 6)} / (${MAGNUS_A} − ${num(ps.gamma, 6)})</div>
      <div class="result">∴ Tᴅ = ${num(ps.Td, 2)} °C</div>
    </div>

    <div class="step">
      <h4>STEP 2 · 한계 두께 d 산출 (정상상태 직렬 열저항 / Eckert-Drake)</h4>
      <p class="desc">표면 온도 Tˢ가 정확히 노점 Tᴅ가 되는 이론 최소 두께. 원통 열저항 ln(D외/D)/(2πk)와 외표면 대류 1/(hₒπD외)을 직렬로 놓고 풀어 도출.</p>
      <div class="formula">d = (D / 2) · (e^X − 1)
X = (2k / (hₒ · D)) · (Tₐ − Tᵢ) / (Tₐ − Tᴅ)</div>
      <div class="vars"><b>D</b> = ${D.toFixed(4)} m (관 외경) · <b>k</b> = ${k} W/(m·K) · <b>hₒ</b> = ${ho} W/(m²·K) · <b>Tᵢ</b> = ${Ti} °C</div>
      <div class="substitution">P = 2k / (hₒ · D) = (2 × ${k}) / (${ho} × ${D.toFixed(4)}) = ${num(ps.P, 6)}</div>
      <div class="substitution">Q = (Tₐ − Tᵢ) / (Tₐ − Tᴅ) = (${Ta} − ${Ti}) / (${Ta} − ${num(ps.Td, 2)}) = ${num(ps.Q, 6)}</div>
      <div class="substitution">X = P · Q = ${num(ps.P, 6)} × ${num(ps.Q, 6)} = ${num(ps.X, 6)}</div>
      <div class="substitution">e^X = ${num(ps.eX, 6)}</div>
      <div class="substitution">d = (${D.toFixed(4)} / 2) × (${num(ps.eX, 6)} − 1) = ${num(ps.d_m, 6)} m</div>
      <div class="result">∴ d = ${num(ps.d_mm, 2)} mm</div>
    </div>

    <div class="step">
      <h4>STEP 3 · 안전 두께 (한계 × 안전계수)</h4>
      <p class="desc">설치·시공 오차, 재료 열화, 환경 변동을 흡수하기 위해 한계 두께에 안전계수를 곱한 값. 통상 1.0 ~ 1.5.</p>
      <div class="formula">d_safe = d × SF</div>
      <div class="substitution">d_safe = ${num(ps.d_mm, 2)} × ${SF}</div>
      <div class="result">∴ d_safe = ${num(ps.d_safe_mm, 2)} mm</div>
    </div>

    <div class="step">
      <h4>STEP 4 · 시판 두께 매칭</h4>
      <p class="desc">시판 보온재는 정해진 두께 라인업 [13·19·25·32·38·50] mm으로만 공급되므로, 안전 두께 이상이 되는 가장 작은 값을 선정.</p>
      <table style="width:auto;font-size:9pt;border:1px solid var(--line);margin-top:4px;">
        <thead>
          <tr style="background:var(--paper-3);">
            <th style="padding:4px 10px;text-align:left;font-weight:600;">시판 두께</th>
            <th style="padding:4px 10px;text-align:left;font-weight:600;">d_safe (${num(ps.d_safe_mm, 2)} mm) 충족</th>
            <th style="padding:4px 10px;text-align:left;font-weight:600;">선정</th>
          </tr>
        </thead>
        <tbody>${matchRows}</tbody>
      </table>
      <div class="result">∴ 추천 시판 두께 = ${result.d_recommended_mm != null ? `${result.d_recommended_mm} mm` : '50 mm 초과 (다층 시공 필요)'}</div>
    </div>

    <div class="step">
      <h4>STEP 5 · 시공 후 표면 온도 검산</h4>
      <p class="desc">실제 시판 두께를 적용했을 때 외표면 온도가 노점 위로 충분히 올라오는지 검증. 여유 = Tˢ − Tᴅ가 클수록 안전.</p>
      ${ps.d_rec_m != null && ps.D_outer != null && ps.R_ins != null && ps.R_conv != null && ps.dT != null && ps.Ts != null && ps.margin != null ? `
      <div class="formula">D외 = D + 2·d_rec
R_ins  = ln(D외 / D) / (2π · k)         (보온재 열저항)
R_conv = 1 / (hₒ · π · D외)             (외표면 대류 열저항)
ΔT = (Tₐ − Tᵢ) · R_conv / (R_ins + R_conv)
Tˢ = Tₐ − ΔT</div>
      <div class="substitution">D외 = ${D.toFixed(4)} + 2 × ${num(ps.d_rec_m, 4)} = ${num(ps.D_outer, 4)} m</div>
      <div class="substitution">R_ins  = ln(${num(ps.D_outer, 4)} / ${D.toFixed(4)}) / (2π × ${k}) = ${num(ps.R_ins, 6)} (m·K/W)</div>
      <div class="substitution">R_conv = 1 / (${ho} × π × ${num(ps.D_outer, 4)}) = ${num(ps.R_conv, 6)} (m·K/W)</div>
      <div class="substitution">ΔT = (${Ta} − ${Ti}) × ${num(ps.R_conv, 6)} / (${num(ps.R_ins, 6)} + ${num(ps.R_conv, 6)})</div>
      <div class="substitution">    = ${num(ps.dT, 4)} °C</div>
      <div class="substitution">Tˢ = ${Ta} − ${num(ps.dT, 4)} = ${num(ps.Ts, 2)} °C</div>
      <div class="substitution">여유 = Tˢ − Tᴅ = ${num(ps.Ts, 2)} − ${num(ps.Td, 2)} = ${num(ps.margin, 2)} °C</div>
      <div class="result">∴ Tˢ = ${num(ps.Ts, 2)} °C, 여유 = ${num(ps.margin, 2)} °C → 등급 「${result.grade}」</div>
      ` : `
      <div class="substitution">추천 시판 두께가 없어 검산 생략 (50 mm 초과 또는 보온 불필요).</div>
      `}
    </div>
  `;
}

export function buildInsulationReportHtml(props: ReportProps): string {
  const { pipe, mat, k, inputs, result } = props;
  const docNo = makeDocNo();
  const today = new Date().toLocaleDateString('ko-KR');
  const title = '냉수배관 보온재 선정 계산결과';

  // 단계별 중간 계산값 — 클라이언트 검증용
  const Ti = parseFloat(inputs.Ti);
  const Ta = parseFloat(inputs.Ta);
  const RH = parseFloat(inputs.RH);
  const ho = parseFloat(inputs.ho);
  const SF = parseFloat(inputs.safetyFactor);
  const ps = computeProcessSteps({
    D: pipe.od_m, Ti, Ta, RH, k, ho, SF,
    d_rec_mm: result.d_recommended_mm,
  });

  const inputRows = [
    ['관경 (호칭)', `${pipe.nominalA}A`, `외경 ${pipe.od_mm.toFixed(1)} mm`],
    ['보온재', mat.nameKo, `k = ${k} W/(m·K)`],
    ['외기 온도 Tₐ', `${inputs.Ta} °C`, ''],
    ['관내 유체 온도 Tᵢ', `${inputs.Ti} °C`, ''],
    ['상대습도 RH', `${inputs.RH} %`, ''],
    ['표면 열전달률 hₒ', `${inputs.ho} W/(m²·K)`, '자연대류 실내 표준'],
    ['안전계수', `× ${inputs.safetyFactor}`, ''],
  ];

  const outputRows: [string, string, string][] = [
    ['노점 온도 Tᴅ', fmt(result.Td, 2, ' °C'), 'Magnus 식'],
    ['한계 두께 d', fmt(result.d_mm, 2, ' mm'), 'Tˢ = Tᴅ 되는 이론 최소'],
    ['안전 두께', fmt(result.d_safe_mm, 2, ' mm'), `한계 × 안전계수 ${inputs.safetyFactor}`],
    ['추천 시판 두께',
      result.d_recommended_mm != null ? `${result.d_recommended_mm} mm` : '50 mm 초과',
      '시판 라인업 [13·19·25·32·38·50] mm'],
    ['시공 후 표면 온도 Tˢ', fmt(result.Ts, 2, ' °C'), '추천 두께 적용 시 검산값'],
    ['노점 대비 여유 폭', fmt(result.margin, 2, ' °C'), 'Tˢ − Tᴅ'],
  ];

  const warningsHtml = result.warnings.length
    ? `<section class="warnings">
        <h3>주의 사항</h3>
        <ul>${result.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>
      </section>`
    : '';

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
<style>
  :root {
    --ink:#0B1120; --mute:#475569; --line:#CBD5E1;
    --paper:#FFFFFF; --paper-2:#F8FAFC; --paper-3:#F1F5F9;
    --accent:#1F3A6E;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; background: #E5E7EB; color: var(--ink);
    font-family: 'Pretendard', -apple-system, system-ui, sans-serif;
  }
  .toolbar {
    position: sticky; top: 0; z-index: 10;
    background: rgba(15,23,42,0.92); backdrop-filter: blur(8px);
    color: #fff; padding: 10px 16px;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 12px;
  }
  .toolbar .name { font-weight: 600; letter-spacing: 0.3px; }
  .toolbar button {
    padding: 6px 12px; border: 1px solid rgba(255,255,255,0.2);
    background: #fff; color: #0B1120;
    border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;
  }
  .sheet {
    width: 210mm; min-height: 297mm;
    margin: 18px auto; background: var(--paper);
    box-shadow: 0 6px 30px rgba(0,0,0,0.18);
    padding: 18mm 16mm; font-size: 10.5pt; line-height: 1.55;
  }
  .doc-head {
    display: flex; justify-content: space-between; align-items: flex-end;
    border-bottom: 2.5px solid var(--accent);
    padding-bottom: 10px; margin-bottom: 18px;
  }
  .doc-head h1 { font-size: 16pt; margin: 0; letter-spacing: -0.3px; }
  .doc-head .meta {
    text-align: right; font-size: 9pt; color: var(--mute); line-height: 1.5;
  }
  .doc-head .meta .doc-no { color: var(--ink); font-weight: 600; letter-spacing: 0.5px; }

  section { margin-bottom: 18px; }
  section h3 {
    font-size: 11pt; margin: 0 0 8px;
    color: var(--accent); letter-spacing: -0.2px;
    border-left: 3px solid var(--accent); padding-left: 8px;
  }

  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  table tr:first-child td { border-top: 2px solid var(--ink); }
  table tr:last-child td { border-bottom: 2px solid var(--ink); }
  table td {
    padding: 8px 12px; border-bottom: 1px solid var(--line);
    vertical-align: middle;
  }
  table td.lbl {
    width: 28%; background: var(--paper-3); color: var(--mute);
    font-weight: 600; font-size: 9.5pt; letter-spacing: 0.3px;
  }
  table td.val {
    color: var(--ink); font-weight: 500;
    font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
  }
  table td.note {
    color: var(--mute); font-size: 9pt; width: 32%;
  }

  .summary-card {
    display: flex; justify-content: space-between; align-items: center;
    padding: 18px 22px; margin-bottom: 18px;
    background: var(--paper-2); border-radius: 6px;
    border-left: 5px solid ${gradeColor(result.grade)};
  }
  .summary-card .label {
    font-size: 9pt; color: var(--mute); text-transform: uppercase;
    letter-spacing: 0.05em; font-weight: 600; margin-bottom: 4px;
  }
  .summary-card .value-grade {
    font-size: 22pt; font-weight: 700;
    color: ${gradeColor(result.grade)}; line-height: 1;
  }
  .summary-card .value-thickness {
    font-size: 22pt; font-weight: 700;
    color: var(--ink); line-height: 1;
  }

  .process { display: flex; flex-direction: column; gap: 10px; }
  .process .step {
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-left: 3px solid var(--accent);
    border-radius: 5px;
    padding: 10px 14px;
    page-break-inside: avoid;
  }
  .process .step h4 {
    font-size: 10pt; margin: 0 0 6px;
    color: var(--accent); font-weight: 700;
    letter-spacing: -0.2px;
  }
  .process .step .desc {
    font-size: 9pt; color: var(--mute);
    margin: 0 0 8px; line-height: 1.5;
  }
  .process .step .formula {
    font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
    font-size: 9.5pt; color: var(--ink);
    background: #fff; border: 1px solid var(--line);
    border-radius: 4px; padding: 6px 10px;
    margin: 4px 0; line-height: 1.7;
    white-space: pre-wrap; word-break: break-word;
  }
  .process .step .substitution {
    font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
    font-size: 9pt; color: var(--mute);
    padding: 2px 10px; line-height: 1.7;
  }
  .process .step .result {
    margin-top: 6px; padding: 6px 10px;
    background: #ECFDF5; border-left: 3px solid #16A34A;
    border-radius: 3px;
    font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
    font-size: 10pt; font-weight: 700; color: #065F46;
  }
  .process .step .vars {
    margin-top: 6px; font-size: 8.5pt; color: var(--mute);
    line-height: 1.5;
  }
  .process .step .vars b { color: var(--ink); font-weight: 600; }

  .warnings { background: #FEF3C7; border-radius: 6px; padding: 12px 16px; }
  .warnings h3 {
    border-left-color: #D97706; color: #92400E;
    font-size: 10pt; margin-bottom: 6px;
  }
  .warnings ul {
    margin: 0; padding-left: 18px; font-size: 9.5pt; color: #78350F;
  }

  .footer {
    margin-top: 30px; padding-top: 12px;
    border-top: 1px solid var(--line);
    font-size: 8.5pt; color: var(--mute); line-height: 1.6;
  }

  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .sheet {
      box-shadow: none; margin: 0; width: 100%; min-height: 0;
      padding: 14mm;
    }
    @page { size: A4; margin: 0; }
  }
</style>
</head>
<body>

<div class="toolbar">
  <div class="name">${title}</div>
  <button onclick="window.print()">📄 인쇄 / PDF로 저장</button>
</div>

<div class="sheet">
  <header class="doc-head">
    <div>
      <h1>${title}</h1>
      <div style="font-size:9.5pt;color:var(--mute);margin-top:2px;">
        결로 방지 보온재 두께 산정 (Magnus + 직렬 열저항)
      </div>
    </div>
    <div class="meta">
      <div class="doc-no">${docNo}</div>
      <div>발행일 · ${today}</div>
    </div>
  </header>

  <div class="summary-card">
    <div>
      <div class="label">결로 위험 등급</div>
      <div class="value-grade">${result.grade}</div>
    </div>
    <div style="text-align:right;">
      <div class="label">추천 시판 두께</div>
      <div class="value-thickness">${result.d_recommended_mm != null ? `${result.d_recommended_mm} mm` : '50 mm 초과'}</div>
    </div>
  </div>

  <section>
    <h3>입력 조건</h3>
    <table>
      ${inputRows.map(([l, v, n]) => `
        <tr>
          <td class="lbl">${escapeHtml(l)}</td>
          <td class="val">${escapeHtml(v)}</td>
          <td class="note">${escapeHtml(n)}</td>
        </tr>
      `).join('')}
    </table>
  </section>

  <section>
    <h3>계산 결과</h3>
    <table>
      ${outputRows.map(([l, v, n]) => `
        <tr>
          <td class="lbl">${escapeHtml(l)}</td>
          <td class="val">${escapeHtml(v)}</td>
          <td class="note">${escapeHtml(n)}</td>
        </tr>
      `).join('')}
    </table>
  </section>

  <section>
    <h3>계산 프로세스 (단계별 검증)</h3>
    <div class="process">
      ${buildProcessHtml({ pipe, k, Ti, Ta, RH, ho, SF, ps, result })}
    </div>
  </section>

  ${warningsHtml}

  <div class="footer">
    <strong>등급 기준</strong> · 안전 (여유 ≥ 3 °C) · 주의 (1 ~ 3 °C) · 위험 (&lt; 1 °C)<br/>
    <strong>면책</strong> · 본 산출서는 학습·참고용입니다. 실제 설계·시공에는 관련 기준(KS·ASHRAE 등)을 직접 확인하고
    자격을 갖춘 엔지니어의 검증을 거치십시오.
  </div>
</div>

</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
