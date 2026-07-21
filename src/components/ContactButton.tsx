// 우하단 고정 문의하기 버튼 — ChangelogButton과 동일한 시각 패턴, 모달 포함 자립형

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import ContactModal from './ContactModal';

interface ContactButtonProps {
  // 모바일 워크스페이스 — 하단 sticky 액션 바(.calc-actions)와 겹침 방지용 올림
  mobileLifted?: boolean;
}

export default function ContactButton({ mobileLifted }: ContactButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={mobileLifted ? 'contact-fab-lifted' : undefined}
        onClick={() => setOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 40,
          padding: '8px 14px',
          backgroundColor: 'var(--bg-surface)',
          border: `1px solid ${hovered ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
          borderRadius: 12,
          boxShadow: hovered ? 'var(--shadow-lg)' : 'var(--shadow-md)',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        aria-label="개발자에게 문의하기"
      >
        <MessageCircle size={16} />
        문의하기
      </button>
      {open && <ContactModal onClose={() => setOpen(false)} />}
    </>
  );
}
