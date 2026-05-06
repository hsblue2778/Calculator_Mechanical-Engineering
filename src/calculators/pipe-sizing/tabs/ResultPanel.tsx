// 관경 계산기 — 선정 결과 표 카드 + 관경별 상세 테이블

import { AlertTriangle } from 'lucide-react';
import {
  type SizingRow,
  velocityStatus,
  VELOCITY_RECOMMENDED_MIN, VELOCITY_RECOMMENDED_MAX,
} from '../calc';
import { PRESSURE_UNITS, type PressureUnitKey } from '../../pipe-friction/units';
import type { PipeMaterialSize } from '../../../data/pipeSizes';
import { mmAqToDisplay } from '../units';
import { C, labelStyle } from '../styles';

interface SummaryProps {
  selected: SizingRow | null;
  noSolution: boolean;
  mat: PipeMaterialSize;
  pressureUnit: PressureUnitKey;
}

export function ResultPanel({ selected, noSolution, mat, pressureUnit }: SummaryProps) {
  const pressDef = PRESSURE_UNITS.find(u => u.key === pressureUnit)!;
  const sizeText = selected ? `${selected.size.nominalA}A` : '—';
  const idText = selected ? `ID ${selected.size.id_mm.toFixed(1)} mm` : '';
  const v = selected?.v_ms;
  const vStatus = v !== undefined ? velocityStatus(v) : 'low';
  const vColor = vStatus === 'ok' ? C.ok : vStatus === 'high' ? 'var(--state-error)' : C.warn;
  const drop_display = selected ? mmAqToDisplay(selected.dropPerM_mmAqPerM, pressureUnit) : null;

  return (
    <div style={{
      backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: '20px 24px',
    }}>
      {noSolution && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          padding: '10px 12px', backgroundColor: 'var(--state-warn-bg)',
          border: '1px solid var(--state-warn)', borderRadius: 6,
          color: 'var(--state-warn-text)', fontSize: 13,
        }}>
          <AlertTriangle size={16} />
          <span>선택 가능한 관경이 없습니다. 유량을 줄이거나 허용 압력강하를 높이거나 더 큰 관경이 제공되는 재질(현재 최대 {mat.sizes[mat.sizes.length - 1].nominalA}A)을 확인하세요.</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        <div>
          <div style={labelStyle}>선정 관경</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontSize: 28, fontWeight: selected ? 700 : 500,
              color: selected ? C.navy : C.text, letterSpacing: '-0.01em',
            }}>{sizeText}</span>
          </div>
          {idText && <div style={{ fontSize: 12, color: C.text, marginTop: 2 }}>{idText}</div>}
        </div>

        <div>
          <div style={labelStyle}>유속</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontSize: 24, fontWeight: v !== undefined ? 700 : 500,
              color: v !== undefined ? vColor : C.text, letterSpacing: '-0.01em',
            }}>
              {v !== undefined ? v.toFixed(2) : '—'}
            </span>
            <span style={{ fontSize: 14, color: C.text }}>m/s</span>
          </div>
          {v !== undefined && vStatus !== 'ok' && (
            <div style={{ fontSize: 11, color: vColor, marginTop: 2 }}>
              권장 {VELOCITY_RECOMMENDED_MIN}~{VELOCITY_RECOMMENDED_MAX} m/s {vStatus === 'low' ? '미만' : '초과'}
            </div>
          )}
        </div>

        <div>
          <div style={labelStyle}>단위 마찰손실</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{
              fontSize: 24, fontWeight: drop_display !== null ? 700 : 500,
              color: drop_display !== null ? C.navy : C.text, letterSpacing: '-0.01em',
            }}>
              {drop_display !== null ? drop_display.toFixed(pressDef.dp) : '—'}
            </span>
            <span style={{ fontSize: 14, color: C.text }}>{pressDef.label}/m</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SizingDetailTable({
  rows, selected, pressureUnit,
}: {
  rows: SizingRow[];
  selected: SizingRow | null;
  pressureUnit: PressureUnitKey;
}) {
  const pressDef = PRESSURE_UNITS.find(u => u.key === pressureUnit)!;
  return (
    <div style={{ marginTop: 10, overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', fontFamily: 'ui-monospace, monospace' }}>
        <thead>
          <tr style={{ textAlign: 'right', color: C.text, borderBottom: `1px solid ${C.border}` }}>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500 }}>호칭</th>
            <th style={{ padding: '8px 10px', fontWeight: 500 }}>내경(mm)</th>
            <th style={{ padding: '8px 10px', fontWeight: 500 }}>유속(m/s)</th>
            <th style={{ padding: '8px 10px', fontWeight: 500 }}>ΔP/L ({pressDef.label}/m)</th>
            <th style={{ padding: '8px 10px', fontWeight: 500 }}>선정</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const isSelected = !!selected && selected.size.nominalA === r.size.nominalA;
            const drop_display = mmAqToDisplay(r.dropPerM_mmAqPerM, pressureUnit);
            return (
              <tr key={r.size.nominalA} style={{
                backgroundColor: isSelected ? 'var(--accent-primary-bg-soft)' : 'transparent',
                borderBottom: `1px solid ${C.border}`,
                color: r.ok ? C.textDark : 'var(--text-quaternary)',
                fontWeight: isSelected ? 700 : 400,
              }}>
                <td style={{ padding: '6px 10px', textAlign: 'left' }}>{r.size.nominalA}A</td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>{r.size.id_mm.toFixed(1)}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>{r.v_ms.toFixed(2)}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>{drop_display.toFixed(pressDef.dp)}</td>
                <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                  {isSelected ? <span style={{ color: 'var(--accent-primary-hover)' }}>◀ 선정</span> : r.ok ? <span style={{ color: 'var(--state-success-text)' }}>OK</span> : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
