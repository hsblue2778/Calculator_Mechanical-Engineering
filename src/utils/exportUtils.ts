// 계산 결과 내보내기 유틸 — 외부 라이브러리 의존 없음
// PDF: 브라우저 인쇄 다이얼로그(window.print) 기반. "대상: PDF로 저장" 선택
// CSV: Blob + URL.createObjectURL 다운로드 (UTF-8 BOM 포함 → 엑셀 한글 호환)
// Word: PDF와 동일한 HTML 산출서를 MS Word 호환(.doc) 형식으로 다운로드

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

// ── Word(.doc) 파일 다운로드 ──────────────────────────────────────
// Word의 HTML 렌더 엔진 제약에 맞춘 보정:
//  - CSS 변수(var(--x)) 미지원 → REPORT_CSS :root 정의값으로 치환
//  - flexbox 미지원 → 헤더·푸터·표지 밴드를 float 배치로 대체
//  - 웹폰트 로드 불가 → Pretendard <link> 제거, 맑은 고딕 폴백
//  - @page WordSection1 으로 A4 페이지 여백 지정 (인쇄 CSS와 동일 여백)
const WORD_CSS_VARS: Record<string, string> = {
  'ink': '#0B1120', 'ink-2': '#1F2937', 'mute': '#475569',
  'line': '#94A3B8', 'line-soft': '#CBD5E1',
  'paper': '#FFFFFF', 'paper-2': '#F8FAFC', 'paper-3': '#F1F5F9',
  'accent': '#1F3A6E', 'accent-2': '#A4133C', 'hi': '#FEF9C3',
};

const WORD_HEAD_EXTRA = `<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->
<style>
  @page WordSection1 { size: 210mm 297mm; margin: 14mm 12mm 12mm 12mm; }
  div.WordSection1 { page: WordSection1; }
  html, body { background: #FFFFFF; font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; }
  .sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; page-break-after: always; }
  .sheet:last-child { page-break-after: auto; }
  .sheet.cover { padding: 0; }
  /* flex 레이아웃 → float 대체 */
  .doc-head { display: block; overflow: hidden; }
  .doc-head .brand { display: block; float: left; }
  .doc-head .brand img { display: inline-block; vertical-align: middle; }
  .doc-head .brand .label { display: inline-block; vertical-align: middle; margin-left: 10px; }
  .doc-head .meta { float: right; text-align: right; }
  .cover-band { display: block; overflow: hidden; height: auto; padding: 12px 14mm; }
  .cover-band .tag { float: left; }
  .cover-band .docno { float: right; }
  .cover-body { display: block; }
  .cover-foot { display: block; overflow: hidden; }
  .cover-foot .signoff { float: left; }
  .cover-foot .biglogo { float: right; }
  .doc-foot { display: block; overflow: hidden; }
  .doc-foot span:first-child { float: left; }
  .doc-foot span:last-child { float: right; }
  ul.refs { column-count: 1; }
</style>`;

/**
 * PDF 산출서와 동일한 HTML 문자열을 Word 호환 형식으로 가공해 .doc 파일로 다운로드.
 * MSO 네임스페이스 + Print 뷰 설정으로 Word에서 바로 인쇄 레이아웃으로 열린다.
 */
export function downloadWordFile(filename: string, htmlContent: string): void {
  const wordHtml = htmlContent
    .replace(/<link[^>]*>\n?/g, '')
    .replace(/var\(--([a-z0-9-]+)\)/g, (m, name: string) => WORD_CSS_VARS[name] ?? m)
    .replace('<html lang="ko">', '<html lang="ko" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">')
    .replace('</head>', `${WORD_HEAD_EXTRA}\n</head>`)
    .replace('<body>', '<body><div class="WordSection1">')
    .replace('</body>', '</div></body>');
  // UTF-8 BOM → Word가 인코딩을 확실히 인식
  const blob = new Blob(['\uFEFF', wordHtml], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── HTML 산출서 → PDF 인쇄 ────────────────────────────────────────
/**
 * 완성된 HTML 문자열을 숨김 iframe에서 렌더 후 인쇄 다이얼로그를 자동 호출.
 * 사용자는 다이얼로그에서 "대상: PDF로 저장"을 선택해 PDF 파일을 받는다.
 * HTML 산출서의 @media print CSS가 그대로 적용되므로 깔끔한 페이지 분할.
 */
export function printHtmlReport(htmlContent: string): void {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '-10000px';
  iframe.style.bottom = '-10000px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(htmlContent);
  doc.close();

  // 외부 폰트·이미지 로딩이 끝나도록 load 이벤트 대기. 이미 캐시되어 즉시
  // 끝나는 경우를 위해 fallback timeout도 함께 건다.
  let printed = false;
  const trigger = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      // 인쇄 다이얼로그가 닫힌 직후 iframe 제거. 다이얼로그 열림은 동기 호출이 아니라
      // 브라우저별로 다르므로 넉넉히 대기.
      setTimeout(() => iframe.remove(), 1000);
    }
  };
  iframe.addEventListener('load', trigger);
  setTimeout(trigger, 500);
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
