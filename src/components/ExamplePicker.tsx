// 예시 ▾ 드롭다운 — 워크스페이스 헤더에서 일반적인 실무 수치 프리셋을 계산기에 적용
import { useState } from 'react';
import { ChevronDown, Lightbulb } from 'lucide-react';
import type { ExamplePreset } from '../config/examples';

interface Props {
  presets: ExamplePreset[];
  onLoad: (p: ExamplePreset) => void;
}

export default function ExamplePicker({ presets, onLoad }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', fontSize: 13, fontWeight: 600,
          color: 'var(--text-secondary)', backgroundColor: 'transparent',
          border: '1px solid var(--border-default)', borderRadius: 8,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <Lightbulb size={14} /> 예시
        <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 41,
            width: 'min(360px, calc(100vw - 48px))', padding: 6,
            backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)',
            borderRadius: 10, boxShadow: 'var(--shadow-md)',
          }}>
            <p style={{ padding: '6px 12px 4px', fontSize: 11.5, color: 'var(--text-quaternary)', margin: 0 }}>
              클릭하면 현재 입력값이 예시 값으로 교체됩니다.
            </p>
            {presets.map((p, i) => (
              <button
                key={i}
                onClick={() => { setOpen(false); onLoad(p); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '9px 12px', borderRadius: 7,
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-surface-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {p.label}
                </span>
                <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.5 }}>
                  {p.description}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
