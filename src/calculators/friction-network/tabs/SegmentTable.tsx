// 마찰손실 계통 계산기 — 구간 입력 테이블 (가로 스크롤, ID 열 sticky)
// 행 = 구간. 부모ID 트리(ROOT 최상단), 최대 30행. 자식이 있는 행은 말단유량·요구압 입력 비활성.

import { Plus, Trash2 } from 'lucide-react';
import {
  FN_GRADES, FN_MATERIALS, FN_MAX_ROWS, fnMaterial,
  type FNGrade, type FNMaterialId, type FNCondition,
} from '../../../data/frictionNetworkRef.ts';
import type { FNShape, FNFlowUnit } from '../calc';
import type { FNSegmentState } from '../index';
import { C, cellInputStyle, cellSelectStyle } from '../styles';
import { SectionLabel } from './SettingsPanel';

interface Props {
  rows: FNSegmentState[];
  patchRow: (i: number, patch: Partial<FNSegmentState>) => void;
  addRow: () => void;
  removeRow: (i: number) => void;
  flowUnit: FNFlowUnit;
}

const th: React.CSSProperties = {
  padding: '6px 8px', fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)',
  textAlign: 'left', whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}`,
  backgroundColor: C.surfaceAlt,
};
const td: React.CSSProperties = {
  padding: '4px 6px', borderBottom: `1px solid ${C.border}`, verticalAlign: 'middle',
};

export default function SegmentTable({ rows, patchRow, addRow, removeRow, flowUnit }: Props) {
  // 자식이 있는 행(비말단) — 말단유량·요구압 비활성
  const hasChild = rows.map(r =>
    r.id.trim() !== '' && rows.some(o => o !== r && o.parentId.trim() === r.id.trim()));

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
            color: rows.length >= FN_MAX_ROWS ? 'var(--text-quaternary)' : C.blue,
            backgroundColor: 'transparent',
            border: `1px solid ${rows.length >= FN_MAX_ROWS ? C.border : C.blue}`,
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
                  <NumCell value={r.sumK} onChange={v => patchRow(i, { sumK: v })} />
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
    </div>
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
