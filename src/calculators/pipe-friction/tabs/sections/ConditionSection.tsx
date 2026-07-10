// 관마찰손실 — 조건 설정 섹션 (유체·온도·압력·재질·상태 + ν·ρ 자동 표시)
// 엑셀 PHASE 0에 대응. 고정값 유체(표 5)는 온도·압력 입력이 비활성화된다.

import { PF_FLUIDS, PF_PRESSURE_MIN_MMHG, PF_PRESSURE_MAX_MMHG, type PFFluid } from '../../../../data/fluidProperties.ts';
import { PF_MATERIALS, PIPE_CONDITIONS, type PFMaterialId, type PipeCondition } from '../../../../data/pipeRoughness.ts';
import type { PipeFrictionController } from '../../usePipeFrictionState.ts';
import InfoTip from '../../../../components/InfoTip';
import { C, inputStyle, labelStyle } from '../../styles';

export default function ConditionSection({ pf }: { pf: PipeFrictionController }) {
  const { st, patch, fluidMeta, mat, fluidProps } = pf;
  const isFixed = fluidMeta.mode === 'fixed';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <span style={{
        fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>유체 · 배관 조건</span>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Field label="유체 종류" tip={isFixed ? '상온·1atm 단일 물성값 (문헌 표 5)' : '온도별 물성표 적용'}>
          <select
            value={st.fluid}
            onChange={e => patch({ fluid: e.target.value as PFFluid })}
            style={selectStyle}
          >
            {PF_FLUIDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
        </Field>

        <Field label="온도 (°C)" tip={isFixed
          ? '고정값 유체 — 온도 입력 미적용'
          : `유효범위 ${fluidMeta.tempMin}~${fluidMeta.tempMax}°C · 10°C 절점 선형보간`}>
          <input
            type="number" step="any"
            value={isFixed ? '' : st.tempC}
            placeholder={isFixed ? '미적용' : ''}
            disabled={isFixed}
            onChange={e => patch({ tempC: e.target.value })}
            style={{ ...inputStyle, opacity: isFixed ? 0.5 : 1 }}
          />
        </Field>

        {fluidMeta.hasPressure && (
          <Field label="압력 (mmHg)" tip={`기본 760 (1atm) · 유효 ${PF_PRESSURE_MIN_MMHG}~${PF_PRESSURE_MAX_MMHG} (문헌 표 2)`}>
            <input
              type="number" step="any"
              value={st.pressureMmHg}
              onChange={e => patch({ pressureMmHg: e.target.value })}
              style={inputStyle}
            />
          </Field>
        )}

        <Field label="배관 재질" tip={`ε ${mat.eps_mm.new}/${mat.eps_mm.old} mm · C ${mat.hazenC.new}/${mat.hazenC.old} (신관/노후)`}>
          <select
            value={st.materialId}
            onChange={e => pf.changeMaterial(e.target.value as PFMaterialId)}
            style={selectStyle}
          >
            {PF_MATERIALS.map(m => (
              <option key={m.id} value={m.id}>
                {m.nameKo}{m.abbreviation ? ` (${m.abbreviation})` : ''}
              </option>
            ))}
          </select>
        </Field>

        <Field label="배관 상태" tip="내식 재질(STS·PVC·동·PVDF)은 노후=신관이 표준 관행">
          <select
            value={st.condition}
            onChange={e => pf.changeCondition(e.target.value as PipeCondition)}
            style={selectStyle}
          >
            {PIPE_CONDITIONS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </Field>
      </div>

      <div style={{
        display: 'flex', gap: 24, flexWrap: 'wrap',
        paddingTop: 10, borderTop: `1px dashed ${C.border}`,
        fontSize: 12, color: C.textDark,
      }}>
        <span>동점성계수 ν = <Mono>{fluidProps ? formatNu(fluidProps.nu) : '—'}</Mono> m²/s <Auto /></span>
        <span>밀도 ρ = <Mono>{fluidProps ? fluidProps.rho.toFixed(fluidProps.rho < 10 ? 4 : 1) : '—'}</Mono> kg/m³ <Auto /></span>
      </div>
    </div>
  );
}

function formatNu(nu: number): string {
  return `${(nu * 1e6).toPrecision(4)}×10⁻⁶`;
}

const selectStyle: React.CSSProperties = { ...inputStyle };

function Field({ label, tip, children }: { label: string; tip?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {tip && <InfoTip>{tip}</InfoTip>}
      </label>
      {children}
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: C.heading }}>
      {children}
    </span>
  );
}

function Auto() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, color: 'var(--text-tertiary)',
      backgroundColor: 'var(--bg-surface-3)',
      padding: '1px 6px', borderRadius: 999, marginLeft: 4,
    }}>자동</span>
  );
}
