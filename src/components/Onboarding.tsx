// 5스텝 온보딩 모달 — 수동 트리거 전용 (헤더 [도움말] 버튼)

import { useState, useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: '한국 기계설비 설계를 위한 통합 도구입니다',
    body: '냉온수 계통, 펌프 양정·NPSH 검증, 관마찰손실 등을 한 곳에서. 모든 결과는 한국 실무 산출서 양식으로 인쇄됩니다.',
    visual: '🏗️',
  },
  {
    title: '계산기는 카드를 눌러 시작합니다',
    body: '홈에서 카드를 클릭하면 모달이 열려 계산을 진행합니다. 좌측 패널에서 이전 기록을 불러오거나 비교할 수 있습니다.',
    visual: '📐',
  },
  {
    title: '관경·재질·부속을 자유롭게 조합하세요',
    body: '배관 행을 여러 개로 나눠 흡입측·토출측을 별도로 구성할 수 있고, 부속(엘보·밸브·티 등)은 K-method로 손실을 합산합니다. 결과는 입력 즉시 반영됩니다.',
    visual: '🔁',
  },
  {
    title: '한국 실무 산출서 양식으로 인쇄',
    body: '계산이 끝나면 표지·입력조건·적용공식·결과·검증 체크리스트가 포함된 A4 산출서를 PDF/인쇄로 바로 출력할 수 있습니다.',
    visual: '🖨',
  },
  {
    title: '바로 시작하세요',
    body: '홈에서 "HVAC 펌프 시스템 선정" 워크플로우로 시작하거나, 개별 계산기 카드를 누르면 됩니다. 도움말은 상단 우측 [도움말] 버튼으로 다시 열 수 있습니다.',
    visual: '✨',
  },
];

export default function Onboarding({ open, onClose }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: 560, maxWidth: '100%',
          background: 'var(--bg-surface)',
          borderRadius: 16, padding: 28,
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 28, height: 28, border: 'none',
            borderRadius: 6, background: 'transparent',
            color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 18,
          }}
          aria-label="닫기"
        >
          ×
        </button>

        <div style={{ fontSize: 60, textAlign: 'center', marginBottom: 10 }}>
          {s.visual}
        </div>
        <h2
          style={{
            margin: '0 0 10px', fontSize: 20, fontWeight: 700,
            color: 'var(--text-primary)', textAlign: 'center',
          }}
        >
          {s.title}
        </h2>
        <p
          style={{
            margin: 0, fontSize: 13, color: 'var(--text-secondary)',
            textAlign: 'center', lineHeight: 1.65,
          }}
        >
          {s.body}
        </p>

        <div
          style={{
            display: 'flex', justifyContent: 'center', gap: 6,
            margin: '24px 0 18px',
          }}
        >
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 22 : 6, height: 6, borderRadius: 999,
                background: i === step ? 'var(--accent-primary)' : 'var(--border-default)',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <FooterButton variant="ghost" onClick={onClose}>건너뛰기</FooterButton>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <FooterButton onClick={() => setStep(step - 1)}>이전</FooterButton>
            )}
            {!last
              ? <FooterButton variant="primary" onClick={() => setStep(step + 1)}>다음</FooterButton>
              : <FooterButton variant="primary" onClick={onClose}>시작하기</FooterButton>}
          </div>
        </div>
      </div>
    </div>
  );
}

function FooterButton({
  children, onClick, variant = 'default',
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'ghost';
}) {
  const [hover, setHover] = useState(false);
  const styles =
    variant === 'primary'
      ? {
          bg: hover ? 'var(--accent-primary-hover)' : 'var(--accent-primary)',
          color: '#FFF',
          border: 'transparent',
        }
      : variant === 'ghost'
      ? {
          bg: hover ? 'var(--bg-hover)' : 'transparent',
          color: 'var(--text-secondary)',
          border: 'transparent',
        }
      : {
          bg: hover ? 'var(--bg-hover)' : 'var(--bg-surface)',
          color: 'var(--text-primary)',
          border: 'var(--border-default)',
        };
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '5px 12px', fontSize: 12, fontWeight: 500,
        background: styles.bg, color: styles.color,
        border: `1px solid ${styles.border}`,
        borderRadius: 8, cursor: 'pointer',
        transition: 'background 0.12s',
      }}
    >
      {children}
    </button>
  );
}
