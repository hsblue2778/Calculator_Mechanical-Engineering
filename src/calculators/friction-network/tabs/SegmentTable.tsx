// 마찰손실 계통 계산기 — 구간 입력 테이블 (가로 스크롤, ID 열 sticky)
// 행 = 구간. 부모ID 트리(ROOT 최상단), 최대 30행. 자식이 있는 행은 말단유량·요구압 입력 비활성.
// ΣK 칸 옆 부속 선택기 — 계통 종류에 맞는 K값 카탈로그(배관: Perry's / 덕트: 편람 표 10·11)에서
// 종류·수량 선택 → ΣK 자동 합산.

import { useState } from 'react';
import { Plus, Trash2, Wrench } from 'lucide-react';
import {
  FN_GRADES, FN_MATERIALS, FN_MAX_ROWS, fnMaterial,
  type FNGrade, type FNMaterialId, type FNCondition, type FNSystemType,
} from '../../../data/frictionNetworkRef.ts';
import { FITTING_K_VALUES, type FittingKValue } from '../../../data/fitting-k-values';
import { DUCT_FITTING_K_VALUES, findFittingK } from '../../../data/duct-fitting-k-values';
import Modal from '../../../components/Modal';
import type { FNShape, FNFlowUnit } from '../calc';
import type { FNSegmentState, FNFittingSel } from '../index';
import { C, cellInputStyle, cellSelectStyle } from '../styles';
import { SectionLabel } from './SettingsPanel';

interface Props {
  rows: FNSegmentState[];
  patchRow: (i: number, patch: Partial<FNSegmentState>) => void;
  addRow: () => void;
  removeRow: (i: number) => void;
  flowUnit: FNFlowUnit;
  systemType: FNSystemType;    // 부속 카탈로그 선택 (배관/덕트)
}

