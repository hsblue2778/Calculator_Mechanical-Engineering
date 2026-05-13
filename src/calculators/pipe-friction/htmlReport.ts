// 관마찰손실 — HTML 산출서 (펌프 양식 채용, 표지 페이지 없음)
// 디자인 출처: pump-system/htmlReport (REPORT_CSS, pageHeader/pageFooter/secHeader)

import logoDataUrl from '../../assets/report-logo.png?inline';
import { REPORT_CSS } from '../pump-system/htmlReport/styles';
import {
  esc, pageHeader, pageFooter, secHeader,
  makeDocNo, makeCalcDateTime, makeTodayStr,
} from '../pump-system/htmlReport/helpers';
import type { PipeMaterial } from '../../data/pipeMaterials';
import type { FrictionResult } from './calc';
import { NU, RHO_WATER, G } from './calc';
import {
  FLOW_UNITS, PRESSURE_UNITS,
  type FlowUnitKey, type PressureUnitKey,
} from './units';
import {
  flowRegime, rangeStatus, RANGES, warnings, formatRe,
} from './analysis';

interface ReportProps {
  res: FrictionResult;
  mat: PipeMaterial;
  inputMode: 'Q' | 'v';
  Q: string;
  v: string;
  D: string;
  L: string;
  fOverride: string;
  flowUnit: FlowUnitKey;
  pressureUnit: PressureUnitKey;
}

const TOTAL_PAGES = 2;

