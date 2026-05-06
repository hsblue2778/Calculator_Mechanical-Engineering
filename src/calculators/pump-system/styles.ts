// pump-hvac 공용 색상 팔레트·스타일

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
  surfaceSection: 'var(--bg-surface-3)',
  green: 'var(--state-success)',
  amber: 'var(--state-warn)',
  red: 'var(--state-error)',
  badge: 'var(--accent-primary-bg-soft)',
  badgeText: 'var(--accent-primary-hover)',
};

export const inputStyle: React.CSSProperties = {
  border: `1px solid var(--border-default)`,
  borderRadius: 6,
  padding: '8px 12px',
  fontSize: 14,
  color: 'var(--text-primary)',
  backgroundColor: 'var(--bg-surface)',
  outline: 'none',
  width: '100%',
  fontFamily: 'inherit',
};

export const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-tertiary)',
  fontWeight: 500,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.03em',
  marginBottom: 6,
  display: 'block',
};

export const sectionStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-surface)',
  border: `1px solid var(--border-subtle)`,
  borderRadius: 8,
  padding: 16,
};

export const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: 12,
  paddingBottom: 8,
  borderBottom: `1px solid var(--border-subtle)`,
};