const th: React.CSSProperties = {
  padding: '6px 8px', fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)',
  textAlign: 'left', whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}`,
  backgroundColor: C.surfaceAlt,
};
const td: React.CSSProperties = {
  padding: '4px 6px', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle',
};

export default function SegmentTable({ rows, patchRow, addRow, removeRow, flowUnit, systemType }: Props) {
  // 자식이 있는 행(비말단) — 말단유량·요구압 비활성
  const hasChild = rows.map(r =>
    r.id.trim() !== '' && rows.some(o => o !== r && o.parentId.trim() === r.id.trim()));
  // 부속 선택기 모달 — 편집 중인 행 index (null = 닫힘)
  const [editingRow, setEditingRow] = useState<number | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <SectionLabel>구간 입력 <span style={{ fontWeight: 400, fontSize: 12, color: C.text }}>
          — 부모ID는 ROOT 또는 위 행의 ID · 말단 구간에만 말단유량 입력
        </span></SectionLabel>
        <button
          onClick={addRow}
          disabled={rows.length >= FN_MAX_ROWS}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', fontSize: 12.5, fontWeight: 600,
            color: rows.length >= FN_MAX_ROWS ? 'var(--text-quaternary)' : C.textDark,
            backgroundColor: 'transparent',
            border: `1px solid ${rows.length >= FN_MAX_ROWS ? C.border : C.borderInput}`,
            borderRadius: 6, cursor: rows.length >= FN_MAX_ROWS ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          <Plus size={13} /> 행 추가 ({rows.length}/{FN_MAX_ROWS})
        </button>
      </div>

      <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 8 }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 1180 }}>
          <thead>
            <tr>
              <th style={{ ...th, position: 'sticky', left: 0, zIndex: 2 }}>구간 ID</th>
              <th style={th}>부모 ID</th>
              <th style={th}>등급</th>
              <th style={th}>단면</th>
              <th style={th}>D (mm)</th>
              <th style={th}>a (mm)</th>
              <th style={th}>b (mm)</th>
              <th style={th}>L (m)</th>
              <th style={th}>ΣK</th>
              <th style={th}>기기손실 (Pa)</th>
              <th style={th}>재질</th>
              <th style={th}>상태</th>
              <th style={th}>ε (mm)</th>
              <th style={th}>말단유량 ({flowUnit})</th>
              <th style={th}>요구압 (Pa)</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const rect = r.shape === 'rect';
              const nonLeaf = hasChild[i];
              const eps = fnMaterial(r.materialId).eps_mm[r.condition];
              return (
                <tr key={i}>
                  <td style={{ ...td, position: 'sticky', left: 0, zIndex: 1, backgroundColor: C.surface, minWidth: 76 }}>
                    <input value={r.id} onChange={e => patchRow(i, { id: e.target.value })}
                      style={{ ...cellInputStyle, fontWeight: 600 }} />
                  </td>
                  <td style={{ ...td, minWidth: 76 }}>
                    <input value={r.parentId} onChange={e => patchRow(i, { parentId: e.target.value })}
                      style={cellInputStyle} placeholder="ROOT" />
                  </td>
                  <td style={{ ...td, minWidth: 72 }}>
                    <select value={r.grade} onChange={e => patchRow(i, { grade: e.target.value as FNGrade })} style={cellSelectStyle}>
                      {FN_GRADES.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
                    </select>
                  </td>
                  <td style={{ ...td, minWidth: 72 }}>
                    <select value={r.shape} onChange={e => patchRow(i, { shape: e.target.value as FNShape })} style={cellSelectStyle}>
                      <option value="circle">원형</option>
                      <option value="rect">사각</option>
                    </select>
                  </td>
                  <NumCell value={r.D} disabled={rect} onChange={v => patchRow(i, { D: v })} />
                  <NumCell value={r.a} disabled={!rect} onChange={v => patchRow(i, { a: v })} />
                  <NumCell value={r.b} disabled={!rect} onChange={v => patchRow(i, { b: v })} />
                  <NumCell value={r.L} onChange={v => patchRow(i, { L: v })} />
                  <SumKCell
                    row={r}
                    onChange={v => patchRow(i, { sumK: v })}
                    onOpenPicker={() => setEditingRow(i)}
                  />
                  <NumCell value={r.equip} onChange={v => patchRow(i, { equip: v })} minWidth={86} />
                  <td style={{ ...td, minWidth: 108 }}>
                    <select value={r.materialId} onChange={e => patchRow(i, { materialId: e.target.value as FNMaterialId })} style={cellSelectStyle}>
                      <optgroup label="배관">
                        {FN_MATERIALS.filter(m => m.kind === 'pipe').map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </optgroup>
                      <optgroup label="덕트">
                        {FN_MATERIALS.filter(m => m.kind === 'duct').map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </optgroup>
                    </select>
                  </td>
                  <td style={{ ...td, minWidth: 68 }}>
                    <select value={r.condition} onChange={e => patchRow(i, { condition: e.target.value as FNCondition })} style={cellSelectStyle}>
                      <option value="new">신관</option>
                      <option value="old">노후</option>
                    </select>
                  </td>
                  <td style={{ ...td, fontSize: 12, fontFamily: 'ui-monospace, monospace', color: C.text, whiteSpace: 'nowrap' }}>
                    {eps}
                  </td>
                  <NumCell value={nonLeaf ? '' : r.terminalFlow} disabled={nonLeaf}
                    onChange={v => patchRow(i, { terminalFlow: v })} minWidth={90}
                    title={nonLeaf ? '자식 구간이 있는 행 — 유량은 자식 합산' : undefined} />
                  <NumCell value={nonLeaf ? '' : r.pReq} disabled={nonLeaf}
                    onChange={v => patchRow(i, { pReq: v })} minWidth={86}
                    title={nonLeaf ? '말단 행에만 적용' : undefined} />
                  <td style={{ ...td, width: 34 }}>
                    <button
                      onClick={() => removeRow(i)}
                      disabled={rows.length <= 1}
                      title="행 삭제"
                      style={{
                        display: 'inline-flex', padding: 5, border: 'none', borderRadius: 4,
                        backgroundColor: 'transparent', cursor: rows.length <= 1 ? 'not-allowed' : 'pointer',
                        color: rows.length <= 1 ? 'var(--text-quaternary)' : C.err,
                      }}
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

      {editingRow !== null && rows[editingRow] && (
        <FittingModal
          row={rows[editingRow]}
          systemType={systemType}
          onClose={() => setEditingRow(null)}
          onApply={(fittings, sumK) => patchRow(editingRow, { fittings, sumK })}
        />
      )}
    </div>
  );
}

// 부속 K값 합계 — 저장된 내역 기준 (배관·덕트 카탈로그 통합 조회)
function fittingsSumK(fittings: FNFittingSel[] | undefined): number {
  if (!fittings) return 0;
  return fittings.reduce((acc, f) => acc + (findFittingK(f.fittingId)?.K ?? 0) * f.qty, 0);
}

// ΣK 셀 — 직접 입력 + 부속 선택 버튼 (내역 있으면 개수 배지)
function SumKCell({ row, onChange, onOpenPicker }: {
  row: FNSegmentState;
  onChange: (v: string) => void; onOpenPicker: () => void;
}) {
  const count = row.fittings?.reduce((n, f) => n + f.qty, 0) ?? 0;
  const computed = fittingsSumK(row.fittings);
  const mismatch = count > 0 && Math.abs(computed - parseFloat(row.sumK)) > 0.005;
  const title = count > 0
    ? `부속 ${count}개 (K 합계 ${computed.toFixed(2)})${mismatch ? ' — ΣK 수동 수정됨' : ''}`
    : '부속 선택 — 종류·수량을 고르면 K값을 자동 합산합니다';
  return (
    <td style={{ ...td, minWidth: 104 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <input
          type="number" step="any" value={row.sumK}
          onChange={e => onChange(e.target.value)}
          style={cellInputStyle}
        />
        <button
          onClick={onOpenPicker}
          title={title}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0,
            padding: '4px 5px', fontSize: 10.5, fontWeight: 600,
            color: count > 0 ? C.textDark : 'var(--text-tertiary)',
            backgroundColor: count > 0 ? 'var(--bg-surface-3)' : 'transparent',
            border: `1px solid ${count > 0 ? C.borderInput : C.border}`, borderRadius: 5,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <Wrench size={11} />{count > 0 ? count : ''}
        </button>
      </div>
    </td>
  );
}

// 부속 선택 모달 — 계통 종류별 K값 카탈로그에서 종류·수량 선택 → ΣK 자동 합산
//   배관: Perry's 8th Ed (fitting-k-values.ts) · 덕트: 편람 표 10·11 (duct-fitting-k-values.ts)
function FittingModal({ row, systemType, onClose, onApply }: {
  row: FNSegmentState;
  systemType: FNSystemType;
  onClose: () => void;
  onApply: (fittings: FNFittingSel[], sumK: string) => void;
}) {
  const catalog: FittingKValue[] = systemType === 'duct' ? DUCT_FITTING_K_VALUES : FITTING_K_VALUES;
  const sourceNote = systemType === 'duct'
    ? "출처: 덕트설계 편람 표 10·11 (ΔP = ζ·ρv²/2, v = 상류측 풍속)"
    : "출처: Perry's Chemical Engineers' Handbook 8th Ed (난류 단일 K)";

  const [qty, setQty] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const f of row.fittings ?? []) m[f.fittingId] = String(f.qty);
    return m;
  });

  // 다른 계통 카탈로그로 선택했던 부속 — 목록엔 없지만 내역·합산에는 유지
  const others = (row.fittings ?? []).filter(f => !catalog.some(c => c.id === f.fittingId));
  const othersK = others.reduce((acc, f) => acc + (findFittingK(f.fittingId)?.K ?? 0) * f.qty, 0);

  const sum = catalog.reduce((acc, f) => {
    const n = parseInt(qty[f.id] ?? '', 10);
    return acc + (Number.isFinite(n) && n > 0 ? n * f.K : 0);
  }, 0) + othersK;

  function apply() {
    const selected: FNFittingSel[] = catalog
      .map(f => ({ fittingId: f.id, qty: parseInt(qty[f.id] ?? '', 10) }))
      .filter(f => Number.isFinite(f.qty) && f.qty > 0);
    const fittings = [...selected, ...others];
    onApply(fittings, String(Number(sum.toFixed(2))));
    onClose();
  }

  return (
    <Modal title={`구간 ${row.id.trim() || '—'} 부속 입력`} onClose={onClose} bodyWidth={460}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 12.5, color: C.text, margin: 0 }}>
          부속 종류별 수량을 입력하면 K값이 자동 합산되어 ΣK에 적용됩니다. (적용 후에도 ΣK 직접 수정 가능)
        </p>

        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, maxHeight: '48vh', overflowY: 'auto' }}>
          {catalog.map((f, idx) => (
            <div
              key={f.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px',
                borderTop: idx > 0 ? `1px solid ${C.border}` : 'none',
              }}
            >
              <span style={{ flex: 1, fontSize: 13, color: C.textDark }}>{f.nameKo}</span>
              <span style={{ fontSize: 12, color: C.text, fontFamily: 'ui-monospace, monospace', width: 64, textAlign: 'right' }}>
                K = {f.K}
              </span>
              <input
                type="number" min="0" step="1"
                value={qty[f.id] ?? ''}
                onChange={e => setQty(m => ({ ...m, [f.id]: e.target.value }))}
                placeholder="0"
                style={{ ...cellInputStyle, width: 60, flexShrink: 0 }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.heading }}>
              ΣK = <span style={{ fontFamily: 'ui-monospace, monospace' }}>{sum.toFixed(2)}</span>
              {others.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', marginLeft: 6 }}>
                  (다른 계통 부속 {others.reduce((n, f) => n + f.qty, 0)}개 포함)
                </span>
              )}
            </span>
            <p style={{ fontSize: 11, color: 'var(--text-quaternary)', margin: '2px 0 0' }}>
              {sourceNote}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500,
                color: C.text, backgroundColor: 'transparent',
                border: `1px solid ${C.borderInput}`, borderRadius: 8,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              취소
            </button>
            <button
              onClick={apply}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 600,
                color: 'var(--text-inverse)', backgroundColor: C.blue,
                border: 'none', borderRadius: 8,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ΣK에 적용
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function NumCell({
  value, onChange, disabled, minWidth = 70, title,
}: {
  value: string; onChange: (v: string) => void;
  disabled?: boolean; minWidth?: number; title?: string;
}) {
  return (
    <td style={{ ...td, minWidth }} title={title}>
      <input
        type="number" step="any" value={value} disabled={disabled}
        onChange={e => onChange(e.target.value)}
        style={{
          ...cellInputStyle,
          ...(disabled ? { backgroundColor: C.surfaceAlt, color: 'var(--text-quaternary)', cursor: 'not-allowed' } : {}),
        }}
      />
    </td>
  );
}
