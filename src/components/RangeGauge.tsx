// 권장 범위 대비 현재값 가로 게이지 바
// 최적구간(초록) · 허용구간(옅은 파랑) · 권장 외(옅은 빨강) + 현재값 마커

export interface RangeSpec {
  optMin: number;    optMax: number;
  allowMin: number;  allowMax: number;
  absMin: number;    absMax: number;
}

export interface RangeStatusUI {
  label: string;
  color: string;
}

interface Props {
  label: string;
  value: number;
  range: RangeSpec;
  format: (n: number) => string;
  status: RangeStatusUI;
}

export default function RangeGauge({ label, value, range, format, status }: Props) {
  const span = range.absMax - range.absMin;
  const pct = (v: number) => ((v - range.absMin) / span) * 100;

  const hasValue = Number.isFinite(value);
  const markerPct = hasValue ? Math.max(0, Math.min(100, pct(value))) : 0;

  const ticks = [range.allowMin, range.optMin, range.optMax, range.allowMax];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: status.color }}>
          {status.label}
        </span>
      </div>

      <div style={{
        position: 'relative', height: 10, borderRadius: 4,
        backgroundColor: 'var(--state-error-bg)', overflow: 'visible',
      }}>
        <div style={{
          position: 'absolute',
          left: `${pct(range.allowMin)}%`,
          width: `${pct(range.allowMax) - pct(range.allowMin)}%`,
          top: 0, bottom: 0,
          backgroundColor: 'var(--accent-primary-bg)',
        }} />
        <div style={{
          position: 'absolute',
          left: `${pct(range.optMin)}%`,
          width: `${pct(range.optMax) - pct(range.optMin)}%`,
          top: 0, bottom: 0,
          backgroundColor: 'var(--state-success-bg)',
        }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 4, boxShadow: '0 0 0 1px rgba(0,0,0,0.04) inset', pointerEvents: 'none' }} />
        {hasValue && (
          <div style={{
            position: 'absolute',
            left: `${markerPct}%`,
            top: -3, bottom: -3,
            width: 3,
            backgroundColor: 'var(--text-primary)',
            borderRadius: 1.5,
            transform: 'translateX(-50%)',
            boxShadow: '0 0 0 2px var(--bg-surface)',
          }} />
        )}
      </div>

      <div style={{ position: 'relative', height: 14, marginTop: 4 }}>
        {ticks.map((t, i) => (
          <span key={i} style={{
            position: 'absolute',
            left: `${pct(t)}%`,
            transform: 'translateX(-50%)',
            fontSize: 10,
            color: 'var(--text-quaternary)',
            whiteSpace: 'nowrap',
          }}>
            {format(t)}
          </span>
        ))}
      </div>
    </div>
  );
}
