// pipe-sizing 공용 색상 팔레트·스타일

export const C = {
  navy: 'var(--accent-primary-hover)',
  heading: 'var(--text-primary)',
  text: 'var(--text-tertiary)',
  textDark: 'var(--text-secondary)',
  border: 'var(--border-subtle)',
  borderInput: 'var(--border-default)',
  blue: 'var(--accent-primary)',
  surface: 'var(--bg-surface)',
  surfaceAlt: 'var(--bg-surface-2)',
  warn: 'var(--state-warn-text)',
  ok: 'var(--state-success-text)',
};

export const inputStyle: React.CSSProperties = {
  border: `1px solid var(--border-default)`, borderRadius: 6, padding: '8px 12px',
  fontSize: 14, color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)',
  outline: 'none', width: '100%', fontFamily: 'inherit',
};

export const labelStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500,
  textTransform: 'uppercase', letterSpacing: '0.03em',
  marginBottom: 6, display: 'block',
};

// 단위 변환 — 사용자 단위 ↔ mmAq 양방향
export const MM_AQ_PER_PA = 1 / 9.80665;
export const PA_PER_MM_AQ = 9.80665;
