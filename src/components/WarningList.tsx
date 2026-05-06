// 맥락 경고 리스트 — level(error/warn/info)별 색상 구분

export interface WarningItem {
  level: 'error' | 'warn' | 'info';
  title: string;
  msg: string;
}

interface Props {
  items: WarningItem[];
}

const STYLE_MAP: Record<WarningItem['level'], { dot: string; bg: string; border: string }> = {
  error: { dot: 'var(--state-error)', bg: 'var(--state-error-bg)', border: 'var(--state-error-text)' },
  warn:  { dot: 'var(--state-warn)',  bg: 'var(--state-warn-bg)',  border: 'var(--state-warn-text)' },
  info:  { dot: 'var(--accent-primary)', bg: 'var(--accent-primary-bg-soft)', border: 'var(--accent-primary-bg)' },
};

export default function WarningList({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <div>
      <p style={{
        fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)',
        marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.03em',
      }}>
        맥락 경고
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((w, i) => {
          const s = STYLE_MAP[w.level];
          return (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '10px 14px',
              backgroundColor: s.bg,
              border: `1px solid ${s.border}`,
              borderLeft: `3px solid ${s.dot}`,
              borderRadius: 6,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                backgroundColor: s.dot, marginTop: 6, flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{w.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.5 }}>{w.msg}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
