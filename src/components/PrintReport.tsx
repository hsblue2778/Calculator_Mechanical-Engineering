// 인쇄 전용 리포트 뷰 공통 골격
// @media print 시에만 표시, 평상시에는 display:none (index.css의 .print-report-root 규칙으로 제어)
// createPortal 로 document.body 직계 자식에 렌더 → 정상 흐름 유지 → 자동 페이지 분할 동작

import { createPortal } from 'react-dom';

interface Props {
  title: string;          // 예: "관마찰손실 계산결과"
  children: React.ReactNode;
}

export default function PrintReport({ title, children }: Props) {
  const now = new Date();
  const dateStr = now.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  // SSR 가드 (CSR 전용 프로젝트이나 안전 처리)
  if (typeof document === 'undefined' || !document.body) return null;

  const content = (
    <div className="print-report print-report-root" aria-hidden="true">
      {/* 제목 */}
      <h1 style={{
        fontSize: '16pt',
        fontWeight: 700,
        textAlign: 'center',
        color: '#000',
        margin: '0 0 8px 0',
      }}>
        {title}
      </h1>

      {/* 구분선 */}
      <hr style={{
        border: 'none',
        borderTop: '1px solid #999',
        margin: '0 0 10mm 0',
      }} />

      {/* 콘텐츠 영역 */}
      {children}

      {/* 계산 일시 푸터 */}
      <div style={{
        marginTop: '10mm',
        paddingTop: '4mm',
        borderTop: '1px solid #CCC',
        fontSize: '10pt',
        color: '#666',
        textAlign: 'right',
      }}>
        계산 일시: {dateStr}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
