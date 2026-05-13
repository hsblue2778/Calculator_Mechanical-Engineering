// 관경 선정 — HTML 산출서 (펌프 양식 채용, 표지 페이지 없음)
// 디자인 출처: pump-system/htmlReport (REPORT_CSS, pageHeader/pageFooter/secHeader)

import logoDataUrl from '../../assets/report-logo.png?inline';
import { REPORT_CSS } from '../pump-system/htmlReport/styles';
import {
  esc, pageHeader, pageFooter, secHeader,
  makeDocNo, makeCalcDateTime, makeTodayStr,
} from '../pump-system/htmlReport/helpers';
import type { SizingRow } from './calc';
import type { PipeMaterialSize } from '../../data/pipeSizes';
import {
  FLOW_UNITS, PRESSURE_UNITS,
  type FlowUnitKey, type PressureUnitKey,
} from '../pipe-friction/units';
import { convertFlowToLpm, mmAqToDisplay } from './units';
import { flowRegime, rangeStatus, RANGES, formatRe } from '../pipe-friction/analysis';

// 중력가속도 [m/s²]
const G = 9.81;

interface ReportProps {
  selected: SizingRow;
  rows: SizingRow[];
  analysis: { V: number; Re: number; unitLoss_Pa: number } | null;
  mat: PipeMaterialSize;
  Q: string;
  dP: string;
  flowUnit: FlowUnitKey;
  pressureUnit: PressureUnitKey;
}

const TOTAL_PAGES = 2;

