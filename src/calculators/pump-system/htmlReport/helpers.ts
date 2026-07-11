// HTML 산출서 — 공통 헬퍼

/** HTML 특수문자 이스케이프 */
export function esc(s: string | number | undefined | null): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** DOC. NO. 자동 생성 (현재 시각 기반) */
export function makeDocNo(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}${dd}-001`;
}

/** 계산 일시 문자열 (YYYY. MM. DD. HH:mm) */
export function makeCalcDateTime(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${yyyy}. ${mm}. ${dd}. ${hh}:${min}`;
}

/** 오늘 날짜 문자열 (YYYY. MM. DD.) */
export function makeTodayStr(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}. ${mm}. ${dd}.`;
}

/** fieldLabel 기반 localStorage 키 (안전 ASCII 키) */
export function makeCoverKey(fieldLabel: string): string {
  const safe = fieldLabel.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${safe}-pump-cover-v1`;
}

/** 페이지 헤더 HTML (작은 로고 + 문서번호 + 페이지) */
export function pageHeader(logoDataUrl: string, docLabel: string, docNo: string, pageNum: number, totalPages: number): string {
  return `
  <header class="doc-head">
    <div class="brand">
      <img src="${esc(logoDataUrl)}" alt="Logo"/>
      <div class="label">${esc(docLabel)}</div>
    </div>
    <div class="meta">
      <div class="doc-no">${esc(docNo)}</div>
      <div>${pageNum} / ${totalPages}</div>
    </div>
  </header>`;
}

/** 페이지 푸터 HTML */
export function pageFooter(docNo: string, pageNum: number, totalPages: number, note?: string): string {
  const left = note ?? '기계설비 설계 산출서';
  return `
  <div class="doc-foot">
    <span>${esc(left)}</span>
    <span>Page ${pageNum} / ${totalPages} · ${esc(docNo)}</span>
  </div>`;
}

/** 섹션 헤더 HTML */
export function secHeader(num: string, title: string): string {
  return `<h2 class="sec"><span class="num">${esc(num)}</span>${esc(title)}</h2>`;
}

export interface KpiItem {
  label: string;
  /** 이미 이스케이프/포맷된 HTML 허용 (숫자 문자열 권장) — esc 하지 않음 */
  value: string;
  unit?: string;
  /** 이미 이스케이프된 HTML 허용 — esc 하지 않음 */
  sub?: string;
}

/** 결과 요약 KPI 밴드 — Word 호환을 위해 table 마크업 (셀 폭 인라인 %) */
export function kpiStrip(items: KpiItem[]): string {
  const w = (100 / items.length).toFixed(1);
  return `<table class="kpi"><tr>${items.map(it => `
    <td class="kpi-cell" style="width:${w}%">
      <div class="kpi-label">${esc(it.label)}</div>
      <div class="kpi-value">${it.value}${it.unit ? `<span class="kpi-unit">${esc(it.unit)}</span>` : ''}</div>
      ${it.sub ? `<div class="kpi-sub">${it.sub}</div>` : ''}
    </td>`).join('')}</tr></table>`;
}

export type VerdictTone = 'ok' | 'warn' | 'risk' | 'info';

/** 판정 뱃지 (요약용) */
export function verdictBadge(tone: VerdictTone, text: string): string {
  return `<span class="verdict ${tone}">${esc(text)}</span>`;
}

/** 뱃지·라벨 여러 개를 한 줄로 (' · ' 구분) — parts는 이미 이스케이프된 HTML */
export function verdictLine(parts: string[]): string {
  return `<div class="kpi-verdicts">${parts.join(' · ')}</div>`;
}
