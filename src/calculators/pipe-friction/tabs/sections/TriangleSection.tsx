// 관마찰손실 — 흐름 조건 섹션 (Q·V·D 2-of-3 삼각 입력 + 길이 L)
// 엑셀 PHASE 1의 3가지 가정 모드를 하나로 통합: 2개를 입력하면 나머지 1개가 자동 산출된다.
// 자동 산출 칸을 직접 수정하면 그 칸이 입력으로 승격되고, 가장 먼저 입력했던 칸이 자동 산출로 바뀐다.

import FormulaSection from '../../../../components/FormulaSection';
import Frac from '../../../../components/Frac';
import type { TriField } from '../../engine.ts';
import type { PipeFrictionController } from '../../usePipeFrictionState.ts';
import { pfFlowUnitDef } from '../../pfUnits.ts';
import { C, inputStyle, labelStyle } from '../../styles';

export default function TriangleSection({ pf }: { pf: PipeFrictionController }) {
  const { st, patch, triDisplay, derivedField, editTri } = pf;
  const flowLabel = pfFlowUnitDef(st.flowUnit).label;

  return (
    <FormulaSection title="흐름 조건 — 유량·유속·관경 중 2개 입력 (나머지 1개 자동 산출)">
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, fontSize: 14 }}>
        <span>Q</span><span>=</span>
        <Frac n={<>π × D²</>} d={<>4</>} />
        <span>× V</span>
        <span style={{ fontSize: 12, color: C.text, marginLeft: 12 }}>
          (D = √(4Q/πV) · V = 4Q/πD²)
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginTop: 16 }}>
        <TriInput
          field="Q" label="유량 Q" unit={flowLabel}
          value={triDisplay.Q} derived={derivedField === 'Q'} onEdit={editTri}
        />
        <TriInput
          field="V" label="유속 V" unit="m/s"
          value={triDisplay.V} derived={derivedField === 'V'} onEdit={editTri}
        />
        <TriInput
          field="D" label="관 내경 D" unit="mm"
          value={triDisplay.D} derived={derivedField === 'D'} onEdit={editTri}
        />
        <div>
          <label style={labelStyle}>
            배관 길이 L <span style={{ color: 'var(--text-quaternary)', fontWeight: 400, textTransform: 'none' }}>(m)</span>
          </label>
          <input
            type="number" min="0" step="any"
            value={st.L}
            onChange={e => patch({ L: e.target.value })}
            style={inputStyle}
          />
        </div>
      </div>

      <p style={{ fontSize: 12, color: C.text, marginTop: 14 }}>
        마지막에 수정한 2개가 입력값으로 고정됩니다. <b>자동 산출</b> 칸을 직접 수정하면 그 값이 입력으로 승격됩니다.
      </p>
    </FormulaSection>
  );
}

function TriInput({
  field, label, unit, value, derived, onEdit,
}: {
  field: TriField; label: string; unit: string;
  value: string; derived: boolean;
  onEdit: (f: TriField, raw: string) => void;
}) {
  return (
    <div>
      <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>
          {label} <span style={{ color: 'var(--text-quaternary)', fontWeight: 400, textTransform: 'none' }}>({unit})</span>
        </span>
        {derived && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: C.blue,
            backgroundColor: 'var(--accent-primary-bg-soft)',
            padding: '1px 6px', borderRadius: 999, textTransform: 'none',
          }}>자동 산출</span>
        )}
      </label>
      <input
        type="number" min="0" step="any"
        value={value}
        onChange={e => onEdit(field, e.target.value)}
        style={{
          ...inputStyle,
          backgroundColor: derived ? 'var(--accent-primary-bg-soft)' : 'var(--bg-surface)',
          borderColor: derived ? C.blue : 'var(--border-default)',
          fontWeight: derived ? 600 : 400,
        }}
      />
    </div>
  );
}
