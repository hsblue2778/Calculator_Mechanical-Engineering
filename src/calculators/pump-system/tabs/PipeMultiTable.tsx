// HVAC 펌프 시스템 — 다중 배관 구간 테이블 서브컴포넌트
// 3단계 셀렉트: 재질 → 두께규격(Schedule) → 호칭경

import { useId } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { PIPE_MATERIALS_V2 } from '../../../data/pipeSizes';
import { LENGTH_UNITS, getLengthUnits, type LengthUnitKey } from '../units';
import { useUnitSystem } from '../../../state/unitSystemStore';
import { C, inputStyle, labelStyle, sectionStyle, sectionTitleStyle } from '../styles';
import { UnitBtn } from './FormComponents';
import type { PipeRowState } from './CalculatorTab';

const thS: React.CSSProperties = {
  border: '1px solid var(--border-subtle)', padding: '6px 10px', fontWeight: 600,
  fontSize: 12, textAlign: 'left', color: 'var(--text-secondary)',
};
const tdS: React.CSSProperties = {
  border: '1px solid var(--border-subtle)', padding: '6px 10px', fontSize: 13,
};

interface Props {
  title: string;
  side: 'suction' | 'discharge';
  prefix: 'SP' | 'DP';
  rows: PipeRowState[];
  onChange: (rows: PipeRowState[]) => void;
}

