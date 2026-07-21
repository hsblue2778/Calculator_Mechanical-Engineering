// 개발자 문의 모달 — Web3Forms로 익명 전송, 액세스 키 미설정 시 mailto 폴백

import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import Modal from './Modal';
import { CONTACT_EMAIL, WEB3FORMS_ACCESS_KEY } from '../config/contact';

const CATEGORIES = ['버그 신고', '기능 제안', '기타'] as const;

type SendStatus = 'idle' | 'sending' | 'error';

interface ContactModalProps {
  onClose: () => void;
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--border-default)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  outline: 'none',
  fontFamily: 'inherit',
};

function focusHandlers() {
  return {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      e.currentTarget.style.borderColor = 'var(--border-focus)';
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      e.currentTarget.style.borderColor = 'var(--border-default)';
    },
  };
}

export default function ContactModal({ onClose }: ContactModalProps) {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [botcheck, setBotcheck] = useState('');
  const [status, setStatus] = useState<SendStatus>('idle');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;

    const subject = `[M.E.T 문의] ${category}`;

    // 키 발급 전 폴백 — 방문자 메일 앱으로 내용을 채워 전송
    if (!WEB3FORMS_ACCESS_KEY) {
      const body = message + (email ? `\n\n회신 이메일: ${email}` : '');
      window.location.href =
        `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_ACCESS_KEY,
          subject,
          from_name: 'M.E.T 문의하기',
          category,
          message,
          ...(email ? { email } : {}),
          botcheck,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSent(true);
    } catch {
      setStatus('error');
    }
  }

  return (
    <Modal title="개발자에게 문의하기" onClose={onClose} bodyWidth={440}>
      {sent ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 14, padding: '36px 0',
        }}>
          <CheckCircle size={40} style={{ color: 'var(--state-success)' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            문의가 전송되었습니다
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            소중한 의견 감사합니다. 더 나은 도구로 보답하겠습니다.
          </p>
          <button
            onClick={onClose}
            style={{
              marginTop: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600,
              color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)', borderRadius: 8,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            닫기
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-tertiary)', wordBreak: 'keep-all' }}>
            버그 신고, 기능 제안 등 어떤 의견이든 환영합니다. 이메일을 남기지 않아도 익명으로 전송됩니다.
          </p>

          <div>
            <label htmlFor="contact-category" style={fieldLabelStyle}>문의 유형</label>
            <select
              id="contact-category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
              {...focusHandlers()}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="contact-email" style={fieldLabelStyle}>회신 이메일 (선택)</label>
            <input
              id="contact-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="답장을 받고 싶다면 입력하세요"
              style={inputStyle}
              {...focusHandlers()}
            />
          </div>

          <div>
            <label htmlFor="contact-message" style={fieldLabelStyle}>문의 내용</label>
            <textarea
              id="contact-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              rows={6}
              placeholder="내용을 입력하세요"
              style={{ ...inputStyle, resize: 'vertical', minHeight: 120, lineHeight: 1.6 }}
              {...focusHandlers()}
            />
          </div>

          {/* 스팸 방지 honeypot — 사람에게는 보이지 않음 */}
          <input
            type="text"
            name="botcheck"
            value={botcheck}
            onChange={e => setBotcheck(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ display: 'none' }}
          />

          {status === 'error' && (
            <p style={{
              fontSize: 12, fontWeight: 600, padding: '8px 12px', borderRadius: 8,
              color: 'var(--state-error-text)', backgroundColor: 'var(--state-error-bg)',
              border: '1px solid var(--state-error)',
            }}>
              전송에 실패했습니다. 잠시 후 다시 시도해주세요.
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 16px', fontSize: 13, fontWeight: 600,
              color: 'var(--text-inverse)', backgroundColor: 'var(--accent-primary)',
              border: 'none', borderRadius: 8,
              cursor: status === 'sending' ? 'default' : 'pointer',
              opacity: status === 'sending' ? 0.6 : 1,
              fontFamily: 'inherit',
              transition: 'opacity 0.15s',
            }}
          >
            <Send size={15} />
            {status === 'sending' ? '전송 중...' : '문의 보내기'}
          </button>
        </form>
      )}
    </Modal>
  );
}
