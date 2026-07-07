// HTML 산출서 빌더 — 진입점
// buildPumpHvacReportHtml(props) → 완성된 HTML 문서 문자열
//
// 로고: Vite ?inline query → base64 data URL (단독 실행 파일로 임베드)
// 분리 구조: styles.ts / helpers.ts / types.ts / cover.ts / pages.ts

import logoDataUrl from '../../../assets/report-logo.png?inline';
import { REPORT_CSS } from './styles';
import { buildCoverPage } from './cover';
import { buildPage2, buildPage3, buildPage4, buildPage5 } from './pages';
import { makeDocNo } from './helpers';
import type { PumpHvacReportProps } from './types';

export type { PumpHvacReportProps };

export function buildPumpHvacReportHtml(props: PumpHvacReportProps): string {
  const { fieldLabel } = props;
  const title = `${fieldLabel} 펌프 시스템 계산결과`;
  const logo = logoDataUrl as string;
  const docNo = makeDocNo();

  const coverHtml   = buildCoverPage(props, logo, docNo);
  const page2Html   = buildPage2(props, logo, docNo);
  const page3Html   = buildPage3(props, logo, docNo);
  const page4Html   = buildPage4(props, logo, docNo);
  const page5Html   = buildPage5(props, logo, docNo);

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css">
<style>
${REPORT_CSS}
</style>
</head>
<body>

${coverHtml}
${page2Html}
${page3Html}
${page4Html}
${page5Html}

</body>
</html>`;
}
