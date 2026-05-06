// 관마찰손실 — 예시 탭

import { PIPE_MATERIALS } from '../../../data/pipeMaterials';
import { C } from '../styles';

export interface FrictionPreset {
  label: string; hint: string;
  Q: string; D: string; L: string;
  matIdx: number;
}

export const FRICTION_PRESETS: FrictionPreset[] = [
  { label: '기본 예시', hint: 'Darcy-Weisbach 직접 계산', Q: '10', D: '50', L: '100', matIdx: 0 },
];

interface Props {
  onLoad: (p: FrictionPreset) => void;
}

export default function ExamplesTab({ onLoad }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
        아래 예시를 클릭하면 계산 탭에 값이 적용됩니다. 새 공식 기준으로 hf 및 ΔP 결과를 확인하세요.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FRICTION_PRESETS.map((p, i) => (
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
              Q = {p.Q} m³/h · D = {p.D} mm · L = {p.L} m · {PIPE_MATERIALS[p.matIdx].nameKo}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
              예상 hf ≈ 6.121 m, ΔP ≈ 59.93 kPa (공식 직접 계산)
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
