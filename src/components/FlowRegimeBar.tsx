// Reynolds 기반 유동 영역(층류/천이/난류) 가로 바 (log10 축)
// 10² ~ 10⁶ 범위. 경계 2,300 / 4,000 표시

export interface RegimeUI {
  label: string;
  color: string;
}

interface Props {
  Re: number;
  regime: RegimeUI;
}

const LOG_MIN = 2;  // 10^2
const LOG_MAX = 6;  // 10^6

function logPct(re: number): number {
  if (!Number.isFinite(re) || re <= 0) return 0;
  const lr = Math.log10(re);
  return Math.max(0, Math.min(100, ((lr - LOG_MIN) / (LOG_MAX - LOG_MIN)) * 100));
}

export default function FlowRegimeBar({ Re, regime }: Props) {
  const pctLam = logPct(2300);
  const pctTrans = logPct(4000);
  const hasValue = Number.isFinite(Re) && Re > 0;
  const markerPct = hasValue ? logPct(Re) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>유동 영역 (Reynolds)</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: regime.color }}>{regime.label}</span>
      </div>

      <div style={{
        position: 'relative', height: 10, borderRadius: 4,
        backgroundColor: 'var(--accent-primary-bg)', overflow: 'visible',
      }}>
        <div style={{
          position: 'absolute', left: 0, width: `${pctLam}%`,
          top: 0, bottom: 0, backgroundColor: 'var(--state-success-bg)',
        }} />
        <div style={{
          position: 'absolute', left: `${pctLam}%`, width: `${pctTrans - pctLam}%`,
          top: 0, bottom: 0, backgroundColor: 'var(--state-warn-bg)',
        }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 4, boxShadow: '0 0 0 1px rgba(0,0,0,0.04) inset', pointerEvents: 'none' }} />
        {hasValue && (
          <div style={{
            position: 'absolute',
            left: `${markerPct}%`,
            top: -3, bottom: -3, width: 3,
            backgroundColor: 'var(--text-primary)',
            borderRadius: 1.5,
            transform: 'translateX(-50%)',
            boxShadow: '0 0 0 2px var(--bg-surface)',
          }} />
        )}
      </div>

      <div style={{ position: 'relative', height: 14, marginTop: 4 }}>
        <span style={{ position: 'absolute', left: 0, fontSize: 10, color: 'var(--text-quaternary)' }}>10²</span>
        <span style={{ position: 'absolute', left: `${pctLam}%`, transform: 'translateX(-50%)', fontSize: 10, color: 'var(--text-quaternary)' }}>2.3k</span>
        <span style={{ position: 'absolute', left: `${pctTrans}%`, transform: 'translateX(-50%)', fontSize: 10, color: 'var(--text-quaternary)' }}>4k</span>
        <span style={{ position: 'absolute', right: 0, fontSize: 10, color: 'var(--text-quaternary)' }}>10⁶</span>
      </div>
    </div>
  );
}
