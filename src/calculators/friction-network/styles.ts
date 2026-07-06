// friction-network 공용 색상 팔레트·스타일 (pipe-sizing 팔레트 복사)

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
  err: 'var(--state-error-text)',
};

// 편집·선택 가능한 컨트롤은 accent 틴트로 정적 텍스트와 확실히 구분 (비활성 셀은 각자 무채색 override)
export const inputStyle: React.CSSProperties = {
  border: `1px solid var(--accent-primary)`, borderRadius: 6, padding: '8px 12px',
  fontSize: 14, color: 'var(--text-primary)', backgroundColor: 'var(--accent-primary-bg-soft)',
  outline: 'none', width: '100%', fontFamily: 'inherit',
};

export const labelStyle: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500,
  textTransform: 'uppercase', letterSpacing: '0.03em',
  marginBottom: 6, display: 'block',
};

// 구간 테이블 셀 입력 — 좁은 폭 전용 (편집 가능 → accent 틴트)
export const cellInputStyle: React.CSSProperties = {
  border: `1px solid var(--accent-primary)`, borderRadius: 4, padding: '5px 6px',
  fontSize: 12.5, color: 'var(--text-primary)', backgroundColor: 'var(--accent-primary-bg-soft)',
  outline: 'none', width: '100%', fontFamily: 'inherit', minWidth: 0,
};

export const cellSelectStyle: React.CSSProperties = {
  ...cellInputStyle, padding: '5px 2px',
};
