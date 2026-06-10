// 관마찰손실 — 예시 탭 (검증 케이스 프리셋)
// 기대값은 scripts/verify-pipe-friction.ts 실행 결과로 확정한 수치.

import { pfMaterial } from '../../../data/pipeRoughness.ts';
import { pfFluidMeta } from '../../../data/fluidProperties.ts';
import type { PFPreset } from '../usePipeFrictionState.ts';
import { C } from '../styles';

const FRICTION_PRESETS: PFPreset[] = [
  {
    label: '난류 기본 (물·STS304 신관)',
    hint: 'Colebrook-White 반복해 · ε를 0.045로 수정하면 참조 엑셀 S-J 케이스 재현',
    fluid: 'water', tempC: '20', materialId: 'sts304', condition: 'new',
    fields: { V: '2', D: '150' }, L: '100',
    expect: 'Q 자동 ≈ 2,120.6 LPM · Re ≈ 298,800 (난류) · f ≈ 0.015439 · ΔP/L ≈ 205.5 Pa/m · ΔP ≈ 20.55 kPa',
  },
  {
    label: '층류 (물·강관 신관)',
    hint: 'f = 64/Re 자동 적용 확인',
    fluid: 'water', tempC: '20', materialId: 'steel', condition: 'new',
    fields: { V: '0.1', D: '20' }, L: '10',
    expect: 'Re ≈ 1,992 (층류) · f = 64/Re ≈ 0.03213 · ΔP/L ≈ 8.0 Pa/m · ΔP ≈ 80 Pa',
  },
  {
    label: '공기 (20°C · 760 mmHg · 강관 신관)',
    hint: '공기 물성 자동 산출 · Hazen-Williams 미적용 확인',
    fluid: 'air', tempC: '20', materialId: 'steel', condition: 'new',
    fields: { V: '2', D: '150' }, L: '100',
    expect: 'Re ≈ 19,854 (난류) · f ≈ 0.02659 · ΔP/L ≈ 0.427 Pa/m · ΔP ≈ 42.7 Pa · H-W 숨김',
  },
];

interface Props {
  onLoad: (p: PFPreset) => void;
}

export default function ExamplesTab({ onLoad }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
        아래 예시를 클릭하면 계산 탭에 값이 적용됩니다. 기대값은 검증 스크립트로 확정한 수치입니다.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FRICTION_PRESETS.map((p, i) => {
          const mat = pfMaterial(p.materialId);
          const fieldStr = [
            p.fields.Q !== undefined ? `Q = ${p.fields.Q} m³/h` : null,
            p.fields.V !== undefined ? `V = ${p.fields.V} m/s` : null,
            p.fields.D !== undefined ? `D = ${p.fields.D} mm` : null,
          ].filter(Boolean).join(' · ');
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: C.heading }}>{p.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-quaternary)', textAlign: 'right' }}>{p.hint}</span>
              </div>
              <div style={{ fontSize: 12, color: C.text, fontFamily: 'ui-monospace, monospace' }}>
                {pfFluidMeta(p.fluid).label} {p.tempC}°C · {fieldStr} · L = {p.L} m · {mat.nameKo} ({p.condition === 'new' ? '신관' : '노후'})
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
                {p.expect}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
