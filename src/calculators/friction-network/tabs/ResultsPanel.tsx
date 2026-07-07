// 마찰손실 계통 계산기 — 판정 요약(KPI) + 구간 결과(read-only) + 맥락 경고
// 판정: 최대(누적손실+요구압) vs 설계 가용정압 P_avail×(1−α) — 결론 먼저, 상세 표는 아래 → 여유/부족

import Kpi from '../../../components/Kpi';
import WarningList from '../../../components/WarningList';
import { FN_PA_PER_MMAQ } from '../../../data/frictionNetworkRef.ts';
import {
  VERDICT_LABELS, REGIME_LABELS,
  type FNNetworkResult, type FNFlowUnit, type FNSegmentResult,
} from '../calc';
import type { FNSuggestion } from '../design';
import { buildFnWarnings } from '../warnings';
import { C } from '../styles';
import { SectionLabel } from './SettingsPanel';

interface Props {
  net: FNNetworkResult | null;
  flowUnit: FNFlowUnit;
  pAvailEntered: boolean;
  suggestions: Record<string, FNSuggestion>;
  designTotalFlow_m3s: number | null;
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

export default function ResultsPanel({ net, flowUnit, pAvailEntered, suggestions, designTotalFlow_m3s }: Props) {
  if (!net) {
    return (
      <p style={{ fontSize: 13, color: 'var(--text-quaternary)', margin: 0 }}>
        구간을 입력하면 결과가 표시됩니다. (치수·길이·말단유량 입력 필요)
      </p>
    );
  }

  const flowMul = flowUnit === 'LPM' ? 60000 : 3600;   // m³/s → 표시 단위
  const warnings = buildFnWarnings(net, pAvailEntered, suggestions, designTotalFlow_m3s, flowUnit);
  const short = pAvailEntered && net.margin_Pa < 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionLabel>판정 요약</SectionLabel>
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

      <SectionLabel>구간 결과</SectionLabel>

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
              <th style={th}>제안De (mm)</th>
              <th style={{ ...th, textAlign: 'left' }}>제안 규격</th>
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
            {net.rows.map((r, i) => (
              <ResultRow key={i} r={r} flowMul={flowMul} worst={r.id === net.worstId && !r.error} sug={suggestions[r.id]} />
            ))}
          </tbody>
        </table>
      </div>

      <WarningList items={warnings} />
    </div>
  );
}

function ResultRow({ r, flowMul, worst, sug }: {
  r: FNSegmentResult; flowMul: number; worst: boolean; sug?: FNSuggestion;
}) {
  const idCell: React.CSSProperties = {
    ...td, textAlign: 'left', fontWeight: 600, position: 'sticky', left: 0, zIndex: 1,
    backgroundColor: worst ? 'var(--accent-primary-bg-soft)' : C.surface,
    color: 'var(--text-primary)',
  };
  if (r.error) {
    return (
      <tr>
        <td style={idCell}>{r.id || '—'}</td>
        <td colSpan={16} style={{ ...td, textAlign: 'left', color: C.err, fontFamily: 'inherit' }}>{r.error}</td>
      </tr>
    );
  }
  const verdictColor = r.verdict === 'ok' ? C.ok : C.warn;
  // 제안De 툴팁 — 이원 기준 내역 (유속 / 마찰률 R)
  const sugTitle = sug
    ? `유속 기준 ${sug.dVel_mm.toFixed(1)} mm${sug.dR_mm !== null ? ` · 마찰률 R 기준 ${sug.dR_mm.toFixed(1)} mm` : ' (R 미적용)'} — 큰 쪽 채택`
    : undefined;
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
      <td style={td} title={sugTitle}>{sug ? fmt(sug.suggest_mm, 1) : '—'}</td>
      <td style={{ ...td, textAlign: 'left' }} title={sugTitle}>{sug?.snapLabel ?? '—'}</td>
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