export function buildPipeSizingReportHtml(props: ReportProps): string {
  const { selected, rows, analysis, mat, Q, dP, flowUnit, pressureUnit } = props;

  const pressDef = PRESSURE_UNITS.find(u => u.key === pressureUnit)!;
  const flowUnitLabel = FLOW_UNITS.find(u => u.key === flowUnit)?.label ?? '';

  const Q_lpm = convertFlowToLpm(Q, flowUnit);
  const ID_mm = selected.size.id_mm;
  const ID_m = ID_mm / 1000;
  const Q_m3s = Q_lpm / 60000;
  const f = mat.frictionFactor;

  const drop_display = mmAqToDisplay(selected.dropPerM_mmAqPerM, pressureUnit);
  const regime = analysis ? flowRegime(analysis.Re) : null;
  const rangeV = analysis ? rangeStatus(analysis.V, RANGES.velocity) : null;
  const rangeU = analysis ? rangeStatus(analysis.unitLoss_Pa, RANGES.unitLossPa) : null;

  const docNo = makeDocNo();
  const today = makeTodayStr();
  const title = '관경 선정 계산결과';
  const docLabel = title;
  const logo = logoDataUrl as string;

  function qConvStr(): string {
    switch (flowUnit) {
      case 'lpm': return `Q = ${esc(Q)} LPM`;
      case 'm3h': return `Q = ${esc(Q)} m³/h × 1,000 / 60 = ${Q_lpm.toFixed(3)} LPM`;
      default:    return `Q = ${esc(Q)} ${esc(flowUnitLabel)} → ${Q_lpm.toFixed(3)} LPM`;
    }
  }

  // §1 입력 요약
  const inputRows: [string, string, string, string][] = [
    ['계산 방법', '정통 Darcy-Weisbach (재질별 고정 f)', '—', '—'],
    ['배관 재질', mat.nameKo + (mat.abbreviation ? ` (${mat.abbreviation})` : ''), '—', `f = ${f}`],
    ['유량 Q', Q, flowUnitLabel, `= ${Q_lpm.toFixed(3)} LPM`],
    ['허용 압력강하 ΔP/L', dP, `${pressDef.label}/m`, '선정 기준값'],
  ];

  // §3 단위 변환 / 대입
  const substitutionItems: string[] = [
    qConvStr(),
    `ID = ${ID_mm.toFixed(1)} mm ÷ 1,000 = ${ID_m.toFixed(5)} m`,
    `Q_SI = ${Q_lpm.toFixed(3)} LPM ÷ 60,000 = ${Q_m3s.toExponential(4)} m³/s`,
    `hf/L = 8 × ${f} × (${Q_m3s.toExponential(4)})² / (π² × ${G} × (${ID_m.toFixed(5)})⁵) × 1,000`,
    `     = ${selected.dropPerM_mmAqPerM.toFixed(3)} mmAq/m → ${drop_display.toFixed(pressDef.dp)} ${pressDef.label}/m`,
    `V = Q_SI / (π · D² / 4) = ${(Q_m3s / (Math.PI * ID_m * ID_m / 4)).toFixed(3)} m/s`,
  ];

  // §4 선정 결과
  const selectedRows: [string, string, string, string][] = [
    ['선정 관경', `${selected.size.nominalA}A`, '—', `ID ${ID_mm.toFixed(1)} mm`],
    ['선정 관경 유속 V', selected.v_ms.toFixed(3), 'm/s', rangeV?.label ?? '—'],
    ['선정 관경 단위손실', drop_display.toFixed(pressDef.dp), `${pressDef.label}/m`, rangeU?.label ?? '—'],
    ...(analysis ? [['선정 관경 Re', formatRe(analysis.Re), '—', regime?.label ?? '—']] as [string, string, string, string][] : []),
    ['허용 압력강하 대비', `${drop_display.toFixed(pressDef.dp)} ≤ ${dP}`, `${pressDef.label}/m`, '적합'],
  ];

  // §5 관경별 상세
  const detailRows = rows.map(r => {
    const drop = mmAqToDisplay(r.dropPerM_mmAqPerM, pressureUnit);
    const isSel = r.size.nominalA === selected.size.nominalA;
    return `<tr${isSel ? ' class="hl"' : ''}>
      <td class="c">${esc(r.size.nominalA)}A</td>
      <td class="num">${r.size.id_mm.toFixed(1)}</td>
      <td class="num">${r.v_ms.toFixed(3)}</td>
      <td class="num">${drop.toFixed(pressDef.dp)}</td>
      <td class="c">${r.ok ? '<span class="badge-ok">허용</span>' : '<span class="badge-warn">초과</span>'}</td>
      <td class="c">${isSel ? '★ 선정' : ''}</td>
    </tr>`;
  }).join('');

  // 페이지 1: §1 입력 + §2 공식 + §3 단위 변환·대입 + §4 선정 결과
  const page1 = `
<section class="sheet">
  ${pageHeader(logo, docLabel, docNo, 1, TOTAL_PAGES)}

  ${secHeader('1.', '입력 요약')}
  <table class="k">
    <colgroup><col style="width:24%"><col style="width:34%"><col style="width:14%"><col style="width:28%"></colgroup>
    <tr><th>항목</th><th>값</th><th>단위</th><th>비고</th></tr>
    ${inputRows.map(r => `<tr><td>${esc(r[0])}</td><td class="num">${esc(r[1])}</td><td class="c">${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join('')}
  </table>

  ${secHeader('2.', '사용 공식 — 정통 Darcy-Weisbach')}
  <table class="k">
    <colgroup><col style="width:24%"><col style="width:76%"></colgroup>
    <tr><th>구분</th><th>식</th></tr>
    <tr><td>단위 마찰손실</td><td><code>hf/L = 8 · f · Q² / (π² · g · D⁵) × 1,000   [mmAq/m]</code></td></tr>
    <tr><td>유속</td><td><code>V = Q / (π · D² / 4)   [m/s]</code></td></tr>
    <tr><td>레이놀즈수</td><td><code>Re = V · D / ν</code></td></tr>
  </table>
  <table class="k">
    <colgroup><col style="width:24%"><col style="width:76%"></colgroup>
    <tr><th>기호</th><th>의미</th></tr>
    <tr><td class="c">f</td><td>재질별 고정 마찰계수 — 탄소강관 0.030, 스테인리스 0.020, 동관 0.020, PVC/C-PVC 0.020</td></tr>
    <tr><td class="c">Q</td><td>유량 [m³/s] = Q[LPM] / 60,000</td></tr>
    <tr><td class="c">D</td><td>관 내경 [m] = D[mm] / 1,000</td></tr>
    <tr><td class="c">g</td><td>중력가속도 = ${G} m/s²</td></tr>
    <tr><td class="c">×1,000</td><td>m → mmAq 환산 (1 m 수두 ≈ 1,000 mmAq, 오차 0.034%)</td></tr>
  </table>
  <div class="note">출처: 일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p</div>

  ${secHeader('3.', '단위 변환 및 대입 과정 (선정 관경)')}
  <table class="k">
    <colgroup><col style="width:8%"><col style="width:92%"></colgroup>
    <tr><th>#</th><th>식 / 대입</th></tr>
    ${substitutionItems.map((s, i) => `<tr><td class="c">${i + 1}</td><td><code>${s}</code></td></tr>`).join('')}
  </table>

  ${secHeader('4.', '선정 결과')}
  <table class="k">
    <colgroup><col style="width:30%"><col style="width:30%"><col style="width:14%"><col style="width:26%"></colgroup>
    <tr><th>항목</th><th>값</th><th>단위</th><th>비고</th></tr>
    ${selectedRows.map(r => `<tr${r[0] === '선정 관경' ? ' class="hl"' : ''}>
      <td>${esc(r[0])}</td><td class="num">${esc(r[1])}</td><td class="c">${esc(r[2])}</td><td class="c">${esc(r[3])}</td></tr>`).join('')}
  </table>

  ${pageFooter(docNo, 1, TOTAL_PAGES)}
</section>`;

  // 페이지 2: §5 관경별 상세 + §6 해석 + §7 표준
  const page2 = `
<section class="sheet">
  ${pageHeader(logo, docLabel, docNo, 2, TOTAL_PAGES)}

  ${secHeader('5.', `관경별 상세 (${esc(mat.nameKo)})`)}
  <table class="k">
    <colgroup><col style="width:14%"><col style="width:18%"><col style="width:18%"><col style="width:22%"><col style="width:14%"><col style="width:14%"></colgroup>
    <tr>
      <th>호칭</th><th>내경 (mm)</th><th>유속 (m/s)</th>
      <th>단위손실 (${esc(pressDef.label)}/m)</th><th>허용 비교</th><th>선정</th>
    </tr>
    ${detailRows}
  </table>
  <div class="note">하이라이트 = 선정 관경 (허용 ΔP/L 이하가 되는 가장 작은 관경)</div>

  ${secHeader('6.', '해석 / 판정')}
  ${analysis ? `
  <table class="k">
    <colgroup><col style="width:30%"><col style="width:25%"><col style="width:25%"><col style="width:20%"></colgroup>
    <tr><th>항목</th><th>측정값</th><th>권장 범위</th><th>판정</th></tr>
    <tr>
      <td>유동 영역</td><td class="num">Re = ${formatRe(analysis.Re)}</td>
      <td>층류 &lt; 2,300, 난류 ≥ 4,000</td>
      <td class="c">${esc(regime!.label)}</td>
    </tr>
    <tr>
      <td>유속 V</td><td class="num">${analysis.V.toFixed(3)} m/s</td>
      <td>${RANGES.velocity.optMin} ~ ${RANGES.velocity.optMax} m/s (최적)</td>
      <td class="c">${esc(rangeV!.label)}</td>
    </tr>
    <tr>
      <td>단위 마찰손실</td><td class="num">${analysis.unitLoss_Pa.toFixed(0)} Pa/m</td>
      <td>${RANGES.unitLossPa.optMin} ~ ${RANGES.unitLossPa.optMax} Pa/m (최적)</td>
      <td class="c">${esc(rangeU!.label)}</td>
    </tr>
  </table>` : '<div class="note">분석값 없음</div>'}

  ${secHeader('7.', '적용 표준')}
  <ul class="refs">
    <li><b>Darcy-Weisbach (정통식)</b> — 일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p</li>
    <li>마찰계수 f 재질별 고정값 — 탄소강관 0.030, 스테인리스 0.020, 동관 0.020, PVC/C-PVC 0.020</li>
    <li><b>SAREK 설비편람</b> — 권장 유속 / 단위 마찰손실 범위</li>
    <li><b>건축기계설비공사 표준시방서</b> (국토교통부)</li>
    <li>관경 라인업: KS D 3507, KS D 5301 등 — 호칭경별 내경 데이터</li>
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
