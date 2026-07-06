// 마찰손실 계통 계산기 — ③ 구간 결과(read-only) + ④ 판정 요약 (KPI + 맥락 경고)
// 판정: 최대(누적손실+요구압) vs 설계 가용정압 P_avail×(1−α) → 여유/부족

import Kpi from '../../../components/Kpi';
import WarningList, { type WarningItem } from '../../../components/WarningList';
import { FN_PA_PER_MMAQ } from '../../../data/frictionNetworkRef.ts';
import {
  VERDICT_LABELS, REGIME_LABELS,
  type FNNetworkResult, type FNFlowUnit, type FNSegmentResult,
} from '../calc';
import { C } from '../styles';
import { SectionLabel } from './SettingsPanel';

interface Props {
  net: FNNetworkResult | null;
  flowUnit: FNFlowUnit;
  pAvailEntered: boolean;
}

const th: React.CSSProperties = {
  padding: '6px 8px', fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)',
  textAlign: 'right', whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}`,
  backgroundColor: C.surfaceAlt,
};
const td: React.CSSProperties = {
  padding: '5px 8px', fontSize: 12.5, textAlign: 'right', whiteSpace: 'nowrap',
  borderBottom: `1px solid ${C.border}`, fontFamily: 'ui-monospace, monospace',
  color: 'var(--text-secondary)',
};

const fmt = (v: number, dp = 1) => Number.isFinite(v) ? v.toFixed(dp) : '—';
const fmtInt = (v: number) => Number.isFinite(v) ? Math.round(v).toLocaleString() : '—';

export default function ResultsPanel({ net, flowUnit, pAvailEntered }: Props) {
  if (!net) {
    return (
      <p style={{ fontSize: 13, color: 'var(--text-quaternary)', margin: 0 }}>
        구간을 입력하면 결과가 표시됩니다. (치수·길이·말단유량 입력 필요)
      </p>
    );
  }

  const flowMul = flowUnit === 'LPM' ? 60000 : 3600;   // m³/s → 표시 단위
  const warnings = buildWarnings(net, pAvailEntered);
  const short = pAvailEntered && net.margin_Pa < 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionLabel>③ 구간 결과</SectionLabel>

      <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 8 }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', minWidth: 1100 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left', position: 'sticky', left: 0, zIndex: 2 }}>구간</th>
              <th style={{ ...th, textAlign: 'left' }}>말단</th>
              <th style={th}>Q ({flowUnit})</th>
              <th style={th}>De (mm)</th>
              <th style={th}>V (m/s)</th>
              <th style={{ ...th, textAlign: 'left' }}>유속판정</th>
              <th style={th}>제안D (mm)</th>
              <th style={th}>Re</th>
              <th style={{ ...th, textAlign: 'left' }}>유동</th>
              <th style={th}>f</th>
              <th style={th}>ΔP마찰 (Pa)</th>
              <th style={th}>ΔP부차 (Pa)</th>
              <th style={th}>ΔP구간 (Pa)</th>
              <th style={th}>누적ΔP (Pa)</th>
              <th style={th}>누적 (mmAq)</th>
              <th style={th}>누적+요구압 (Pa)</th>
            </tr>
          </thead>
          <tbody>
            {net.rows.map((r, i) => <ResultRow key={i} r={r} flowMul={flowMul} worst={r.id === net.worstId && !r.error} />)}
          </tbody>
        </table>
      </div>

      <SectionLabel>④ 판정 요약</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <Kpi
          label={`최대 누적손실+요구압${net.worstId ? ` (${net.worstId})` : ''}`}
          value={fmtInt(net.worstDemand_Pa)}
          unit="Pa"
          subLabel={`${fmt(net.worstDemand_Pa / FN_PA_PER_MMAQ, 1)} mmAq`}
        />
        <Kpi
          label="설계 가용정압 P_avail×(1−α)"
          value={pAvailEntered ? fmtInt(net.designAvail_Pa) : '—'}
          unit={pAvailEntered ? 'Pa' : undefined}
          subLabel={pAvailEntered ? `${fmt(net.designAvail_Pa / FN_PA_PER_MMAQ, 1)} mmAq` : '가용정압 미입력'}
        />
        <Kpi
          label={short ? '정압 부족' : '정압 여유'}
          value={pAvailEntered ? fmtInt(Math.abs(net.margin_Pa)) : '—'}
          unit={pAvailEntered ? 'Pa' : undefined}
          accent={pAvailEntered ? (short ? 'var(--state-error)' : 'var(--state-success)') : undefined}
          subLabel={pAvailEntered ? (short ? '▲ 가용정압 초과' : 'OK') : '가용정압 미입력'}
        />
      </div>

      <WarningList items={warnings} />
    </div>
  );
}

function ResultRow({ r, flowMul, worst }: { r: FNSegmentResult; flowMul: number; worst: boolean }) {
  const idCell: React.CSSProperties = {
    ...td, textAlign: 'left', fontWeight: 600, position: 'sticky', left: 0, zIndex: 1,
    backgroundColor: worst ? 'var(--accent-primary-bg-soft)' : C.surface,
    color: 'var(--text-primary)',
  };
  if (r.error) {
    return (
      <tr>
        <td style={idCell}>{r.id || '—'}</td>
        <td colSpan={15} style={{ ...td, textAlign: 'left', color: C.err, fontFamily: 'inherit' }}>{r.error}</td>
      </tr>
    );
  }
  const verdictColor = r.verdict === 'ok' ? C.ok : C.warn;
  return (
    <tr style={worst ? { backgroundColor: 'var(--accent-primary-bg-soft)' } : undefined}>
      <td style={idCell}>{r.id}{worst ? ' ★' : ''}</td>
      <td style={{ ...td, textAlign: 'left', fontFamily: 'inherit' }}>{r.isLeaf ? '말단' : '—'}</td>
      <td style={td}>{fmt(r.Q_m3s * flowMul, 1)}</td>
      <td style={td}>{fmt(r.De_mm, 1)}</td>
      <td style={td}>{fmt(r.V_ms, 3)}</td>
      <td style={{ ...td, textAlign: 'left', fontFamily: 'inherit', color: verdictColor, fontWeight: 600 }}>
        {VERDICT_LABELS[r.verdict]}
      </td>
      <td style={td}>{r.verdict === 'high' ? fmt(r.suggestedD_mm, 1) : '—'}</td>
      <td style={td}>{fmtInt(r.Re)}</td>
      <td style={{ ...td, textAlign: 'left', fontFamily: 'inherit', color: r.regime === 'transition' ? C.warn : undefined }}>
        {REGIME_LABELS[r.regime]}
      </td>
      <td style={td}>{fmt(r.f, 5)}</td>
      <td style={td}>{fmt(r.dpFriction_Pa, 1)}</td>
      <td style={td}>{fmt(r.dpMinor_Pa, 1)}</td>
      <td style={td}>{fmt(r.dpSegment_Pa, 1)}</td>
      <td style={td}>{fmt(r.cum_Pa, 1)}</td>
      <td style={td}>{fmt(r.cum_mmAq, 1)}</td>
      <td style={{ ...td, fontWeight: r.isLeaf ? 600 : 400 }}>
        {fmt(r.cumPlusReq_Pa, 1)}{r.compressWarn ? ' ⚠' : ''}
      </td>
    </tr>
  );
}

function buildWarnings(net: FNNetworkResult, pAvailEntered: boolean): WarningItem[] {
  const items: WarningItem[] = [];
  for (const r of net.rows) {
    if (r.error) items.push({ level: 'error', title: `구간 ${r.id || '(ID 없음)'}`, msg: `${r.error} — 이 행은 계산에서 제외되었습니다.` });
  }
  if (pAvailEntered && net.margin_Pa < 0) {
    items.push({
      level: 'error', title: '정압 부족',
      msg: `최대 누적손실+요구압(${Math.round(net.worstDemand_Pa)} Pa)이 설계 가용정압(${Math.round(net.designAvail_Pa)} Pa)을 초과합니다. 관경 확대·경로 단축 또는 팬/펌프 정압 상향이 필요합니다.`,
    });
  }
  for (const r of net.rows) {
    if (r.error) continue;
    if (r.verdict === 'high') {
      items.push({
        level: 'warn', title: `구간 ${r.id} ▲유속초과`,
        msg: `V=${r.V_ms.toFixed(2)} m/s가 적용 최대를 초과 — 제안 관경 ${r.suggestedD_mm.toFixed(1)} mm 이상으로 확대 검토.`,
      });
    } else if (r.verdict === 'low') {
      items.push({
        level: 'warn', title: `구간 ${r.id} ▼과대관경`,
        msg: `V=${r.V_ms.toFixed(3)} m/s가 적용 최소 미만 — 관경 축소(비용·침전 측면) 검토.`,
      });
    }
    if (r.compressWarn) {
      items.push({
        level: 'warn', title: `구간 ${r.id} ⚠구간분할 필요`,
        msg: `누적 ΔP(${Math.round(r.cum_Pa)} Pa)가 절대압의 10%를 초과 — 비압축성 가정 한계. 구간을 분할해 압력별로 재계산하세요.`,
      });
    }
    if (r.regime === 'transition') {
      items.push({
        level: 'info', title: `구간 ${r.id} ⚠천이역`,
        msg: `Re=${Math.round(r.Re)} (2,300~4,000) — 천이역은 f 불확실성이 큼. 이 계산기는 엑셀 방식대로 Swamee-Jain을 적용합니다.`,
      });
    }
  }
  if (net.tempClamped) {
    items.push({ level: 'info', title: '온도 clamp', msg: '입력 온도가 유체 참조표 범위를 벗어나 경계값 물성으로 계산했습니다.' });
  }
  return items;
}
