// 작은 통계값 — Kpi 아래 부수 값(단위손실/hf/f 등) 표시

interface Props {
  label: string;
  value: string;
  unit?: string;
}

export default function Mini({ label, value, unit }: Props) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
        <span style={{
          fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{unit}</span>}
      </div>
    </div>
  );
}
