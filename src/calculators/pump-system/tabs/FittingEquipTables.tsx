// HVAC 펌프 시스템 — 부속류/장비류 테이블 서브컴포넌트

import { Plus, Trash2 } from 'lucide-react';
import { FITTING_K_VALUES } from '../../../data/fitting-k-values';
import { PRESSURE_UNITS_PUMP } from '../units';
import { C, inputStyle, sectionStyle, sectionTitleStyle } from '../styles';
import type { FittingRowState, EquipRowState } from './CalculatorTab';
import type { EquipKind } from '../calc';

const thS: React.CSSProperties = {
  border: '1px solid var(--border-subtle)', padding: '6px 10px', fontWeight: 600,
  fontSize: 12, textAlign: 'left', color: 'var(--text-secondary)',
};
const tdS: React.CSSProperties = {
  border: '1px solid var(--border-subtle)', padding: '6px 10px', fontSize: 13,
};

// 배관 참조 옵션 타입 (CalculatorTab에서 buildPipeRefOptions로 생성)
export interface PipeRefOption {
  label: string;
  side: 'suction' | 'discharge';
  index: number;
}

// ── 부속류 테이블 ────────────────────────────────────────────────
interface FittingTableProps {
  rows: FittingRowState[];
  pipeRefOptions: PipeRefOption[];
  onAdd: () => void;
  onRemove: (uid: string) => void;
  onUpdate: (uid: string, patch: Partial<FittingRowState>) => void;
}

export function FittingTable({ rows, pipeRefOptions, onAdd, onRemove, onUpdate }: FittingTableProps) {
  return (
    <div className="pump-section" style={sectionStyle}>
      <p style={sectionTitleStyle}>부속류 (흡입·토출 합산)</p>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10, marginTop: 0 }}>
        K값 출처: Perry's Chemical Engineers' Handbook 8th Ed (2008) — 난류 기준 단일 K.
        배관 참조로 어느 배관의 유속을 쓸지 지정합니다.
      </p>
      {rows.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-2)' }}>
                <th style={{ ...thS, width: 56 }}>번호</th>
                <th style={thS}>부속 타입</th>
                <th style={thS}>배관 참조</th>
                <th style={thS}>수량</th>
                <th style={thS}>K</th>
                <th style={{ ...thS, width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const fitting = FITTING_K_VALUES.find(f => f.id === row.fittingId);
                const fittingLabel = `F-${idx + 1}`;
                return (
                  <tr key={row.uid}>
                    {/* 번호 배지 */}
                    <td style={tdS}>
                      <span style={{
                        display: 'inline-block',
                        backgroundColor: 'var(--state-success-bg)', color: 'var(--state-success-text)',
                        fontSize: 11, fontWeight: 700, borderRadius: 4,
                        padding: '2px 7px', border: `1px solid var(--state-success)`,
                      }}>
                        {fittingLabel}
                      </span>
                    </td>
                    {/* 부속 타입 */}
                    <td style={tdS}>
                      <select value={row.fittingId}
                        onChange={e => onUpdate(row.uid, { fittingId: e.target.value })}
                        style={{ ...inputStyle, fontSize: 12, padding: '4px 8px' }}
                        onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
                        onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
                      >
                        {FITTING_K_VALUES.map(f => (
                          <option key={f.id} value={f.id}>{f.nameKo}</option>
                        ))}
                      </select>
                    </td>
                    {/* 배관 참조 드롭다운 */}
                    <td style={tdS}>
                      {pipeRefOptions.length > 0 ? (
                        <select
                          value={`${row.pipeRefSide}:${row.pipeRefIndex}`}
                          onChange={e => {
                            const [side, idx] = e.target.value.split(':');
                            onUpdate(row.uid, {
                              pipeRefSide: side as 'suction' | 'discharge',
                              pipeRefIndex: parseInt(idx, 10),
                            });
                          }}
                          style={{ ...inputStyle, fontSize: 12, padding: '4px 8px' }}
                          onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
                          onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
                        >
                          {pipeRefOptions.map(opt => (
                            <option key={`${opt.side}:${opt.index}`} value={`${opt.side}:${opt.index}`}>
                              {opt.label} ({opt.side === 'suction' ? '흡입' : '토출'})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-quaternary)' }}>배관 없음</span>
                      )}
                    </td>
                    {/* 수량 */}
                    <td style={tdS}>
                      <input type="number" value={row.qty} min={1}
                        onChange={e => onUpdate(row.uid, { qty: parseInt(e.target.value) || 1 })}
                        style={{ ...inputStyle, fontSize: 12, padding: '4px 8px', width: 60 }}
                        onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
                        onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }} />
                    </td>
                    {/* K값 */}
                    <td style={{ ...tdS, color: 'var(--text-tertiary)' }}>
                      {fitting ? fitting.K.toFixed(2) : '—'}
                    </td>
                    {/* 삭제 */}
                    <td style={tdS}>
                      <button onClick={() => onRemove(row.uid)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--state-error)', padding: 4 }}
                        title="삭제">
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
      {rows.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-quaternary)', marginBottom: 8 }}>
          부속류 없음 — 마찰손실 0으로 처리됩니다.
        </p>
      )}
      <button onClick={onAdd} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '6px 12px', fontSize: 13, borderRadius: 6,
        border: `1px solid ${C.blue}`, backgroundColor: 'var(--accent-primary-bg-soft)',
        color: C.blue, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        <Plus size={14} /> 부속 추가
      </button>
    </div>
  );
}

