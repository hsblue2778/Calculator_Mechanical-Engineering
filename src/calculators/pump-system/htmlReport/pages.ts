// HTML 산출서 — 2~5페이지 콘텐츠 생성
// 레퍼런스: reference/handoff_html_export/HVAC 펌프 산출서.html
// 데이터: PrintReportContent.tsx §1~§9 와 동일 매핑

import { esc, pageHeader, pageFooter, secHeader, makeCalcDateTime } from './helpers';
import type { PumpHvacReportProps } from './types';
import { PRESSURE_UNITS_PUMP } from '../units';
import type { EquipKind } from '../calc';

const TOTAL_PAGES = 5;

function getBepVerdict(Q_op: number, Q_BEP: number): string {
  if (Q_BEP <= 0) return 'na';
  const ratio = Q_op / Q_BEP;
  if (ratio >= 0.8 && ratio <= 1.1) return 'optimal';
  if ((ratio >= 0.7 && ratio < 0.8) || (ratio > 1.1 && ratio <= 1.25)) return 'acceptable';
  return 'out-of-range';
}

const KIND_KO: Record<EquipKind, string> = {
  'control-valve': '컨트롤 밸브',
  'heat-exchanger': '열교환기',
  'filter': '필터',
  'pump': '펌프',
  'other': '기타',
};

