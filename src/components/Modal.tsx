// 공통 모달 — 디자인 스펙 기반 + 좌측 사이드 패널 옵셔널 지원

import { useEffect, useRef, useState } from 'react';
import { X, PanelLeft } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  leftPanel?: React.ReactNode;
  bodyWidth?: number;
}

// 본문 너비 기본값, 패널 유무에 따라 총 너비가 늘어남
const DEFAULT_BODY_WIDTH = 680;
const LEFT_WIDTH = 220;
const PANEL_GAP = 24;  // 패널과 본문 사이 시각 간격

export default function Modal({ title, onClose, children, leftPanel, bodyWidth = DEFAULT_BODY_WIDTH }: ModalProps) {
  const mouseDownOnBackdrop = useRef(false);
  const [compact, setCompact] = useState(false);
  const [showLeft, setShowLeft] = useState(true);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // 반응형 — 1200px 이하면 패널을 기본 접힘 + 토글 버튼 노출
  useEffect(() => {
    const update = () => setCompact(window.innerWidth <= 1200);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (compact) { setShowLeft(false); }
    else { setShowLeft(true); }
  }, [compact]);

  const hasLeft = !!leftPanel;
  const renderLeft = hasLeft && showLeft;

  // 총 너비 계산
  const totalWidth = bodyWidth
    + (renderLeft ? LEFT_WIDTH + PANEL_GAP : 0);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        backgroundColor: 'rgba(0,0,0,0.4)',
      }}
      onMouseDown={e => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
      onClick={e => {
        if (e.target === e.currentTarget && mouseDownOnBackdrop.current) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 12,
          width: totalWidth,
          maxWidth: '100%',
          maxHeight: '90vh',
          padding: 28,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {hasLeft && compact && (
              <PanelToggleButton
                active={showLeft}
                onClick={() => setShowLeft(v => !v)}
                icon={<PanelLeft size={16} />}
                label="기록 패널"
              />
            )}
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 8,
                color: 'var(--text-tertiary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              aria-label="닫기"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 본문 영역 — 좌/중 플렉스 */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {renderLeft && leftPanel}
          <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelToggleButton({
  active, onClick, icon, label,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        width: 32, height: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 8,
        color: active ? 'var(--accent-primary-hover)' : 'var(--text-tertiary)',
        background: active ? 'var(--accent-primary-bg)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
      }}
    >
      {icon}
    </button>
  );
}