export function PipeMultiTable({ title, prefix, rows, onChange }: Props) {
  const uid = useId();
  const [us] = useUnitSystem();

  function addRow() {
    const defaultMat = PIPE_MATERIALS_V2[0];
    const defaultSched = defaultMat.schedules[0];
    const defaultSize = defaultSched.sizes[0];
    onChange([...rows, {
      uid: `${uid}-row-${Date.now()}`,
      materialId: defaultMat.id,
      scheduleId: defaultSched.id,
      nominalA: defaultSize.nominalA,
      lStr: '',
      lUnit: 'm',
    }]);
  }

  function removeRow(rowUid: string) {
    if (rows.length <= 1) return; // 최소 1행 보장
    onChange(rows.filter(r => r.uid !== rowUid));
  }

  function updateRow(rowUid: string, patch: Partial<PipeRowState>) {
    onChange(rows.map(r => r.uid === rowUid ? { ...r, ...patch } : r));
  }

  function handleLUnitChange(rowUid: string, currentRow: PipeRowState, newUnit: LengthUnitKey) {
    if (newUnit === currentRow.lUnit) return;
    const n = parseFloat(currentRow.lStr);
    if (Number.isFinite(n) && n > 0) {
      const oldFactor = LENGTH_UNITS.find(u => u.key === currentRow.lUnit)?.toM ?? 1;
      const newFactor = LENGTH_UNITS.find(u => u.key === newUnit)?.toM ?? 1;
      const converted = n * oldFactor / newFactor;
      updateRow(rowUid, { lStr: fmtNum(converted), lUnit: newUnit });
    } else {
      updateRow(rowUid, { lUnit: newUnit });
    }
  }

  function handleMaterialChange(rowUid: string, newMatId: string) {
    const newMat = PIPE_MATERIALS_V2.find(m => m.id === newMatId);
    const newSched = newMat?.schedules[0];
    const newSize = newSched?.sizes[0];
    updateRow(rowUid, {
      materialId: newMatId,
      scheduleId: newSched?.id ?? 'ks-std',
      nominalA: newSize?.nominalA ?? 0,
    });
  }

  function handleScheduleChange(rowUid: string, row: PipeRowState, newSchedId: string) {
    const matV2 = PIPE_MATERIALS_V2.find(m => m.id === row.materialId);
    const newSched = matV2?.schedules.find(s => s.id === newSchedId);
    const newSize = newSched?.sizes[0];
    updateRow(rowUid, {
      scheduleId: newSchedId as PipeRowState['scheduleId'],
      nominalA: newSize?.nominalA ?? 0,
    });
  }

  return (
    <div className="pump-section" style={sectionStyle}>
      <p style={sectionTitleStyle}>{title}</p>
      {rows.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760, tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 56 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 190 }} />
              <col style={{ width: 200 }} />
              <col style={{ width: 36 }} />
            </colgroup>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-2)' }}>
                <th style={thS}>번호</th>
                <th style={thS}>재질</th>
                <th style={thS}>두께규격</th>
                <th style={thS}>호칭경</th>
                <th style={thS}>길이</th>
                <th style={thS}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const matV2 = PIPE_MATERIALS_V2.find(m => m.id === row.materialId);
                const schedSpec = matV2?.schedules.find(s => s.id === row.scheduleId) ?? matV2?.schedules[0];
                const sizes = schedSpec?.sizes ?? [];
                const label = `${prefix}-${i + 1}`;
                return (
                  <tr key={row.uid}>
                    {/* 번호 배지 */}
                    <td style={tdS}>
                      <span style={{
                        display: 'inline-block',
                        backgroundColor: C.badge, color: C.badgeText,
                        fontSize: 11, fontWeight: 700, borderRadius: 4,
                        padding: '2px 7px', border: `1px solid var(--accent-primary-bg)`,
                        letterSpacing: '0.02em',
                      }}>
                        {label}
                      </span>
                    </td>
                    {/* 재질 */}
                    <td style={tdS}>
                      <select
                        value={row.materialId}
                        onChange={e => handleMaterialChange(row.uid, e.target.value)}
                        style={{ ...inputStyle, fontSize: 12, padding: '4px 6px', width: '100%' }}
                        onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
                        onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
                      >
                        {PIPE_MATERIALS_V2.map(m => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                    </td>
                    {/* 두께규격 */}
                    <td style={tdS}>
                      <select
                        value={row.scheduleId}
                        onChange={e => handleScheduleChange(row.uid, row, e.target.value)}
                        style={{ ...inputStyle, fontSize: 12, padding: '4px 6px', width: '100%' }}
                        onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
                        onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
                      >
                        {(matV2?.schedules ?? []).map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    {/* 호칭경 */}
                    <td style={tdS}>
                      <select
                        value={row.nominalA}
                        onChange={e => updateRow(row.uid, { nominalA: Number(e.target.value) })}
                        style={{ ...inputStyle, fontSize: 12, padding: '4px 6px', width: '100%' }}
                        onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
                        onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
                      >
                        {sizes.map(s => (
                          <option key={s.nominalA} value={s.nominalA}>
                            {s.nominalA}A (ID: {s.id_mm.toFixed(1)} mm)
                          </option>
                        ))}
                      </select>
                    </td>
                    {/* 길이 */}
                    <td style={tdS}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input
                          type="number"
                          value={row.lStr}
                          min={0}
                          step="any"
                          onChange={e => updateRow(row.uid, { lStr: e.target.value })}
                          style={{ ...inputStyle, fontSize: 12, padding: '4px 8px', width: 70, flex: '0 0 auto' }}
                          onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
                          onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
                        />
                        <div style={{ display: 'flex', gap: 2 }}>
                          {getLengthUnits(us).map(u => (
                            <UnitBtn
                              key={u.key}
                              label={u.label}
                              active={row.lUnit === u.key}
                              onClick={() => handleLUnitChange(row.uid, row, u.key)}
                            />
                          ))}
                        </div>
                      </div>
                    </td>
                    {/* 삭제 버튼 */}
                    <td style={tdS}>
                      <button
                        onClick={() => removeRow(row.uid)}
                        disabled={rows.length <= 1}
                        style={{
                          background: 'none', border: 'none', cursor: rows.length <= 1 ? 'not-allowed' : 'pointer',
                          color: rows.length <= 1 ? 'var(--border-default)' : 'var(--state-error)', padding: 4,
                        }}
                        title={rows.length <= 1 ? '최소 1행 필요' : '삭제'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <button onClick={addRow} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '6px 12px', fontSize: 13, borderRadius: 6,
        border: `1px solid ${C.blue}`, backgroundColor: 'var(--accent-primary-bg-soft)',
        color: C.blue, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        <Plus size={14} /> + {prefix === 'SP' ? '흡입측' : '토출측'} 배관 추가
      </button>
      <div style={{ marginTop: 6 }}>
        <label style={labelStyle}>내경 정보</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {rows.map((row, i) => {
            const matV2 = PIPE_MATERIALS_V2.find(m => m.id === row.materialId);
            const schedSpec = matV2?.schedules.find(s => s.id === row.scheduleId) ?? matV2?.schedules[0];
            const sizeSpec = schedSpec?.sizes.find(s => s.nominalA === row.nominalA);
            return sizeSpec ? (
              <span key={row.uid} style={{
                fontSize: 11, color: C.textDark, backgroundColor: C.surfaceAlt,
                border: `1px solid ${C.border}`, borderRadius: 4, padding: '2px 8px',
              }}>
                {prefix}-{i + 1}: {sizeSpec.id_mm.toFixed(1)} mm
              </span>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}

function fmtNum(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '';
  if (n === 0) return '0';
  if (n < 1) return n.toFixed(3);
  if (n < 10) return n.toFixed(2);
  if (n < 100) return n.toFixed(1);
  return n.toFixed(0);
}
