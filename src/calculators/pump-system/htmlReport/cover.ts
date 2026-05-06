// HTML 산출서 — 1페이지(표지) 생성
import { esc, makeTodayStr, makeCoverKey } from './helpers';
import type { PumpHvacReportProps } from './types';

export function buildCoverPage(props: PumpHvacReportProps, logoDataUrl: string, docNo: string): string {
  const { fieldLabel, fieldConfig, result, Q_m3s, headMarginStr } = props;
  const today = makeTodayStr();
  const coverKey = makeCoverKey(fieldLabel);

  const Q_m3h = (Q_m3s * 3600).toFixed(3);
  const designHead = result.designHead_m.toFixed(4);
  const standardsStr = fieldConfig.standards.join(' · ');

  // 분야 표시 라벨
  const systemSubtitle = (() => {
    if (fieldLabel === 'HVAC') return 'HVAC · 냉온수 순환 계통';
    if (fieldLabel === 'Process') return 'Process · 공정 배관 계통';
    return `${fieldLabel} · 펌프 계통`;
  })();

  const headMarginNote = `TDH × (1 + ${esc(headMarginStr)}%)`;

  return `
<!-- ─── 1페이지: 표지 ─── -->
<section class="sheet cover" style="display:flex;flex-direction:column">
  <div class="cover-band">
    <span class="tag">CALCULATION RESULT</span>
    <span class="docno">DOC. NO.   ${esc(docNo)}</span>
  </div>
  <div class="cover-band-thin"></div>

  <div class="cover-body">
    <div class="cover-kicker">기계설비 설계 산출서</div>

    <div class="cover-titleblock">
      <div class="system">${esc(systemSubtitle)}</div>
      <h1>펌프 양정 · 동력 산정 계산서</h1>
      <div class="en">Pump Head &amp; Power Sizing Calculation Report</div>
    </div>

    <div class="cover-info">
      <table>
        <tr>
          <td class="lbl">PROJECT</td>
          <td class="val" colspan="3" contenteditable="true" data-key="project" data-ph="프로젝트명 입력"></td>
        </tr>
        <tr>
          <td class="lbl">CLIENT</td>
          <td class="val" contenteditable="true" data-key="client" data-ph="발주처"></td>
          <td class="lbl">LOCATION</td>
          <td class="val" contenteditable="true" data-key="location" data-ph="현장위치"></td>
        </tr>
        <tr>
          <td class="lbl">SYSTEM</td>
          <td class="val" contenteditable="true" data-key="system">${esc(fieldLabel)} 펌프</td>
          <td class="lbl">REV.</td>
          <td class="val" contenteditable="true" data-key="rev">0</td>
        </tr>
        <tr>
          <td class="lbl">DESIGN Q</td>
          <td class="val strong">${esc(Q_m3h)} m³/h</td>
          <td class="lbl">DESIGN H</td>
          <td class="val strong">${esc(designHead)} m <span style="font-size:8pt;font-weight:400;color:var(--mute)">(${esc(headMarginNote)})</span></td>
        </tr>
        <tr>
          <td class="lbl">PREPARED</td>
          <td class="val" contenteditable="true" data-key="prepared" data-ph="작성자"></td>
          <td class="lbl">DATE</td>
          <td class="val" contenteditable="true" data-key="date">${esc(today)}</td>
        </tr>
        <tr>
          <td class="lbl">STANDARDS</td>
          <td class="val" colspan="3" contenteditable="true" data-key="standards">${esc(standardsStr)}</td>
        </tr>
      </table>
    </div>
  </div>

  <div class="cover-foot">
    <div class="signoff">
      <div class="company" contenteditable="true" data-key="company" data-ph="회사명 입력">COMPANY NAME</div>
      <span contenteditable="true" data-key="team" data-ph="팀명 입력">기술팀</span><br/>
      <span contenteditable="true" data-key="team_en" data-ph="Team (EN)">TECHNICAL TEAM</span>
    </div>
    <div class="biglogo">
      <img src="${esc(logoDataUrl)}" alt="Logo"/>
    </div>
  </div>
</section>

<script>
  (function(){
    const KEY = '${coverKey}';
    const cells = document.querySelectorAll('.cover-info td.val[contenteditable="true"]');
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e){}
    cells.forEach(td => {
      const k = td.dataset.key;
      if (saved[k] !== undefined) td.textContent = saved[k];
      td.addEventListener('input', () => {
        const data = {};
        cells.forEach(c => data[c.dataset.key] = c.textContent.trim());
        localStorage.setItem(KEY, JSON.stringify(data));
      });
      td.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); td.blur(); }
      });
    });
  })();
</script>`;
}
