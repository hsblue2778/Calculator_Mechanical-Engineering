// 관마찰손실 — 메인 열 결과 블록
// 다단위 동시 표시(엑셀 PHASE 4 우측 패널 개념) + Hazen-Williams 비교 + 권장 범위 게이지(물 전용) + 경고

import RangeGauge from '../../../components/RangeGauge';
import WarningList from '../../../components/WarningList';
import { RANGES, rangeStatus, toRangeSpec } from '../analysis';
import { pfWarnings } from '../interpret.ts';
import { PF_G, type PipeFrictionResult } from '../engine.ts';
import type { PipeFrictionController } from '../usePipeFrictionState.ts';
import { C } from '../styles';

export default function ResultBlocks({ pf }: { pf: PipeFrictionController }) {
  const { res, st } = pf;
  if (!res) return null;
  const isWater = st.fluid === 'water';

  return (
    <>
      <MultiUnitCard res={res} />
      <HWCard res={res} isWater={isWater} />
      {isWater ? <RangeCard res={res} /> : null}
      <WarningList items={pfWarnings(res, isWater)} />
    </>
  );
}

// ── 다단위 동시 표시 ──────────────────────────────────────────────
const MULTI_UNITS = [
  { label: 'mmAq',   factor: 1 / 9.80665,  dp: 1, dpM: 2 },
  { label: 'kPa',    factor: 1 / 1000,     dp: 2, dpM: 3 },
  { label: 'kg/cm²', factor: 1 / 98066.5,  dp: 4, dpM: 5 },
  { label: 'bar',    factor: 1 / 100000,   dp: 4, dpM: 5 },
  { label: 'Pa',     factor: 1,            dp: 0, dpM: 1 },
] as const;

function MultiUnitCard({ res }: { res: PipeFrictionResult }) {
  return (
    <div style={{
      backgroundColor: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: '16px 20px',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.heading, marginBottom: 10 }}>
        결과 다단위 표시 <span style={{ fontSize: 11, fontWeight: 400, color: C.text }}>— ΔP = ρ유체 × g × hL 환산</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.text }}>
            <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 500 }}>구분</th>
            {MULTI_UNITS.map(u => (
              <th key={u.label} style={{ textAlign: 'right', padding: '6px 0', fontWeight: 500 }}>{u.label}</th>
            ))}
          </tr>
        </thead>
        <tbody style={{ fontFamily: 'ui-monospace, monospace' }}>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <td style={{ padding: '8px 0', fontFamily: 'inherit', color: C.textDark }}>총 마찰손실 ΔP</td>
            {MULTI_UNITS.map(u => (
              <td key={u.label} style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600, color: C.heading }}>
                {(res.deltaP_Pa * u.factor).toFixed(u.dp)}
              </td>
            ))}
          </tr>
          <tr>
            <td style={{ padding: '8px 0', fontFamily: 'inherit', color: C.textDark }}>단위 마찰손실 (/m)</td>
            {MULTI_UNITS.map(u => (
              <td key={u.label} style={{ textAlign: 'right', padding: '8px 0', color: C.textDark }}>
                {(res.deltaP_per_m_Pa * u.factor).toFixed(u.dpM)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 8 }}>
        수두 hL = {res.hL_m.toFixed(4)} m (유체 기둥 기준) · mmAq는 ΔP를 표준 물기둥(9.80665 Pa/mm)으로 환산한 값
      </div>
    </div>
  );
}

