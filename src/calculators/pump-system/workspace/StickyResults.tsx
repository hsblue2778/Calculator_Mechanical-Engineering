// 펌프 시스템 워크스페이스 우측 sticky 결과 패널
// 도넛(설계 양정) + KPI 6개 + TDH 분해 + NPSH 마진 배지

import type { PumpHvacResult } from '../calc';
import type { PowerUnitKey } from '../units';
import { POWER_UNITS } from '../units';

interface Props {
  result: PumpHvacResult | null;
  headMarginPct: number;
  npshMargin: number;
  powerUnit: PowerUnitKey;
}

export default function StickyResults({ result, headMarginPct, npshMargin, powerUnit }: Props) {
  if (!result) {
    return (
      <aside
        className="pump-sticky-results"
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
        <p style={{ padding: '8px 4px', color: 'var(--text-quaternary)', fontSize: 12, lineHeight: 1.6 }}>
          입력을 시작하면 결과가 표시됩니다
        </p>
      </aside>
    );
  }

  const powerFactor = POWER_UNITS.find(u => u.key === powerUnit)?.fromW ?? (1 / 1000);
  const designHead = result.designHead_m;
  const TDH = result.TDH_m;
  const NPSHa = result.NPSHa_m;
  const npshOK = NPSHa - npshMargin >= 0;
  const npshDelta = NPSHa - npshMargin;
  const designP = result.designPower_W * powerFactor;
  const theoP = result.theoPower_W * powerFactor;
  const totalLoss = result.sucPipeLoss_total_m + result.disPipeLoss_total_m + result.totalFittingLoss_m + result.equipLoss_m;

  return (
    <aside
      className="pump-sticky-results"
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

      {/* 도넛 */}
      <ResultDonut
        designHead={designHead}
        tdh={TDH}
        npshOK={npshOK}
        npshDelta={npshDelta}
      />

      {/* KPI 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Kpi label="흡입 손실" value={result.sucPipeLoss_total_m.toFixed(2)} unit="m" />
        <Kpi label="토출 손실" value={result.disPipeLoss_total_m.toFixed(2)} unit="m" />
        <Kpi label="부속 손실" value={result.totalFittingLoss_m.toFixed(2)} unit="m" />
        <Kpi label="장비 손실" value={result.equipLoss_m.toFixed(2)} unit="m" />
        <Kpi label="이론 동력" value={fmt(theoP)} unit={powerUnit} />
        <Kpi label="설계 동력" value={fmt(designP)} unit={powerUnit} accent />
      </div>

      {/* TDH 분해 */}
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
          TDH 분해
        </div>
        <BreakdownRow label="정수두 Δz" value={result.staticHead_m.toFixed(2)} />
        <BreakdownRow label="배관 마찰" value={(result.sucPipeLoss_total_m + result.disPipeLoss_total_m).toFixed(2)} />
        <BreakdownRow label="부속 손실" value={result.totalFittingLoss_m.toFixed(2)} />
        <BreakdownRow label="장비 손실" value={result.equipLoss_m.toFixed(2)} />
        <BreakdownRow label="잔류 토출압" value={result.Hres_m.toFixed(2)} />
        <Divider />
        <BreakdownRow label="TDH (계산)" value={TDH.toFixed(2)} bold />
        <BreakdownRow
          label={`여유 ${headMarginPct.toFixed(0)}% → 설계 양정`}
          value={designHead.toFixed(2)}
          bold accent
        />
        <div style={{ fontSize: 10, color: 'var(--text-quaternary)', marginTop: 6 }}>
          총 손실: {totalLoss.toFixed(2)} m
        </div>
      </div>
    </aside>
  );
}

function ResultDonut({
  designHead, tdh, npshOK, npshDelta,
}: {
  designHead: number; tdh: number;
  npshOK: boolean; npshDelta: number;
}) {
  const ringColor = npshOK ? 'var(--accent-primary)' : 'var(--state-error)';
  return (
    <div
      style={{
        background: 'var(--bg-surface-2)',
        borderRadius: 14, padding: 16,
        border: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 8,
      }}
    >
      <svg width="160" height="160" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r="72" fill="none" stroke="var(--bg-surface-3)" strokeWidth="14"/>
        <circle
          cx="90" cy="90" r="72" fill="none"
          stroke={ringColor} strokeWidth="14"
          strokeDasharray="452" strokeDashoffset={452 * 0.18}
          transform="rotate(-90 90 90)" strokeLinecap="round"
        />
        <text x="90" y="84" textAnchor="middle" fontSize="13" fill="var(--text-tertiary)" fontWeight="500">설계 양정</text>
        <text x="90" y="116" textAnchor="middle" fontSize="32" fill="var(--text-primary)" fontWeight="700">
          {Number.isFinite(designHead) ? designHead.toFixed(2) : '—'}
        </text>
        <text x="90" y="138" textAnchor="middle" fontSize="12" fill="var(--text-tertiary)">m</text>
      </svg>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', gap: 12 }}>
        <span>TDH {tdh.toFixed(2)} m</span>
      </div>
      <div
        style={{
          padding: '4px 10px', borderRadius: 999,
          fontSize: 11, fontWeight: 600,
          background: npshOK ? 'var(--state-success-bg)' : 'var(--state-error-bg)',
          color: npshOK ? 'var(--state-success-text)' : 'var(--state-error-text)',
        }}
      >
        NPSH 마진 {npshDelta.toFixed(2)} m {npshOK ? '✓ 양호' : '⚠ 부족'}
      </div>
    </div>
  );
}

function Kpi({
  label, value, unit, accent,
}: {
  label: string; value: string; unit?: string; accent?: boolean;
}) {
  return (
    <div
      style={{
        background: accent ? 'var(--accent-primary-bg-soft)' : 'var(--bg-surface-2)',
        border: `1px solid ${accent ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
        borderRadius: 8, padding: 10,
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
          marginTop: 2, fontSize: 16, fontWeight: 700,
          color: accent ? 'var(--accent-primary)' : 'var(--text-primary)',
          display: 'flex', alignItems: 'baseline', gap: 4,
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function BreakdownRow({
  label, value, bold, accent,
}: {
  label: string; value: string; bold?: boolean; accent?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 11.5 }}>
      <span style={{ color: bold ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: bold ? 600 : 400 }}>
        {label}
      </span>
      <span
        style={{
          color: accent ? 'var(--accent-primary)' : (bold ? 'var(--text-primary)' : 'var(--text-secondary)'),
          fontWeight: bold ? 700 : 500,
        }}
      >
        {value} m
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border-subtle)', margin: '5px 0' }} />;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 100) return n.toFixed(1);
  return n.toFixed(2);
}