export function buildPipeFrictionReportHtml(props: ReportProps): string {
  const { res, mat, inputMode, Q, v, D, L, fOverride, flowUnit, pressureUnit } = props;

  const pressDef = PRESSURE_UNITS.find(u => u.key === pressureUnit)!;
  const flowUnitLabel = FLOW_UNITS.find(u => u.key === flowUnit)?.label ?? '';
  const flowUnitDivisor = FLOW_UNITS.find(u => u.key === flowUnit)?.divisor ?? 3600;

  const { Q_m3s, D_m, V_ms, Re, hf_m, deltaP_Pa, unitLoss_Pa, f } = res;
  const deltaP_display = deltaP_Pa * pressDef.factor;
  const unitLoss_display = unitLoss_Pa * pressDef.factor;
  const regime = flowRegime(Re);
  const rangeV = rangeStatus(V_ms, RANGES.velocity);
  const rangeU = rangeStatus(unitLoss_Pa, RANGES.unitLossPa);
  const warns = warnings(V_ms, Re, unitLoss_Pa);

  const docNo = makeDocNo();
  const today = makeTodayStr();
  const title = '관마찰손실 계산결과';
  const docLabel = title;
  const logo = logoDataUrl as string;
  const hasOverride = !!fOverride.trim();

  function pressConvStr(): string {
    switch (pressureUnit) {
      case 'kPa':    return `${deltaP_Pa.toFixed(1)} Pa ÷ 1,000`;
      case 'bar':    return `${deltaP_Pa.toFixed(1)} Pa ÷ 100,000`;
      case 'mmAq':   return `${deltaP_Pa.toFixed(1)} Pa ÷ 9.80665`;
      case 'kgfcm2': return `${deltaP_Pa.toFixed(1)} Pa ÷ 98,066.5`;
      case 'MPa':    return `${deltaP_Pa.toFixed(1)} Pa ÷ 1,000,000`;
      default:       return `${deltaP_Pa.toFixed(1)} Pa × ${pressDef.factor}`;
    }
  }

  // §1 입력 요약 행
  const inputRows: [string, string, string, string][] = [
    ['계산 방법', 'Darcy-Weisbach', '—', '—'],
    ['입력 방식', inputMode === 'Q' ? '유량 Q 기준' : '유속 v 기준', '—', '—'],
    ['배관 재질', `${mat.nameKo}${mat.abbreviation ? ` (${mat.abbreviation})` : ''}`, '—', '—'],
    ['마찰계수 f', hasOverride ? fOverride : String(mat.frictionFactor), '—',
      hasOverride ? `기본 ${mat.frictionFactor} → 사용자 입력` : '재질 기본값'],
    inputMode === 'Q'
      ? ['유량 Q', Q, flowUnitLabel, '—']
      : ['유속 v', v, 'm/s', '—'],
    ['관 내경 D', D, 'mm', '—'],
    ['배관 길이 L', L, 'm', '—'],
  ];

  // §3 단위 변환 및 대입 과정 항목
  const substitutionItems: string[] = [];
  if (inputMode === 'Q') {
    substitutionItems.push(`Q = ${esc(Q)} ${esc(flowUnitLabel)} ÷ ${flowUnitDivisor.toLocaleString()} = ${Q_m3s.toFixed(6)} m³/s`);
  }
  substitutionItems.push(`D = ${esc(D)} mm ÷ 1,000 = ${D_m.toFixed(5)} m`);
  const A_m2 = Math.PI * D_m * D_m / 4;
  substitutionItems.push(`A = π × (${D_m.toFixed(5)})² / 4 = ${A_m2.toFixed(6)} m²`);
  substitutionItems.push(inputMode === 'Q'
    ? `V = Q / A = ${Q_m3s.toFixed(6)} / ${A_m2.toFixed(6)} = ${V_ms.toFixed(3)} m/s`
    : `V = ${esc(v)} m/s (입력값)`);
  substitutionItems.push(`Re = V · D / ν = ${V_ms.toFixed(3)} × ${D_m.toFixed(5)} / ${NU} = ${formatRe(Re)}`);
  substitutionItems.push(inputMode === 'Q'
    ? `hf = 8 × ${f.toFixed(4)} × ${esc(L)} × (${Q_m3s.toFixed(6)})² / (π² × ${G} × (${D_m.toFixed(5)})⁵) = ${hf_m.toFixed(3)} m`
    : `hf = ${f.toFixed(4)} × (${esc(L)} / ${D_m.toFixed(5)}) × (${esc(v)})² / (2 × ${G}) = ${hf_m.toFixed(3)} m`);
  substitutionItems.push(`ΔP = ρ · g · hf = ${RHO_WATER} × ${G} × ${hf_m.toFixed(3)} = ${Math.round(deltaP_Pa).toLocaleString()} Pa`);
  substitutionItems.push(`${pressConvStr()} = ${deltaP_display.toFixed(pressDef.dp)} ${pressDef.label}`);

  // 결과 행
  const resultRows: [string, string, string, string][] = [
    ['유속 V', V_ms.toFixed(3), 'm/s', rangeV.label],
    ['레이놀즈수 Re', formatRe(Re), '—', regime.label],
    ['수두 hf', hf_m.toFixed(3), 'm', '—'],
    ['총 마찰손실 ΔP', deltaP_display.toFixed(pressDef.dp), pressDef.label, '—'],
    ['단위 마찰손실', unitLoss_display.toFixed(pressDef.dpM), `${pressDef.label}/m`, rangeU.label],
    ['적용 마찰계수 f', f.toFixed(4), '—', hasOverride ? '사용자 입력' : '재질 기본값'],
  ];

  // 경고 / 해석
  const warnRows = warns.map(w => `
    <tr>
      <td class="c">${w.level === 'error' ? '<span class="badge-warn">위험</span>' : w.level === 'warn' ? '<span class="badge-warn">주의</span>' : '<span class="badge-ok">참고</span>'}</td>
      <td>${esc(w.title)}</td>
      <td>${esc(w.msg)}</td>
    </tr>`).join('');

  // 페이지 1: §1 입력 + §2 공식 + §3 대입
  const page1 = `
<section class="sheet">
  ${pageHeader(logo, docLabel, docNo, 1, TOTAL_PAGES)}

  ${secHeader('1.', '입력 요약')}
  <table class="k">
    <colgroup><col style="width:24%"><col style="width:30%"><col style="width:12%"><col style="width:34%"></colgroup>
    <tr><th>항목</th><th>값</th><th>단위</th><th>비고</th></tr>
    ${inputRows.map(r => `<tr><td>${esc(r[0])}</td><td class="num">${esc(r[1])}</td><td class="c">${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join('')}
  </table>

  ${secHeader('2.', '사용 공식 — Darcy-Weisbach')}
  <table class="k">
    <colgroup><col style="width:24%"><col style="width:76%"></colgroup>
    <tr><th>구분</th><th>식</th></tr>
    <tr><td>마찰손실 수두 (주 공식)</td><td><code>${inputMode === 'Q'
      ? 'hf = 8 · f · L · Q² / (π² · g · D⁵)   [m]'
      : 'hf = f · (L / D) · v² / (2 · g)   [m]'}</code></td></tr>
    <tr><td>단면적</td><td><code>A = π · D² / 4   [m²]</code></td></tr>
    <tr><td>${inputMode === 'Q' ? '유속' : '유량'}</td><td><code>${inputMode === 'Q' ? 'V = Q / A   [m/s]' : 'Q = V · A   [m³/s]'}</code></td></tr>
    <tr><td>레이놀즈수</td><td><code>Re = V · D / ν</code></td></tr>
    <tr><td>압력강하</td><td><code>ΔP = ρ · g · hf   [Pa]</code></td></tr>
  </table>
  <table class="k">
    <colgroup><col style="width:24%"><col style="width:76%"></colgroup>
    <tr><th>기호</th><th>의미</th></tr>
    <tr><td class="c">f</td><td>마찰계수 (무차원)</td></tr>
    <tr><td class="c">L</td><td>배관 길이 [m]</td></tr>
    <tr><td class="c">Q</td><td>유량 [m³/s]</td></tr>
    <tr><td class="c">v, V</td><td>유속 [m/s]</td></tr>
    <tr><td class="c">D</td><td>관 내경 [m]</td></tr>
    <tr><td class="c">g</td><td>중력가속도 = ${G} m/s²</td></tr>
    <tr><td class="c">ρ</td><td>물 밀도 = ${RHO_WATER} kg/m³ (20 °C)</td></tr>
    <tr><td class="c">ν</td><td>물 동점성계수 = ${NU} m²/s (20 °C)</td></tr>
  </table>
  <div class="note">출처: 일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p</div>

  ${secHeader('3.', '단위 변환 및 대입 과정')}
  <table class="k">
    <colgroup><col style="width:8%"><col style="width:92%"></colgroup>
    <tr><th>#</th><th>식 / 대입</th></tr>
    ${substitutionItems.map((s, i) => `<tr><td class="c">${i + 1}</td><td><code>${s}</code></td></tr>`).join('')}
  </table>

  ${pageFooter(docNo, 1, TOTAL_PAGES)}
</section>`;

  // 페이지 2: §4 결과 + §5 해석 + §6 표준
  const page2 = `
<section class="sheet">
  ${pageHeader(logo, docLabel, docNo, 2, TOTAL_PAGES)}

  ${secHeader('4.', '최종 결과')}
  <table class="k">
    <colgroup><col style="width:30%"><col style="width:24%"><col style="width:14%"><col style="width:32%"></colgroup>
    <tr><th>항목</th><th>값</th><th>단위</th><th>판정</th></tr>
    ${resultRows.map(r => `<tr${r[0] === '총 마찰손실 ΔP' ? ' class="hl"' : ''}>
      <td>${esc(r[0])}</td><td class="num">${esc(r[1])}</td><td class="c">${esc(r[2])}</td><td class="c">${esc(r[3])}</td></tr>`).join('')}
  </table>

  ${secHeader('5.', '해석 / 판정')}
  <table class="k">
    <colgroup><col style="width:30%"><col style="width:25%"><col style="width:25%"><col style="width:20%"></colgroup>
    <tr><th>항목</th><th>측정값</th><th>권장 범위</th><th>판정</th></tr>
    <tr>
      <td>유동 영역</td><td class="num">Re = ${formatRe(Re)}</td>
      <td>층류 &lt; 2,300, 난류 ≥ 4,000</td>
      <td class="c">${esc(regime.label)}</td>
    </tr>
    <tr>
      <td>유속 V</td><td class="num">${V_ms.toFixed(3)} m/s</td>
      <td>${RANGES.velocity.optMin} ~ ${RANGES.velocity.optMax} m/s (최적)</td>
      <td class="c">${esc(rangeV.label)}</td>
    </tr>
    <tr>
      <td>단위 마찰손실</td><td class="num">${unitLoss_Pa.toFixed(0)} Pa/m</td>
      <td>${RANGES.unitLossPa.optMin} ~ ${RANGES.unitLossPa.optMax} Pa/m (최적)</td>
      <td class="c">${esc(rangeU.label)}</td>
    </tr>
  </table>
  ${warns.length > 0 ? `
  <table class="k">
    <colgroup><col style="width:14%"><col style="width:24%"><col style="width:62%"></colgroup>
    <tr><th>등급</th><th>항목</th><th>설명</th></tr>
    ${warnRows}
  </table>` : '<div class="note">권장 범위 내 — 추가 경고 없음</div>'}

  ${secHeader('6.', '적용 표준')}
  <ul class="refs">
    <li><b>Darcy-Weisbach</b> — 일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p</li>
    <li>마찰계수 f 재질별 고정값 — 탄소강관 0.030, 스테인리스 0.020, 동관 0.020, PVC/C-PVC 0.020</li>
    <li><b>SAREK 설비편람</b> — 권장 유속 / 단위 마찰손실 범위</li>
    <li><b>건축기계설비공사 표준시방서</b> (국토교통부)</li>
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