// ── 장비류 테이블 ─────────────────────────────────────────────────
interface EquipTableProps {
  rows: EquipRowState[];
  pipeRefOptions: PipeRefOption[];
  onAdd: () => void;
  onRemove: (uid: string) => void;
  onUpdate: (uid: string, patch: Partial<EquipRowState>) => void;
}

export function EquipTable({ rows, pipeRefOptions, onAdd, onRemove, onUpdate }: EquipTableProps) {
  return (
    <div className="pump-section" style={sectionStyle}>
      <p style={sectionTitleStyle}>장비류 (선택)</p>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10, marginTop: 0 }}>
        배관 참조는 위치 표시·PDF 출력용입니다. 압력강하는 입력값 그대로 합산됩니다.
      </p>
      {rows.length > 0 && (
        <div style={{ overflowX: 'auto', marginBottom: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-2)' }}>
                <th style={{ ...thS, width: 56 }}>번호</th>
                <th style={thS}>종류</th>
                <th style={thS}>장비명</th>
                <th style={thS}>배관 참조</th>
                <th style={thS}>압력강하</th>
                <th style={thS}>단위</th>
                <th style={{ ...thS, width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const equipLabel = `E-${idx + 1}`;
                const kind: EquipKind = row.kind ?? 'other';
                return (
                  <tr key={row.uid}>
                    {/* 번호 배지 */}
                    <td style={tdS}>
                      <span style={{
                        display: 'inline-block',
                        backgroundColor: 'var(--state-warn-bg)', color: 'var(--state-warn-text)',
                        fontSize: 11, fontWeight: 700, borderRadius: 4,
                        padding: '2px 7px', border: `1px solid var(--state-warn)`,
                      }}>
                        {equipLabel}
                      </span>
                    </td>
                    {/* 종류 셀렉터 */}
                    <td style={tdS}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <select
                          value={kind}
                          onChange={e => onUpdate(row.uid, { kind: e.target.value as EquipKind })}
                          style={{ ...inputStyle, fontSize: 12, padding: '4px 8px' }}
                          onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
                          onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
                        >
                          <option value="other">기타</option>
                          <option value="control-valve">컨트롤 밸브</option>
                          <option value="heat-exchanger">열교환기</option>
                          <option value="filter">필터</option>
                          <option value="pump">펌프</option>
                        </select>
                        {kind === 'filter' && (
                          <label
                            title="Dirty 운전 가정 — 입력 ΔP × 2.5 (ASHRAE Filtration & Air Cleaning)"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer', color: '#eab308', fontWeight: 600 }}
                          >
                            <input
                              type="checkbox"
                              checked={row.dirtyMargin ?? false}
                              onChange={e => onUpdate(row.uid, { dirtyMargin: e.target.checked })}
                            />
                            Dirty ×2.5
                          </label>
                        )}
                      </div>
                    </td>
                    {/* 장비명 */}
                    <td style={tdS}>
                      <input type="text" value={row.name} placeholder="장비명"
                        onChange={e => onUpdate(row.uid, { name: e.target.value })}
                        style={{ ...inputStyle, fontSize: 12, padding: '4px 8px' }}
                        onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
                        onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }} />
                    </td>
                    {/* 배관 참조 */}
                    <td style={tdS}>
                      {pipeRefOptions.length > 0 ? (
                        <select
                          value={`${row.pipeRefSide}:${row.pipeRefIndex}`}
                          onChange={e => {
                            const [side, i] = e.target.value.split(':');
                            onUpdate(row.uid, {
                              pipeRefSide: side as 'suction' | 'discharge',
                              pipeRefIndex: parseInt(i, 10),
                            });
                          }}
                          style={{ ...inputStyle, fontSize: 12, padding: '4px 8px' }}
                          onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
                          onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
                        >
                          {pipeRefOptions.map(opt => (
                            <option key={`${opt.side}:${opt.index}`} value={`${opt.side}:${opt.index}`}>
                              {opt.label} ({opt.side === 'suction' ? '흡입' : '토출'})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-quaternary)' }}>배관 없음</span>
                      )}
                    </td>
                    {/* 압력강하 */}
                    <td style={tdS}>
                      <input type="number" value={row.dP} min={0} step="any" placeholder="0"
                        onChange={e => onUpdate(row.uid, { dP: e.target.value })}
                        style={{ ...inputStyle, fontSize: 12, padding: '4px 8px', width: 80 }}
                        onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
                        onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }} />
                    </td>
                    {/* 단위 */}
                    <td style={tdS}>
                      <select value={row.dPUnit}
                        onChange={e => onUpdate(row.uid, { dPUnit: e.target.value as 'kPa' | 'mAq' | 'kgfcm2' })}
                        style={{ ...inputStyle, fontSize: 12, padding: '4px 8px' }}
                        onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
                        onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
                      >
                        {PRESSURE_UNITS_PUMP.map(u => (
                          <option key={u.key} value={u.key}>{u.label}</option>
                        ))}
                      </select>
                    </td>
                    {/* 삭제 */}
                    <td style={tdS}>
                      <button onClick={() => onRemove(row.uid)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--state-error)', padding: 4 }}
                        title="삭제">
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
      {rows.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-quaternary)', marginBottom: 8 }}>
          장비류 없음 — 0으로 처리됩니다.
        </p>
      )}
      <button onClick={onAdd} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '6px 12px', fontSize: 13, borderRadius: 6,
        border: `1px solid ${C.blue}`, backgroundColor: 'var(--accent-primary-bg-soft)',
        color: C.blue, cursor: 'pointer', fontFamily: 'inherit',
      }}>
        <Plus size={14} /> 장비 추가
      </button>
    </div>
  );
}