// ── 2페이지: §1 입력요약 + §2 배관마찰 + §3 부속류 ──────────────
export function buildPage2(props: PumpHvacReportProps, logoDataUrl: string, docNo: string): string {
  const { result: r, fieldLabel, systemMode, fluid, tempC, Q_m3s, Q_display, flowUnitLabel } = props;
  const isClosed = systemMode === 'closed';

  const FLUID_LABELS: Record<string, string> = {
    'water': '냉수', 'cooling-water': '냉각수', 'hot-water': '온수',
    'glycol-eg': 'EG 브라인', 'glycol-pg': 'PG 브라인',
  };
  const fluidLabel = FLUID_LABELS[fluid] ?? fluid;
  const Q_lpm = (Q_m3s * 60000).toFixed(1);
  const Q_m3h = (Q_m3s * 3600).toFixed(3);
  const docLabel = `${esc(fieldLabel)} 펌프 시스템 계산결과`;

  // §1 입력요약 행들
  const sec1Rows = `
    <tr><td>분야</td><td class="c">${esc(fieldLabel)}</td><td class="c">—</td><td>—</td></tr>
    <tr><td>시스템 모드</td><td class="c">${esc(isClosed ? '폐회로 (Closed)' : '개방계 (Open)')}</td><td class="c">—</td><td>사용자 선택</td></tr>
    <tr><td>운전 유체</td><td class="c">${esc(fluidLabel)}</td><td class="c">—</td><td>Phase 1.0 청수/온수 한정</td></tr>
    <tr><td>운전 온도</td><td class="num">${esc(tempC)}</td><td class="c">°C</td><td>—</td></tr>
    <tr><td>정격 유량 Q</td><td class="num">${esc(Q_display)}</td><td class="c">${esc(flowUnitLabel)}</td><td>${esc(Q_lpm)} LPM = ${esc(Q_m3h)} m³/h</td></tr>
    <tr><td>유체 밀도 ρ</td><td class="num">${r.rho.toFixed(2)}</td><td class="c">kg/m³</td><td>출처: NIST WebBook (webbook.nist.gov)</td></tr>
    <tr><td>유체 동점성 ν</td><td class="num">${(r.nu * 1e6).toFixed(4)} ×10⁻⁶</td><td class="c">m²/s</td><td>출처: NIST WebBook</td></tr>
    <tr><td>포화수증기압 P_vapor</td><td class="num">${r.P_vapor_Pa.toFixed(2)}</td><td class="c">Pa</td><td>Antoine 식, Engineering Toolbox</td></tr>
    <tr><td>중력가속도 g</td><td class="num">9.81</td><td class="c">m/s²</td><td>표준값</td></tr>`;

  // §2 배관마찰 행들
  const sucRows = r.sucPipes.map(p => `
    <tr>
      <td class="c">${esc(p.pipeLabel)}</td><td class="c">흡입</td>
      <td class="c">${esc(p.materialNameKo)}</td><td class="c">${esc(p.scheduleLabel)}</td>
      <td class="c">${esc(p.nominalA)}A</td>
      <td class="num">${p.id_mm.toFixed(1)}</td><td class="num">${p.L_m.toFixed(2)}</td>
      <td class="num">${p.f.toFixed(3)}</td><td class="num">${p.V_ms.toFixed(4)}</td>
      <td class="num">${Math.round(p.Re).toLocaleString()}</td>
      <td class="num">${p.hf_m.toFixed(5)}</td>
    </tr>`).join('');
  const disRows = r.disPipes.map(p => `
    <tr>
      <td class="c">${esc(p.pipeLabel)}</td><td class="c">토출</td>
      <td class="c">${esc(p.materialNameKo)}</td><td class="c">${esc(p.scheduleLabel)}</td>
      <td class="c">${esc(p.nominalA)}A</td>
      <td class="num">${p.id_mm.toFixed(1)}</td><td class="num">${p.L_m.toFixed(2)}</td>
      <td class="num">${p.f.toFixed(3)}</td><td class="num">${p.V_ms.toFixed(4)}</td>
      <td class="num">${Math.round(p.Re).toLocaleString()}</td>
      <td class="num">${p.hf_m.toFixed(5)}</td>
    </tr>`).join('');

  // §3 부속류
  const fittingRows = r.fittingDetails.map(d => `
    <tr>
      <td class="c">${esc(d.fittingLabel)}</td><td class="c">${esc(d.pipeLabel)}</td>
      <td>${esc(d.nameKo)}</td>
      <td class="num">${d.K.toFixed(2)}</td><td class="num">${d.V_ms.toFixed(4)}</td>
      <td class="num">${d.qty}</td><td class="num">${d.h_total_m.toFixed(5)}</td>
    </tr>`).join('');
  const sec3Html = r.fittingDetails.length > 0 ? `
  ${secHeader('3.', '부속류 손실 (K-Method)')}
  <table class="k">
    <colgroup><col style="width:7%"><col style="width:11%"><col style="width:42%"><col style="width:8%"><col style="width:11%"><col style="width:7%"><col style="width:14%"></colgroup>
    <tr><th>번호</th><th>배관참조</th><th>부속명</th><th>K</th><th>유속 (m/s)</th><th>수량</th><th>손실합계 (m)</th></tr>
    ${fittingRows}
    <tr class="total"><td colspan="6">합계</td><td class="num">${r.totalFittingLoss_m.toFixed(5)}</td></tr>
  </table>
  <div class="note"><code>h_K = K · V² / (2g)</code> — Perry's Chemical Engineers' Handbook 8th Ed (2008). K값 범위: 난류 (Re &gt; 4,000) 기준 단일 K</div>` : '';

  return `
<!-- ─── 2페이지: 입력요약 + 마찰손실 ─── -->
<section class="sheet">
  ${pageHeader(logoDataUrl, docLabel, docNo, 2, TOTAL_PAGES)}
  ${secHeader('1.', '입력 요약')}
  <table class="k">
    <colgroup><col style="width:20%"><col style="width:18%"><col style="width:10%"><col style="width:52%"></colgroup>
    <tr><th>항목</th><th>값</th><th>단위</th><th>비고 / 출처</th></tr>
    ${sec1Rows}
  </table>
  ${secHeader('2.', '배관 마찰손실')}
  <table class="k">
    <colgroup>
      <col style="width:7%"><col style="width:7%"><col style="width:11%"><col style="width:8%">
      <col style="width:8%"><col style="width:8%"><col style="width:7%"><col style="width:8%"><col style="width:10%"><col style="width:8%"><col style="width:18%">
    </colgroup>
    <tr>
      <th>번호</th><th>측</th><th>재질</th><th>두께규격</th><th>호칭경</th>
      <th>내경 (mm)</th><th>길이 (m)</th><th>f</th><th>유속 (m/s)</th><th>Re</th><th>마찰손실 (m)</th>
    </tr>
    ${sucRows}
    <tr class="total"><td colspan="10">흡입측 합계</td><td class="num">${r.sucPipeLoss_total_m.toFixed(5)}</td></tr>
    ${disRows}
    <tr class="total"><td colspan="10">토출측 합계</td><td class="num">${r.disPipeLoss_total_m.toFixed(5)}</td></tr>
  </table>
  <div class="note">
    공식: <code>hf = f·(L/D)·V²/(2g)</code> — Darcy-Weisbach<br/>
    마찰계수 f 유동 영역별 자동 산출 — 층류 64/Re · 천이(2,300~4,000) 3차 보간 · 난류 Colebrook-White(1939) 반복해 ·
    Re = V·D/ν(운전 온도 기준) · 절대조도 ε: 재질×신관/노후 (Moody 1944 · ASHRAE Ch.22 · NFPA 13 · KDS 57)
  </div>
  ${sec3Html}
  ${pageFooter(docNo, 2, TOTAL_PAGES)}
</section>`;
}