// ── Hazen-Williams 비교 ──────────────────────────────────────────
function HWCard({ res, isWater }: { res: PipeFrictionResult; isWater: boolean }) {
  if (!isWater || !res.hw) {
    return (
      <div style={{
        backgroundColor: C.surfaceAlt, border: `1px dashed ${C.border}`,
        borderRadius: 8, padding: '12px 16px', fontSize: 12, color: C.text,
      }}>
        Hazen-Williams 비교는 표시하지 않습니다 — 상온 물 전용 경험식으로, 다른 유체에 적용 시 큰 오차(최대 50%)가 발생합니다.
      </div>
    );
  }
  const diffPct = 100 * (res.hw.hL_m - res.hL_m) / res.hL_m;
  return (
    <div style={{
      backgroundColor: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: '16px 20px',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.heading, marginBottom: 4 }}>
        공식 비교 — Darcy-Weisbach vs Hazen-Williams
      </div>
      <div style={{ fontSize: 11, color: C.text, marginBottom: 10 }}>
        hL = 10.67·L·Q¹·⁸⁵² / (C¹·⁸⁵²·D⁴·⁸⁷¹) · C = {res.hw.C} · 물 전용 경험식 (상온·난류 조건)
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.text }}>
            <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 500 }}>공식</th>
            <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 500 }}>수두 hL (m)</th>
            <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 500 }}>ΔP (kPa)</th>
            <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 500 }}>단위손실 (mmAq/m)</th>
          </tr>
        </thead>
        <tbody style={{ fontFamily: 'ui-monospace, monospace' }}>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            <td style={{ padding: '8px 0', fontFamily: 'inherit', color: C.textDark }}>Darcy-Weisbach (기준)</td>
            <td style={{ textAlign: 'right', fontWeight: 600, color: C.heading }}>{res.hL_m.toFixed(4)}</td>
            <td style={{ textAlign: 'right', fontWeight: 600, color: C.heading }}>{(res.deltaP_Pa / 1000).toFixed(3)}</td>
            <td style={{ textAlign: 'right', fontWeight: 600, color: C.heading }}>{(res.deltaP_per_m_Pa / 9.80665).toFixed(2)}</td>
          </tr>
          <tr>
            <td style={{ padding: '8px 0', fontFamily: 'inherit', color: C.textDark }}>Hazen-Williams (C={res.hw.C})</td>
            <td style={{ textAlign: 'right', color: C.textDark }}>{res.hw.hL_m.toFixed(4)}</td>
            <td style={{ textAlign: 'right', color: C.textDark }}>{(res.hw.deltaP_Pa / 1000).toFixed(3)}</td>
            <td style={{ textAlign: 'right', color: C.textDark }}>{(res.rho_kgm3 * PF_G * res.hw.hL_per_m / 9.80665).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 8 }}>
        D-W 대비 {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}% — 두 경험·이론식의 차이는 통상 ±10% 내외입니다.
      </div>
    </div>
  );
}

// ── 권장 범위 게이지 (물 전용 — 한국 실무 관행 기준) ─────────────
function RangeCard({ res }: { res: PipeFrictionResult }) {
  const rangeV = rangeStatus(res.V_ms, RANGES.velocity);
  const rangeU = rangeStatus(res.deltaP_per_m_Pa, RANGES.unitLossPa);
  return (
    <div style={{
      backgroundColor: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: '18px 20px',
    }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.heading }}>권장 범위 대비 현재값</div>
        <div style={{ fontSize: 11, color: C.text, marginTop: 2 }}>
          한국 실무 관행 기준 (물 배관) · 회색 마커 = 현재값
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
        <RangeGauge
          label="유속 (V)" value={res.V_ms}
          range={toRangeSpec(RANGES.velocity)}
          format={v => v.toString()}
          status={{ label: rangeV.label, color: rangeV.color }}
        />
        <RangeGauge
          label="단위 마찰손실" value={res.deltaP_per_m_Pa}
          range={toRangeSpec(RANGES.unitLossPa)}
          format={v => v.toFixed(0)}
          status={{ label: rangeU.label, color: rangeU.color }}
        />
      </div>

      <Legend />
    </div>
  );
}

function Legend() {
  const items = [
    { color: 'var(--state-success-bg)', label: '최적' },
    { color: 'var(--accent-primary-bg)', label: '허용' },
    { color: 'var(--state-error-bg)', label: '권장 외' },
  ];
  return (
    <div style={{
      display: 'flex', gap: 20, marginTop: 16, paddingTop: 12,
      borderTop: `1px dashed ${C.border}`,
    }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.text }}>
          <span style={{
            width: 14, height: 10, backgroundColor: it.color, borderRadius: 2,
          }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
