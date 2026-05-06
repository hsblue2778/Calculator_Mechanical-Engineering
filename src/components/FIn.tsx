// 수식 인라인 입력 — 공식 안에 직접 끼워넣는 작은 숫자 입력박스

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  width?: number;
}

export default function FIn({ value, onChange, placeholder, width = 64 }: Props) {
  return (
    <input
      type="number" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} min="0" step="any"
      style={{
        width, textAlign: 'center', fontSize: 14, fontWeight: 600,
        color: 'var(--text-primary)', backgroundColor: 'var(--accent-primary-bg-soft)',
        border: 'none', borderBottom: '2px solid var(--accent-primary)',
        borderRadius: 4, outline: 'none', padding: '2px 6px', margin: '0 2px',
        fontFamily: 'inherit',
      }}
    />
  );
}
