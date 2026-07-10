// 계산기 카드 — 제목, 한 줄 설명

import type { CalculatorMeta } from '../config/calculators';

interface CalculatorCardProps {
  calculator: CalculatorMeta;
  onOpen: () => void;
}

export default function CalculatorCard({ calculator, onOpen }: CalculatorCardProps) {
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOpen(); }}
      className="flex flex-col cursor-pointer"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        padding: 16,
        boxShadow: 'var(--shadow-sm)',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.borderColor = 'var(--accent-primary)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
      }}
    >
      {/* 계산기 이름 */}
      <h3
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.35,
          wordBreak: 'keep-all',
        }}
      >
        {calculator.title}
      </h3>

      {/* 한 줄 설명 */}
      <p style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, color: 'var(--text-tertiary)', wordBreak: 'keep-all' }}>
        {calculator.description}
      </p>
    </div>
  );
}
