// 안내 박스 — 소개·검증 탭 등에서 사용하는 라벨 + 본문 컨테이너

interface Props {
  title: string;
  children: React.ReactNode;
}

export default function InfoBlock({ title, children }: Props) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)',
      borderRadius: 8, padding: 16,
    }}>
      <p style={{
        fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500,
        textTransform: 'uppercase', letterSpacing: '0.03em',
        marginBottom: 8, display: 'block',
      }}>{title}</p>
      <div style={{ color: 'var(--text-secondary)' }}>{children}</div>
    </div>
  );
}
