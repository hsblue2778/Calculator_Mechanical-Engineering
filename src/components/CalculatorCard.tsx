// 계산기 카드 — 제목, 입력/출력 요약, 하단 탭 링크
// 하단 링크는 calculators.ts 의 tabs 메타로부터 동적 생성

import type { CalculatorMeta, CardTabKey } from '../config/calculators';

interface CalculatorCardProps {
  calculator: CalculatorMeta;
  onOpen: (tab: CardTabKey | 'calculator') => void;
}

export default function CalculatorCard({ calculator, onOpen }: CalculatorCardProps) {
  return (
    <div
      onClick={() => onOpen('calculator')}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOpen('calculator'); }}
      className="flex flex-col cursor-pointer"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        padding: 20,
        boxShadow: 'var(--shadow-sm)',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        minHeight: 160,
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
          lineHeight: 1.4,
        }}
      >
        {calculator.title}
      </h3>

      {/* 입력/출력 요약 (2줄 고정) */}
      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
        <div>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>입력 →</span>
          <span style={{ color: 'var(--text-tertiary)', marginLeft: 6 }}>{calculator.inputs}</span>
        </div>
        <div style={{ marginTop: 2 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>출력 →</span>
          <span style={{ color: 'var(--text-tertiary)', marginLeft: 6 }}>{calculator.outputs}</span>
        </div>
      </div>

      {/* 하단 탭 링크 — 메타에 정의된 탭만 표시 */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 16,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {calculator.tabs.map((tab, i) => (
          <span key={tab.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && <Divider />}
            <Link onClick={e => { e.stopPropagation(); onOpen(tab.key); }}>{tab.label}</Link>
          </span>
        ))}
      </div>
    </div>
  );
}

function Link({
  children, onClick,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        color: 'var(--accent-primary)',
        fontSize: 13,
        fontWeight: 500,
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
      className="hover:underline"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span style={{ color: 'var(--border-default)' }}>|</span>;
}
