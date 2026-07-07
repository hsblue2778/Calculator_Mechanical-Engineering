// 관마찰손실 — 마찰계수 섹션 (ε·C 편집 가능 필드 + Re·ε/D·적용식 표시 + f 수동 오버라이드)
// ε·C는 재질×상태 기본값으로 자동 충전되며, 수정 시 수정값이 즉시 계산에 반영된다("수정됨" 배지).

import FormulaSection from '../../../../components/FormulaSection';
import { formatRe, flowRegime } from '../../analysis';
import { fMethodLabel } from '../../interpret.ts';
import type { PipeFrictionController } from '../../usePipeFrictionState.ts';
import { C, inputStyle, labelStyle } from '../../styles';

export default function FrictionFactorSection({ pf }: { pf: PipeFrictionController }) {
  const { st, patch, epsDefault, cDefault, res, mat } = pf;
  const isWater = st.fluid === 'water';
  const epsEdited = st.epsStr.trim() !== epsDefault;
  const cEdited = st.cStr.trim() !== cDefault;
  const regime = res ? flowRegime(res.Re) : null;

  return (
    <FormulaSection title="마찰계수 f — 유동 영역별 자동 산출">
      <div style={{ fontSize: 13, lineHeight: 1.9, color: C.textDark }}>
        층류(Re&lt;2,300): <Code>f = 64/Re</Code> · 천이(≤4,000): 3차 보간 ·
        난류(&gt;4,000): <Code>1/√f = −2log₁₀(ε/3.7D + 2.51/(Re√f))</Code> (Colebrook-White 반복해)
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginTop: 14 }}>
        <div>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>절대조도 ε <span style={{ color: 'var(--text-quaternary)', fontWeight: 400, textTransform: 'none' }}>(mm)</span></span>
            {epsEdited && <EditedBadge />}
          </label>
          <input
            type="number" min="0" step="any"
            value={st.epsStr}
            onChange={e => patch({ epsStr: e.target.value })}
            style={inputStyle}
          />
          <Helper text={`기본값 ${epsDefault} (${mat.nameKo} · ${st.condition === 'new' ? '신관' : '노후'}) — 수정 가능`} />
        </div>

        <div>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>H-W 조도계수 C</span>
            {isWater && cEdited && <EditedBadge />}
          </label>
          <input
            type="number" min="0" step="any"
            value={isWater ? st.cStr : ''}
            placeholder={isWater ? '' : '물 전용'}
            disabled={!isWater}
            onChange={e => patch({ cStr: e.target.value })}
            style={{ ...inputStyle, opacity: isWater ? 1 : 0.5 }}
          />
          <Helper text={isWater ? `기본값 ${cDefault} — 수정 가능 (Hazen-Williams 전용)` : 'Hazen-Williams는 물 전용 — 미적용'} />
        </div>

        <div>
          <label style={labelStyle}>f 수동 입력 (선택)</label>
          <input
            type="number" min="0" step="any"
            value={st.fOverride}
            placeholder="빈칸 = 자동 산출"
            onChange={e => patch({ fOverride: e.target.value })}
            style={inputStyle}
          />
          <Helper text="입력 시 영역별 자동 산출 대신 이 값을 사용" />
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 14,
        paddingTop: 10, borderTop: `1px dashed ${C.border}`,
        fontSize: 12, color: C.textDark, alignItems: 'center',
      }}>
        <span>Re = <Mono>{res ? formatRe(res.Re) : '—'}</Mono>{regime && <> ({regime.label})</>}</span>
        <span>ε/D = <Mono>{res ? res.relRough.toExponential(3) : '—'}</Mono></span>
        <span>
          f = <Mono>{res ? res.f.toFixed(6) : '—'}</Mono>
          {res && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: C.blue,
              backgroundColor: 'var(--accent-primary-bg-soft)',
              padding: '1px 6px', borderRadius: 999, marginLeft: 6,
            }}>{fMethodLabel(res.fMethod)}</span>
          )}
        </span>
        <span>
          Swamee-Jain 검산 = <Mono>{res ? (res.fSwameeJain !== null ? res.fSwameeJain.toFixed(6) : '적용범위 외') : '—'}</Mono>
          {res?.fIterations !== undefined && (
            <span style={{ color: 'var(--text-quaternary)', marginLeft: 6 }}>(반복 {res.fIterations}회 수렴)</span>
          )}
        </span>
      </div>
    </FormulaSection>
  );
}

function EditedBadge() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, color: 'var(--state-warn-text)',
      backgroundColor: 'var(--state-warn-bg)',
      padding: '1px 6px', borderRadius: 999, textTransform: 'none',
    }}>수정됨</span>
  );
}

function Helper({ text }: { text: string }) {
  return (
    <p style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 4, paddingLeft: 2, lineHeight: 1.5 }}>
      {text}
    </p>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: C.heading }}>
      {children}
    </span>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      fontFamily: 'ui-monospace, monospace', fontSize: 12,
      backgroundColor: 'var(--bg-surface)', padding: '1px 6px',
      borderRadius: 4, border: `1px solid ${C.border}`,
    }}>{children}</code>
  );
}
