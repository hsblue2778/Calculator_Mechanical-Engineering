// 가로 버튼 방식 단위 라디오

interface Option {
  key: string;
  label: string;
}

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}

export default function UnitRadios({ label, value, onChange, options }: Props) {
  return (
    <div>
      <div style={{
        fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em',
        marginBottom: 6, display: 'block',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {options.map(opt => {
          const selected = value === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              style={{
                padding: '5px 10px', fontSize: 12, cursor: 'pointer',
                fontFamily: 'inherit',
                border: `1px solid ${selected ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                backgroundColor: selected ? 'var(--bg-surface-3)' : 'var(--bg-surface)',
                color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: selected ? 600 : 400,
                borderRadius: 5,
                transition: 'all 0.12s',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
