// 계산 결과 내보내기 유틸 — 외부 라이브러리 의존 없음
// PDF: 브라우저 인쇄 다이얼로그(window.print) 기반. "대상: PDF로 저장" 선택
// CSV: Blob + URL.createObjectURL 다운로드 (UTF-8 BOM 포함 → 엑셀 한글 호환)

// ── CSV ────────────────────────────────────────────────────────────
export interface CsvRow {
  [key: string]: string | number;
}

/** CSV 필드 이스케이프 — 쉼표·따옴표·개행 포함 시 전체 따옴표로 감싸고 내부 따옴표 두 번 */
function csvCell(v: string | number): string {
  const s = v == null ? '' : String(v);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * 2차원 배열(첫 행 헤더)을 CSV 문자열로 변환
 * UTF-8 BOM 포함 → 엑셀에서 한글 깨짐 방지
 */
export function arrayToCsv(rows: (string | number)[][]): string {
  const BOM = '\uFEFF';
  return BOM + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
}

/** 브라우저에서 CSV 파일 다운로드 */
export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const csv = arrayToCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── HTML 파일 다운로드 ────────────────────────────────────────────
/**
 * 완성된 HTML 문자열을 .html 파일로 다운로드.
 * Blob text/html;charset=utf-8 — CSV와 동일한 패턴.
 */
export function downloadHtmlFile(filename: string, htmlContent: string): void {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── PDF (브라우저 인쇄) ──────────────────────────────────────────
/**
 * 브라우저 인쇄 다이얼로그 호출. 사용자가 "대상: PDF로 저장" 선택하면 PDF 생성.
 * 모달 내부 탭 UI 등 주변 요소는 @media print 규칙으로 숨기는 것이 바람직하나,
 * 여기서는 전체 페이지 인쇄 기본 동작을 사용.
 */
export function printToPdf(documentTitle?: string): void {
  const prevTitle = document.title;
  if (documentTitle) document.title = documentTitle;
  // 렌더 한 틱 기다린 뒤 인쇄 (최근 상태 반영)
  setTimeout(() => {
    window.print();
    if (documentTitle) document.title = prevTitle;
  }, 50);
}