// ── 3페이지: §4 장비류 + §5 양정구성 + §6 정수두 + §7 안전율 ───
export function buildPage3(props: PumpHvacReportProps, logoDataUrl: string, docNo: string): string {
  const { result: r, fieldLabel, systemMode, HsStr, HdStr, PresStr, presUnit, PatmStr,
    headMarginStr, powerMarginStr, npshMarginStr, presetApplied } = props;
  const isClosed = systemMode === 'closed';
  const docLabel = `${esc(fieldLabel)} 펌프 시스템 계산결과`;
  const presLabel = PRESSURE_UNITS_PUMP.find(u => u.key === presUnit)?.label ?? 'kPa';

  // §4 장비류
  const equipRows = r.equipDetails.map(e => `
    <tr>
      <td class="c">${esc(e.equipLabel)}</td><td class="c">${esc(e.pipeLabel)}</td>
      <td>${esc(KIND_KO[e.kind] ?? '기타')}</td>
      <td class="wrap">${esc(e.name)}</td>
      <td class="num">${e.dP_Pa.toFixed(1)}</td>
      <td class="c">${e.dirtyApplied ? 'Dirty ×2.5' : '—'}</td>
      <td class="num">${e.h_m.toFixed(5)}</td>
    </tr>`).join('');
  const sec4Html = r.equipDetails.length > 0 ? `
  ${secHeader('4.', '장비류 손실')}
  <table class="k">
    <colgroup><col style="width:7%"><col style="width:11%"><col style="width:14%"><col style="width:30%"><col style="width:14%"><col style="width:10%"><col style="width:14%"></colgroup>
    <tr><th>번호</th><th>배관참조</th><th>종류</th><th>장비명</th><th>입력 ΔP (Pa)</th><th>Dirty</th><th>손실수두 (m)</th></tr>
    ${equipRows}
    <tr class="total"><td colspan="6">합계</td><td class="num">${r.equipLoss_m.toFixed(5)}</td></tr>
  </table>` : '';

  // §5 양정구성
  const bd = r.headBreakdown_m;
  const TDH = r.TDH_m;
  const pct = (v: number) => TDH > 0 ? ((v / TDH) * 100).toFixed(1) + '%' : '—';
  const cvNote = r.cvVerdict !== 'na'
    ? `β = ${r.cvAuthority.toFixed(2)} (${({ 'ok': '권장 범위', 'low-margin': '권위 부족', 'too-low': '제어성 위험', 'high-margin': '다소 과도', 'too-high': '동력 낭비', 'na': '' } as Record<string, string>)[r.cvVerdict]})`
    : '—';
  const bdRows = [
    { label: '컨트롤 밸브', value: bd.controlValve, note: cvNote },
    { label: '열교환기',    value: bd.heatExchanger, note: '—' },
    { label: '필터',        value: bd.filter,        note: '—' },
    { label: '펌프 부속',   value: bd.pumpEquip,     note: '—' },
    { label: '기타 장비',   value: bd.otherEquip,    note: '—' },
    { label: '배관 마찰',   value: bd.pipeFriction,  note: '직관 + 부속' },
    { label: '정수두 + 잔류', value: bd.staticAndResidual, note: '—' },
  ].map(row => `
    <tr><td>${esc(row.label)}</td><td class="num">${row.value.toFixed(4)}</td><td class="num">${pct(row.value)}</td><td class="c">${esc(row.note)}</td></tr>`).join('');

  // §6 정수두
  const patmLabel = isClosed ? '시스템 충진 절대압 P_fill' : '흡입측 표면 절대압 P_atm';
  const HsLabel = isClosed ? '펌프 위치 수두 차 Hs' : '흡입측 정수두 Hs';
  const HdVal = isClosed ? '0 (폐회로 모드)' : `${esc(HdStr)} m`;
  const staticVal = isClosed ? '0 (폐회로 모드)' : `${r.staticHead_m.toFixed(3)} m`;

  return `
<!-- ─── 3페이지: 장비류 + 양정구성 + 정수두 ─── -->
<section class="sheet">
  ${pageHeader(logoDataUrl, docLabel, docNo, 3, TOTAL_PAGES)}
  ${sec4Html}
  ${secHeader('5.', '양정 구성 분석')}
  <table class="k">
    <colgroup><col style="width:34%"><col style="width:18%"><col style="width:18%"><col style="width:30%"></colgroup>
    <tr><th>항목</th><th>값 (m)</th><th>TDH 대비 (%)</th><th>비고</th></tr>
    ${bdRows}
    <tr class="hl"><td>TDH 합계</td><td class="num">${TDH.toFixed(4)}</td><td class="num">100%</td><td class="c">—</td></tr>
  </table>
  <div class="note">출처: ASHRAE Pumping Authority guideline — 컨트롤 밸브 권위 β = ΔP_CV / TDH (권장 0.25~0.50)</div>

  ${secHeader('6.', '정수두 · 잔류압력')}
  <table class="k">
    <colgroup><col style="width:34%"><col style="width:22%"><col style="width:44%"></colgroup>
    <tr><th>항목</th><th>값</th><th>비고</th></tr>
    <tr><td>${esc(HsLabel)}</td><td class="num">${esc(HsStr)} m</td><td>${isClosed ? '팽창탱크(충진 기준점) 대비 펌프 위치' : '음수 = 흡입 양정'}</td></tr>
    <tr><td>${isClosed ? '토출측 정수두 Hd (폐회로 — 사용 안 함)' : '토출측 정수두 Hd'}</td><td class="num">${HdVal}</td><td>—</td></tr>
    <tr><td>정수두 차 (Hd − Hs)</td><td class="num">${staticVal}</td><td>—</td></tr>
    <tr><td>잔류 토출 압력 P_res</td><td class="num">${esc(PresStr)} ${esc(presLabel)}</td><td>수두 환산: ${r.Hres_m.toFixed(3)} m</td></tr>
    <tr><td>${esc(patmLabel)}</td><td class="num">${esc(PatmStr)} kPa</td><td>NPSHa 계산 기준 (${isClosed ? 'P_fill' : 'P_atm'})</td></tr>
  </table>

  ${secHeader('7.', '안전율 프리셋')}
  <table class="k">
    <colgroup><col style="width:34%"><col style="width:22%"><col style="width:44%"></colgroup>
    <tr><th>항목</th><th>적용값</th><th>비고</th></tr>
    <tr><td>양정 여유</td><td class="num">${esc(headMarginStr)} %</td><td>${presetApplied.head ? `${esc(fieldLabel)} 기본값` : '사용자 수정'}</td></tr>
    <tr><td>동력 여유</td><td class="num">${esc(powerMarginStr)} 배</td><td>${presetApplied.power ? `${esc(fieldLabel)} 기본값` : '사용자 수정'}</td></tr>
    <tr><td>NPSH 여유</td><td class="num">${esc(npshMarginStr)} m</td><td>${presetApplied.npsh ? `${esc(fieldLabel)} 기본값` : '사용자 수정'}</td></tr>
  </table>
  ${pageFooter(docNo, 3, TOTAL_PAGES)}
</section>`;
}

