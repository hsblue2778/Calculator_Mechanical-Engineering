// 상단 KPI 카드 — 큰 글씨 결과값 + 상단 컬러 바 액센트

interface Props {
  label: string;
  value: string;
  unit?: string;
  accent?: string;
  size?: 'md' | 'lg';
  subLabel?: string;
}

export default function Kpi({ label, value, unit, accent, size = 'md', subLabel }: Props) {
  const sz = size === 'lg' ? 28 : 20;
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderTop: `3px solid ${accent || 'var(--accent-primary-hover)'}`,
      borderRadius: 8,
      padding: '14px 16px',
    }}>
      <div style={{
        fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
        <span style={{
          fontSize: sz, fontWeight: 700, color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{unit}</span>}
        {subLabel && (
          <span style={{
            fontSize: 11, color: accent || 'var(--text-tertiary)',
            fontWeight: 600, marginLeft: 4,
          }}>
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
}
