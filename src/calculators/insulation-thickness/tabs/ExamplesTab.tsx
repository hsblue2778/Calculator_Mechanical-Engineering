// 냉수배관 보온 두께 계산기 — 예시 탭

import { PIPE_OD_TABLE, INSULATION_MATERIALS, type InsulationInputs } from '../calc';
import { C } from '../styles';

export interface InsulationPreset {
  label: string; hint: string;
  state: InsulationInputs;
}

// 케이스 A·B는 사양서 §9 검증 케이스 기반 (D=0.05m → 50A 매칭)
export const INSULATION_PRESETS: InsulationPreset[] = [
  {
    label: '일반 사무실 냉수배관',
    hint: '보통 환경 — 결로 안전 여유 충분',
    state: {
      pipeIdx: 5,  // 50A
      matIdx: 0,   // 고무발포
      customK: '',
      Ti: '7', Ta: '30', RH: '75',
      ho: '9.3', safetyFactor: '1.2',
    },
  },
  {
    label: '욕실 환경 (가혹)',
    hint: '고습도 — 두께 폭증 사례',
    state: {
      pipeIdx: 5,
      matIdx: 0,
      customK: '',
      Ti: '7', Ta: '28', RH: '95',
      ho: '9.3', safetyFactor: '1.2',
    },
  },
  {
    label: '대형관 100A 기계실',
    hint: '대형관 + 고온 환경',
    state: {
      pipeIdx: 8,  // 100A
      matIdx: 0,
      customK: '',
      Ti: '5', Ta: '35', RH: '85',
      ho: '9.3', safetyFactor: '1.3',
    },
  },
];

interface Props {
  onLoad: (p: InsulationPreset) => void;
}

export default function ExamplesTab({ onLoad }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
        아래 예시를 클릭하면 계산 탭에 값이 자동 적용됩니다.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {INSULATION_PRESETS.map((p, i) => {
          const pipe = PIPE_OD_TABLE[p.state.pipeIdx];
          const mat  = INSULATION_MATERIALS[p.state.matIdx];
          return (
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
                {pipe.nominalA}A · {mat.nameKo} · Tᵢ={p.state.Ti}°C · Tₐ={p.state.Ta}°C · RH={p.state.RH}%
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