// ── 4페이지: §8 NPSHa + §9 최종결과 + §10 운전점 ────────────────
export function buildPage4(props: PumpHvacReportProps, logoDataUrl: string, docNo: string): string {
  const { result: r, fieldLabel, systemMode, PatmStr, headMarginStr, powerMarginStr,
    Q_m3s, npshrStr, pumpCurve, BEP_Q_m3h, operatingPoint, pumpCurveFamily, catalogHz } = props;
  const isClosed = systemMode === 'closed';
  const docLabel = `${esc(fieldLabel)} 펌프 시스템 계산결과`;
  const effectiveCatalogHz = catalogHz ?? 60;
  const patmLabel = isClosed ? 'P_fill' : 'P_atm';
  const patm_Pa = ((parseFloat(PatmStr) || 101.325) * 1000).toFixed(0);

  // §8 NPSHa 변수
  const npshNpshrRows = r.NPSHr_m > 0 ? `
    <tr>
      <td>NPSHr (카탈로그)</td>
      <td class="num">${r.NPSHr_m.toFixed(4)}</td>
      <td class="c">m</td>
      <td>펌프 카탈로그 입력값</td>
    </tr>
    <tr>
      <td>NPSHa − NPSHr (실제 여유)</td>
      <td class="num">${r.NPSHmargin_actual_m != null ? r.NPSHmargin_actual_m.toFixed(4) : '—'}</td>
      <td class="c">m</td>
      <td>${
        r.NPSHverdict === 'pass' ? `여유 통과 (&gt;= ${esc(npshrStr)} m + 여유)` :
        r.NPSHverdict === 'low-margin' ? '여유 부족 (0 이상이나 권장 여유 미달)' :
        r.NPSHverdict === 'risk' ? '캐비테이션 위험 (NPSHa &lt; NPSHr)' : '—'
      }</td>
    </tr>` : '';

  // §9 최종결과 NPSHa 비고
  const npshNote = (() => {
    if (r.NPSHverdict === 'na') return 'NPSHr 미입력 — 펌프 선정 단계에서 비교 <span class="badge-ok">마진 양호</span>';
    if (r.NPSHverdict === 'pass') return `여유 통과 (NPSHa − NPSHr = ${r.NPSHmargin_actual_m?.toFixed(2)} m) <span class="badge-ok">통과</span>`;
    if (r.NPSHverdict === 'low-margin') return `여유 부족 (NPSHa − NPSHr = ${r.NPSHmargin_actual_m?.toFixed(2)} m) <span class="badge-warn">주의</span>`;
    if (r.NPSHverdict === 'risk') return `캐비테이션 위험 (NPSHa − NPSHr = ${r.NPSHmargin_actual_m?.toFixed(2)} m) <span class="badge-warn">위험</span>`;
    return '—';
  })();

  // §10 운전점 추가 행들
  const hasPumpCurve = pumpCurve && pumpCurve.length >= 2;
  const opPoint = operatingPoint ?? null;
  const hasBep = BEP_Q_m3h != null && BEP_Q_m3h > 0;
  const bepRatioStr = opPoint && hasBep ? `${((opPoint.Q_m3h / BEP_Q_m3h!) * 100).toFixed(0)}%` : '—';
  const bepVerdict = opPoint && hasBep ? getBepVerdict(opPoint.Q_m3h, BEP_Q_m3h!) : 'na';
  const verdictLabel: Record<string, string> = {
    optimal: '최적 영역 (80~110%)',
    acceptable: '허용 영역 (70~80% 또는 110~125%)',
    'out-of-range': '범위 이탈',
    na: '—',
  };

  const opRows = [
    opPoint ? `<tr><td>운전점 (펌프·시스템 교점)</td><td>Q = ${opPoint.Q_m3h.toFixed(2)} m³/h, H = ${opPoint.H_m.toFixed(2)} m</td><td>펌프 곡선과 시스템 곡선의 교점 (선형 보간)</td></tr>` : '',
    hasBep ? `<tr><td>BEP 유량 Q_BEP (카탈로그 ${effectiveCatalogHz}Hz)</td><td>${BEP_Q_m3h!.toFixed(2)} m³/h</td><td>펌프 카탈로그 최고효율점</td></tr>` : '',
    opPoint && hasBep ? `<tr><td>BEP 대비 운전점</td><td>${esc(bepRatioStr)}</td><td>${esc(verdictLabel[bepVerdict])}</td></tr>` : '',
  ].join('');

  // VFD 시리즈 표
  const hasFamily = pumpCurveFamily && pumpCurveFamily.length > 0;
  const vfdTable = hasFamily ? `
  <p style="font-size:10pt;font-weight:700;margin:10px 0 4px 0">인버터(VFD) 운전 시리즈 — 상사칙(Affinity Laws) 적용</p>
  <table class="k">
    <tr>
      <th>Hz</th><th>Q [m³/h]</th><th>H [m]</th><th>P [kW]</th>
      ${hasBep ? '<th>BEP %</th><th>적정성</th>' : ''}
    </tr>
    ${pumpCurveFamily!.map(curve => {
      const isCat = curve.hz === effectiveCatalogHz;
      const op = curve.operatingPoint;
      const bepQAtHz = hasBep && effectiveCatalogHz > 0 ? (BEP_Q_m3h! * curve.hz / effectiveCatalogHz) : null;
      const bepPct = op && bepQAtHz ? ((op.Q_m3h / bepQAtHz) * 100).toFixed(0) + '%' : '—';
      const vLabel: Record<string, string> = { optimal: '최적', acceptable: '허용', 'out-of-range': '권장 외', na: '—' };
      return `<tr${isCat ? ' style="background:#EFF6FF"' : ''}>
        <td${isCat ? ' style="font-weight:700"' : ''}>${curve.hz} Hz${isCat ? ' (카탈로그)' : ''}</td>
        <td class="num">${op ? op.Q_m3h.toFixed(2) : '—'}</td>
        <td class="num">${op ? op.H_m.toFixed(2) : '—'}</td>
        <td class="num">${op ? (op.P_W / 1000).toFixed(3) : '—'}</td>
        ${hasBep ? `<td class="num">${op ? bepPct : '—'}</td><td class="c">${op ? (vLabel[curve.bepVerdict] ?? '—') : '—'}</td>` : ''}
      </tr>`;
    }).join('')}
  </table>
  <div class="note">상사칙: Q∝N, H∝N², P∝N³ — Hydraulic Institute Standards / ISO 9906 / ASHRAE Pump Handbook</div>` : '';

  // 펌프 H-Q 입력점 표
  const hqTable = hasPumpCurve ? `
  <p style="font-size:10pt;font-weight:700;margin:8px 0 4px 0">펌프 H-Q 곡선 입력 점 (${effectiveCatalogHz}Hz 기준)</p>
  <table class="k">
    <tr><th>점</th><th>Q [m³/h]</th><th>H [m]</th></tr>
    ${pumpCurve!.map((p, i) => `<tr><td class="c">${i + 1}</td><td class="num">${p.Q_m3h.toFixed(2)}</td><td class="num">${p.H_m.toFixed(2)}</td></tr>`).join('')}
  </table>` : '<div class="note">펌프 H-Q 곡선 미입력 — 시스템 곡선만 계산됨</div>';

  return `
<!-- ─── 4페이지: NPSHa + 최종결과 + 운전점 ─── -->
<section class="sheet">
  ${pageHeader(logoDataUrl, docLabel, docNo, 4, TOTAL_PAGES)}
  ${secHeader('8.', 'NPSHa 변수 추적표')}
  <table class="k">
    <colgroup><col style="width:24%"><col style="width:18%"><col style="width:10%"><col style="width:48%"></colgroup>
    <tr><th>변수</th><th>값</th><th>단위</th><th>출처 / 공식</th></tr>
    <tr><td>${esc(patmLabel)}</td><td class="num">${esc(patm_Pa)}</td><td class="c">Pa</td><td>사용자 입력 / ${isClosed ? '폐회로 충진압력' : '대기압 기준'}</td></tr>
    <tr><td>P_vapor</td><td class="num">${r.P_vapor_Pa.toFixed(2)}</td><td class="c">Pa</td><td>Antoine 식 (Engineering Toolbox, 0~100°C 물)</td></tr>
    <tr><td>ρ (밀도)</td><td class="num">${r.rho.toFixed(2)}</td><td class="c">kg/m³</td><td>NIST WebBook</td></tr>
    <tr><td>g</td><td class="num">9.81</td><td class="c">m/s²</td><td>표준값</td></tr>
    <tr><td>Hs${isClosed ? ' (펌프 위치 수두 차)' : ''}</td><td class="num">${esc(props.HsStr)}</td><td class="c">m</td><td>사용자 입력</td></tr>
    <tr><td>Σhf_suc (흡입 배관 합산)</td><td class="num">${r.sucPipeLoss_total_m.toFixed(5)}</td><td class="c">m</td><td>Darcy-Weisbach (배관별 합산)</td></tr>
    <tr><td>Σh_fit_suc (흡입 부속 합산)</td><td class="num">${r.sucFittingLoss_m.toFixed(5)}</td><td class="c">m</td><td>K-method (흡입측 합산)</td></tr>
    <tr class="hl"><td>NPSHa</td><td class="num">${r.NPSHa_m.toFixed(4)}</td><td class="c">m</td><td>(${esc(patmLabel)} − P_vapor) / (ρ·g) + Hs − Σhf_suc − Σh_fit_suc</td></tr>
    ${npshNpshrRows}
  </table>
  <div class="note">출처: Hydraulic Institute Standards HI 9.6.1${isClosed ? ' / ASHRAE Handbook — Closed-Loop Hydronic System' : ''}</div>

  ${secHeader('9.', '최종 결과')}
  <table class="k">
    <colgroup><col style="width:30%"><col style="width:18%"><col style="width:10%"><col style="width:42%"></colgroup>
    <tr><th>항목</th><th>값</th><th>단위</th><th>비고</th></tr>
    <tr><td>총양정 TDH</td><td class="num">${r.TDH_m.toFixed(4)}</td><td class="c">m</td><td>${isClosed ? '폐회로: 정수두 차 0 포함' : '—'}</td></tr>
    <tr class="hl"><td>설계 양정</td><td class="num">${r.designHead_m.toFixed(4)}</td><td class="c">m</td><td>TDH × (1 + ${esc(headMarginStr)}%)</td></tr>
    <tr><td>NPSHa</td><td class="num">${r.NPSHa_m.toFixed(4)}</td><td class="c">m</td><td>${npshNote}</td></tr>
    <tr><td>이론 동력</td><td class="num">${(r.theoPower_W / 1000).toFixed(4)}</td><td class="c">kW</td><td>η = 0.65, P = ρ·g·Q·H/η</td></tr>
    <tr><td>이론 동력 (HP)</td><td class="num">${(r.theoPower_W / 745.7).toFixed(4)}</td><td class="c">HP</td><td>1 HP = 745.7 W</td></tr>
    <tr class="hl"><td>설계 동력</td><td class="num">${(r.designPower_W / 1000).toFixed(4)}</td><td class="c">kW</td><td>이론 동력 × ${esc(powerMarginStr)}배</td></tr>
    <tr><td>권장 모터 정격 (IEC 60034-1)</td><td class="num">${r.recommendedMotorRating_kW > 0 ? r.recommendedMotorRating_kW : '—'}</td><td class="c">kW</td><td>설계 동력 이상 최소 IEC 표준 정격 / IE3 효율등급 이상 권장</td></tr>
  </table>

  ${secHeader('10.', '운전점 요약')}
  <table class="k">
    <colgroup><col style="width:30%"><col style="width:30%"><col style="width:40%"></colgroup>
    <tr><th>항목</th><th>값</th><th>비고</th></tr>
    <tr><td>시스템 H_static</td><td class="num">${r.H_static_now_m.toFixed(3)} m</td><td>정수두 (폐회로: 0)</td></tr>
    <tr><td>시스템 저항 계수 k</td><td class="num">${r.k_system.toFixed(6)} m / (m³/h)²</td><td>H(Q) = H_static + k·Q²</td></tr>
    <tr><td>설계 유량 Q_design</td><td class="num">${(Q_m3s * 3600).toFixed(3)} m³/h</td><td>—</td></tr>
    <tr><td>총양정 TDH</td><td class="num">${r.TDH_m.toFixed(3)} m</td><td>—</td></tr>
    <tr><td>카탈로그 기준 Hz</td><td class="num">${effectiveCatalogHz} Hz</td><td>H-Q 곡선 측정 주파수</td></tr>
    ${opRows}
  </table>
  ${vfdTable}
  ${hqTable}
  ${pageFooter(docNo, 4, TOTAL_PAGES, '본 산출서는 설계 단계 검토용입니다.')}
</section>`;
}

