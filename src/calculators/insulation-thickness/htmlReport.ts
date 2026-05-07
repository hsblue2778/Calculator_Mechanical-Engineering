// 냉수배관 보온재 선정 — HTML 산출서 (단일 페이지)
// downloadHtmlFile()로 .html 파일 저장하면 단독 문서로 열림. 인쇄 시 PDF 변환 가능.

import type {
  PipeOdSpec, InsulationMaterial, InsulationInputs, InsulationOutputs,
} from './calc';

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

export function buildInsulationReportHtml(props: ReportProps): string {
  const { pipe, mat, k, inputs, result } = props;
  const docNo = makeDocNo();
  const today = new Date().toLocaleDateString('ko-KR');
  const title = '냉수배관 보온재 선정 계산결과';

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
