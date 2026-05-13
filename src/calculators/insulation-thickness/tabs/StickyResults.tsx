// 보온재 선정 — 우측 sticky 실시간 결과 패널 (pipe-friction StickyResults 스타일 차용)

import { AlertTriangle } from 'lucide-react';
import type { InsulationOutputs, Grade } from '../calc';

interface Props {
  result: InsulationOutputs | null;
  Ta: number;
  RH: number;
}

export default function StickyResults({ result, Ta, RH }: Props) {
  if (!result) {
    return (
      <aside
        className="calc-sticky-results"
        style={{
          width: 280, flexShrink: 0,
          borderLeft: '1px solid var(--border-subtle)',
          paddingLeft: 14, marginLeft: 12,
          position: 'sticky', top: 0, alignSelf: 'flex-start',
          maxHeight: 'calc(90vh - 120px)', overflowY: 'auto',
        }}
      >
        <div
          style={{
            fontSize: 11, fontWeight: 600,
            color: 'var(--text-tertiary)',
            letterSpacing: 0.5, textTransform: 'uppercase',
            padding: '0 4px 12px',
          }}
        >
          실시간 결과
        </div>
        <div
          style={{
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 10,
            padding: 24, textAlign: 'center',
            color: 'var(--text-quaternary)', fontSize: 12,
          }}
        >
          입력을 시작하면<br/>결과가 표시됩니다
        </div>
      </aside>
    );
  }

  const {
    Td, d_mm, d_safe_mm, d_recommended_mm, Ts, margin, grade, warnings,
  } = result;

  return (
    <aside
      className="calc-sticky-results"
      style={{
        width: 280, flexShrink: 0,
        borderLeft: '1px solid var(--border-subtle)',
        paddingLeft: 14, marginLeft: 12,
        position: 'sticky', top: 0, alignSelf: 'flex-start',
        maxHeight: 'calc(90vh - 120px)', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div
        style={{
          fontSize: 11, fontWeight: 600,
          color: 'var(--text-tertiary)',
          letterSpacing: 0.5, textTransform: 'uppercase',
          padding: '0 4px',
        }}
      >
        실시간 결과
      </div>

      {/* 히어로 — 최종 보온재 두께 (시판) */}
      <ResultHero d_rec={d_recommended_mm} grade={grade} />

      {/* KPI 그리드 — 외기/노점/한계/시공 후 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Kpi
          label="외기"
          value={Number.isFinite(Ta) ? `${Ta.toFixed(0)}°C` : '—'}
          subLabel={Number.isFinite(RH) ? `RH ${RH.toFixed(0)}%` : undefined}
        />
        <Kpi
          label="노점 Td"
          value={Number.isFinite(Td) ? `${Td.toFixed(1)}°C` : '—'}
          accent="var(--state-error-text)"
        />
        <Kpi
          label="한계 두께 d"
          value={Number.isFinite(d_mm) ? `${d_mm.toFixed(1)} mm` : '∞'}
        />
        <Kpi
          label="시공 후 Ts"
          value={Ts != null ? `${Ts.toFixed(1)}°C` : '—'}
          subLabel={margin != null ? `여유 ${margin >= 0 ? '+' : ''}${margin.toFixed(1)}°C` : undefined}
          accent={Ts != null ? 'var(--state-success-text)' : undefined}
        />
      </div>

      {/* 계산 결과 상세 */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 10, padding: 12,
        }}
      >
        <div
          style={{
            fontSize: 10, fontWeight: 600,
            color: 'var(--text-tertiary)',
            letterSpacing: 0.4, textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          계산 결과 상세
        </div>
        <DetailRow label="노점 Td" value={Number.isFinite(Td) ? `${Td.toFixed(2)} °C` : '—'} />
        <DetailRow label="한계 두께 d" value={Number.isFinite(d_mm) ? `${d_mm.toFixed(2)} mm` : '∞'} />
        <DetailRow label="안전 두께 (×SF)" value={Number.isFinite(d_safe_mm) ? `${d_safe_mm.toFixed(2)} mm` : '∞'} muted />
        <DetailRow
          label="시판 두께"
          value={d_recommended_mm != null ? `${d_recommended_mm} mm` : '50 mm 초과'}
        />
        <DetailRow label="시공 후 Ts" value={Ts != null ? `${Ts.toFixed(2)} °C` : '—'} muted />
        <DetailRow
          label="여유 Δ"
          value={margin != null ? `${margin >= 0 ? '+' : ''}${margin.toFixed(2)} °C` : '—'}
          muted
        />
      </div>

      {warnings.length > 0 && (
        <div style={{
          backgroundColor: 'var(--state-warn-bg)',
          border: '1px solid var(--state-warn-text)',
          borderLeft: '3px solid var(--state-warn)',
          borderRadius: 6, padding: '8px 10px',
        }}>
          {warnings.map((w, i) => (
            <div key={i} style={{
              fontSize: 11, color: 'var(--state-warn-text)', lineHeight: 1.5,
              display: 'flex', gap: 6, alignItems: 'flex-start',
              marginTop: i === 0 ? 0 : 4,
            }}>
              <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

function ResultHero({
  d_rec, grade,
}: {
  d_rec: number | null; grade: Grade;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-surface-2)',
        borderRadius: 14, padding: 16,
        border: `1px solid ${gradeColor(grade)}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 6,
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
        최종 보온재 두께 (시판)
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          fontSize: 36, fontWeight: 700, color: 'var(--text-primary)',
          letterSpacing: '-0.01em', lineHeight: 1,
        }}>
          {d_rec != null ? d_rec : '50+'}
        </span>
        <span style={{ fontSize: 14, color: 'var(--text-tertiary)', fontWeight: 500 }}>
          mm
        </span>
      </div>
      <div
        style={{
          padding: '3px 10px', borderRadius: 999,
          fontSize: 11, fontWeight: 600,
          background: gradeBg(grade),
          color: gradeColor(grade),
        }}
      >
        {grade}
      </div>
    </div>
  );
}

function Kpi({
  label, value, accent, subLabel,
}: {
  label: string; value: string; accent?: string; subLabel?: string;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-surface-2)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 8, padding: 10,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}
    >
      <div
        style={{
          fontSize: 10, fontWeight: 600,
          color: 'var(--text-tertiary)',
          letterSpacing: 0.3, textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15, fontWeight: 700,
          color: accent ?? 'var(--text-primary)',
        }}
      >
        {value}
      </div>
      {subLabel && (
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
          {subLabel}
        </span>
      )}
    </div>
  );
}

function DetailRow({
  label, value, muted,
}: {
  label: string; value: string; muted?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 11.5 }}>
      <span style={{ color: muted ? 'var(--text-quaternary)' : 'var(--text-secondary)' }}>
        {label}
      </span>
      <span
        style={{
          color: muted ? 'var(--text-tertiary)' : 'var(--text-primary)',
          fontWeight: muted ? 500 : 600,
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function gradeColor(g: Grade): string {
  if (g === '안전') return 'var(--state-success-text)';
  if (g === '주의') return 'var(--state-warn-text)';
  return 'var(--state-error-text)';
}
function gradeBg(g: Grade): string {
  if (g === '안전') return 'var(--state-success-bg)';
  if (g === '주의') return 'var(--state-warn-bg)';
  return 'var(--state-error-bg)';
}
