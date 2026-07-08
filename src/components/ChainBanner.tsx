// 체이닝 수신 안내 배너 — 발신 계산기에서 전달된 값 안내 (연보라 박스)
// pipe-sizing의 기존 체이닝 배너 마크업을 공용화 — 수신 계산기들이 문구만 채워 사용

import { ArrowRight } from 'lucide-react';

const CHAIN_BG = 'rgba(147, 51, 234, 0.10)';
const CHAIN_BORDER = 'rgba(147, 51, 234, 0.55)';

export default function ChainBanner({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', fontSize: 13, lineHeight: 1.5,
      color: 'var(--text-secondary)', backgroundColor: CHAIN_BG,
      border: `1px solid ${CHAIN_BORDER}`, borderRadius: 8,
    }}>
      <ArrowRight size={15} style={{ flexShrink: 0 }} />
      <span>{children}</span>
    </div>
  );
}
