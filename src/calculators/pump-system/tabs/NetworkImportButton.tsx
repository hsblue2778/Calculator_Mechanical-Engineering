// 계통 설계 불러오기 — friction-network 저장 기록에서 설계유량·요구압을 가져오는 pull UI
// 시스템 간 push 체이닝 대신 산출물(저장 기록) 인계 방식. Σ말단유량 → 설계유량 Q ·
// 최대(누적손실+요구압) → 잔류 토출압. 배관 계통(pipe) 기록만 대상 (덕트는 펌프 무관).

import { useState } from 'react';
import { FolderInput } from 'lucide-react';
import { list, formatRelativeTime, type HistoryEntry } from '../../../state/historyStore';
import { C } from '../styles';
import type { FlowUnitPumpKey, PressureUnitPumpKey } from '../units';

export interface NetworkImportValues {
  Q: string;
  flowUnit: FlowUnitPumpKey;
  PresStr: string;
  presUnit: PressureUnitPumpKey;
  fluid?: 'water';                 // 펌프는 물 계열 전용 — 물일 때만 전달
  tempC?: string;
  title: string;                   // 수신 배너 표시용
}

// 불러올 수 있는 기록 — 배관 계통 + 유효한 계산 결과 보유
function usable(e: HistoryEntry): boolean {
  const o = e.outputs;
  return e.inputs?.settings?.systemType === 'pipe'
    && o != null
    && Number.isFinite(o.totalLeafFlow_m3s) && o.totalLeafFlow_m3s > 0
    && Number.isFinite(o.worstDemand_Pa);
}

function toValues(e: HistoryEntry): NetworkImportValues {
  const st = e.inputs.settings;
  const o = e.outputs!;
  const isLpm = st.flowUnit === 'LPM';
  const v: NetworkImportValues = {
    Q: fmtFlow(o.totalLeafFlow_m3s * (isLpm ? 60000 : 3600)),
    flowUnit: isLpm ? 'lpm' : 'm3h',
    PresStr: (o.worstDemand_Pa / 1000).toFixed(2),
    presUnit: 'kPa',
    title: e.title,
  };
  if (st.fluid === 'water') {
    v.fluid = 'water';
    v.tempC = st.tempC;
  }
  return v;
}

export default function NetworkImportButton({ onImport }: { onImport: (v: NetworkImportValues) => void }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  function toggle() {
    if (!open) setEntries(list('friction-network').filter(usable));
    setOpen(o => !o);
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={toggle}
        title="계통 압력손실 설계 시스템의 저장 기록에서 설계유량·요구압을 가져옵니다"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', fontSize: 13, fontWeight: 500,
          color: C.textDark, backgroundColor: C.surface,
          border: `1px solid ${C.borderInput}`, borderRadius: 8,
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <FolderInput size={14} /> 계통 설계 불러오기
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div className="pump-import-panel" style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 41,
            minWidth: 320, padding: 6,
            backgroundColor: 'var(--bg-surface)', border: `1px solid ${C.border}`,
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
          }}>
            {entries.length === 0 ? (
              <p style={{ padding: 12, fontSize: 12, lineHeight: 1.6, color: C.text }}>
                저장된 배관 계통 설계가 없습니다. '계통 압력손실 설계 시스템'에서 기록을 저장하면 여기서 불러올 수 있습니다.
              </p>
            ) : entries.map(e => {
              const v = toValues(e);
              return (
                <button
                  key={e.id}
                  onClick={() => { setOpen(false); onImport(v); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '9px 12px', borderRadius: 7,
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                  onMouseEnter={ev => { ev.currentTarget.style.background = 'var(--bg-surface-2)'; }}
                  onMouseLeave={ev => { ev.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13, fontWeight: 600, color: C.textDark }}>
                    {e.title}
                    <span style={{ fontSize: 11, fontWeight: 400, color: C.text, flexShrink: 0 }}>{formatRelativeTime(e.timestamp)}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: 11.5, color: C.text, marginTop: 2 }}>
                    Q ≈ {v.Q} {v.flowUnit === 'lpm' ? 'LPM' : 'm³/h'} · 요구압 {v.PresStr} kPa
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function fmtFlow(n: number): string {
  if (!Number.isFinite(n)) return '';
  if (n >= 100) return n.toFixed(1);
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(3);
}
