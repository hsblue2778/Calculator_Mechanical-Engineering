// 관경 계산기 — 예시 탭

import { PIPE_SIZE_MATERIALS } from '../../../data/pipeSizes';
import { C } from '../styles';

export interface SizingPreset {
  label: string; hint: string;
  Q: string; dP: string;
  matIdx: number;
}

export const SIZING_PRESETS: SizingPreset[] = [
  { label: '엑셀 기본값', hint: '탄소강관, Q=100 lpm, ΔP/L=30 mmAq/m',
    Q: '100', dP: '30', matIdx: 0 },
  { label: '중형 냉수 배관',  hint: '스테인리스강관, Q=500 lpm',
    Q: '500', dP: '30', matIdx: 1 },
  { label: '대형 공조 배관',  hint: '탄소강관, Q=2000 lpm',
    Q: '2000', dP: '30', matIdx: 0 },
];

interface Props {
  onLoad: (p: SizingPreset) => void;
}

export default function ExamplesTab({ onLoad }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
        아래 예시를 클릭하면 계산 탭에 값이 자동 적용됩니다. 단위는 기본값(LPM, mmAq)으로 재설정됩니다.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SIZING_PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => onLoad(p)}
            style={{
              width: '100%', textAlign: 'left',
              backgroundColor: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: 14,
              cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = C.blue;
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.backgroundColor = C.surface;
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: C.heading }}>{p.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>{p.hint}</span>
            </div>
            <div style={{ fontSize: 12, color: C.text, fontFamily: 'ui-monospace, monospace' }}>
              Q = {p.Q} lpm · ΔP/L = {p.dP} mmAq/m · {PIPE_SIZE_MATERIALS[p.matIdx].nameKo} · Darcy-Weisbach (정통)
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