// ── 5페이지: §11 적용표준 ────────────────────────────────────────
export function buildPage5(props: PumpHvacReportProps, logoDataUrl: string, docNo: string): string {
  const { fieldLabel, systemMode } = props;
  const isClosed = systemMode === 'closed';
  const docLabel = `${esc(fieldLabel)} 펌프 시스템 계산결과`;
  const calcDateTime = makeCalcDateTime();

  const closedRef = isClosed
    ? '<li><b>ASHRAE Handbook</b> — Closed-Loop Hydronic Systems 항목 (폐회로 NPSHa 식)</li>'
    : '';

  return `
<!-- ─── 5페이지: 적용 표준 ─── -->
<section class="sheet">
  ${pageHeader(logoDataUrl, docLabel, docNo, 5, TOTAL_PAGES)}
  ${secHeader('11.', `적용 표준 (${esc(fieldLabel)})`)}
  <ul class="refs">
    <li><b>ASHRAE Handbook</b> — HVAC Systems and Equipment (Pumps Chapter)</li>
    ${closedRef}
    <li><b>SAREK 설비편람</b> (한국설비기술협회)</li>
    <li><b>건축기계설비공사 표준시방서</b> (국토교통부)</li>
    <li><b>Hydraulic Institute Standards HI 9.6.1</b> (NPSH)</li>
    <li><b>Perry's Chemical Engineers' Handbook 8th Ed</b> (2008) — K값 출처</li>
    <li><b>NIST Chemistry WebBook</b> — 청수/온수 물성 (webbook.nist.gov)</li>
    <li><b>Engineering Toolbox</b> — 포화수증기압 Antoine 식</li>
    <li>일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p — Darcy-Weisbach</li>
    <li><b>IEC 60034-1</b> Rotating electrical machines — Rating and performance (모터 표준 정격)</li>
    <li><b>ASHRAE Filtration &amp; Air Cleaning</b> — 필터 Dirty 마진 ×2.5</li>
    <li><b>ASHRAE Pumping Authority guideline</b> — 컨트롤 밸브 권위 β = ΔP_CV / TDH (권장 0.25~0.50)</li>
    <li><b>Hydraulic Institute Standards (Affinity Laws) / ISO 9906 / ASHRAE Pump Handbook</b> — 인버터(VFD) 상사칙 Q∝N, H∝N², P∝N³</li>
  </ul>
  <div class="note" style="margin-top:14px">
    Phase 1.0 청수/온수 한정 — EG/PG 브라인은 Phase 1.5에서 추가 예정 · kW / HP 단위 선택 가능
  </div>

  <div style="margin-top:auto;text-align:right;font-size:9pt;color:var(--mute);padding-top:18mm">
    계산 일시: ${esc(calcDateTime)}
  </div>
  ${pageFooter(docNo, 5, TOTAL_PAGES, 'Mechanical Engineering Calculation')}
</section>`;
}
