// 분수 표기 — 분자/분모를 가로 선으로 구분해 표시

interface Props {
  n: React.ReactNode;
  d: React.ReactNode;
}

export default function Frac({ n, d }: Props) {
  return (
    <span style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
      verticalAlign: 'middle', lineHeight: 1.3, margin: '0 4px',
    }}>
      <span style={{ borderBottom: '1.5px solid var(--text-secondary)', padding: '0 4px 2px', textAlign: 'center' }}>{n}</span>
      <span style={{ padding: '2px 4px 0', textAlign: 'center' }}>{d}</span>
    </span>
  );
}
