// HVAC 펌프 시스템 — 결과 섹션 서브컴포넌트 (다중 배관 표 포함)

import { getPowerUnits, type PowerUnitKey } from '../units';
import { useUnitSystem } from '../../../state/unitSystemStore';
import { computePumpHvac, type CVAuthorityVerdict, type PumpCurveAtHz } from '../calc';
import { C, sectionStyle, sectionTitleStyle } from '../styles';
import OperatingPointChart from './OperatingPointChart';

// 권장 유속 범위 (m/s)
// 출처: SAREK 설비편람 / 건축기계설비공사 표준시방서 / ASHRAE Pumping Velocity Guidelines
const VELOCITY_RANGE_SUCTION = { min: 0.5, max: 1.5 };
const VELOCITY_RANGE_DISCHARGE = { min: 1.5, max: 3.0 };

type VelocityVerdict = 'too-slow' | 'ok' | 'too-fast';

function getVelocityVerdict(side: 'suction' | 'discharge', V_ms: number): VelocityVerdict {
  const range = side === 'suction' ? VELOCITY_RANGE_SUCTION : VELOCITY_RANGE_DISCHARGE;
  if (V_ms < range.min) return 'too-slow';
  if (V_ms > range.max) return 'too-fast';
  return 'ok';
}

function VelocityChip({ side, V_ms }: { side: 'suction' | 'discharge'; V_ms: number }) {
  if (!Number.isFinite(V_ms) || V_ms <= 0) return null;
  const range = side === 'suction' ? VELOCITY_RANGE_SUCTION : VELOCITY_RANGE_DISCHARGE;
  const verdict = getVelocityVerdict(side, V_ms);
  const config = {
    'ok':       { bg: '#dcfce7', fg: '#166534', label: '✓ 적정' },
    'too-slow': { bg: '#fef3c7', fg: '#92400e', label: '⚠ 너무 느림' },
    'too-fast': { bg: '#fee2e2', fg: '#991b1b', label: '⚠ 너무 빠름' },
  }[verdict];
  return (
    <span
      title={`권장: ${range.min}~${range.max} m/s`}
      style={{
        display: 'inline-block',
        marginLeft: 6,
        padding: '1px 6px',
        fontSize: 11,
        fontWeight: 500,
        backgroundColor: config.bg,
        color: config.fg,
        border: '1px solid currentColor',
        borderRadius: 10,
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  );
}

const thS: React.CSSProperties = {
  border: '1px solid var(--border-subtle)', padding: '6px 10px', fontWeight: 600,
  fontSize: 12, textAlign: 'left', color: 'var(--text-secondary)',
};
const tdS: React.CSSProperties = {
  border: '1px solid var(--border-subtle)', padding: '6px 10px', fontSize: 13,
};
const tdSubS: React.CSSProperties = {
  border: '1px solid var(--border-subtle)', padding: '4px 10px 4px 24px', fontSize: 12, color: 'var(--text-tertiary)',
};

interface Props {
  result: NonNullable<ReturnType<typeof computePumpHvac>>;
  powerUnit: PowerUnitKey;
  setPowerUnit: (v: PowerUnitKey) => void;
  powerFactor: number;
  npshMargin: number;
  pumpCurve: { Q_m3h: number; H_m: number }[];
  BEP_Q_m3h: number | null;
  operatingPoint: { Q_m3h: number; H_m: number } | null;
  pumpCurveFamily: PumpCurveAtHz[];
  catalogHz: number;
}

export default function ResultSection({
  result, powerUnit, setPowerUnit, powerFactor, npshMargin,
  pumpCurve: _pumpCurve, BEP_Q_m3h, operatingPoint,
  pumpCurveFamily, catalogHz,
}: Props) {
  const r = result;
  const isClosed = r.systemMode === 'closed';

  return (
    <div className="pump-section" style={{ ...sectionStyle, borderColor: 'var(--accent-primary-bg)', backgroundColor: 'var(--accent-primary-bg-soft)' }}>
      <p style={{ ...sectionTitleStyle, borderBottomColor: 'var(--accent-primary-bg)', color: C.blue }}>계산 결과</p>

      {/* 손실 항목 표 — 다중 배관 행 */}
      <div style={{ overflowX: 'auto', marginBottom: 14 }}>
      <table style={{ width: '100%', minWidth: 420, borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--accent-primary-bg)' }}>
            <th style={thS}>항목</th>
            <th style={{ ...thS, textAlign: 'right' }}>손실 수두 (m)</th>
          </tr>
        </thead>
        <tbody>
          {/* 흡입측 배관 합산 */}
          <tr style={{ backgroundColor: 'var(--bg-surface-2)' }}>
            <td style={{ ...tdS, fontWeight: 600 }}>
              흡입측 배관 합산 (SP-1{r.sucPipes.length > 1 ? `~SP-${r.sucPipes.length}` : ''})
            </td>
            <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>
              {r.sucPipeLoss_total_m.toFixed(4)}
            </td>
          </tr>
          {r.sucPipes.map(p => (
            <tr key={p.pipeLabel}>
              <td style={tdSubS}>
                ↳ {p.pipeLabel} ({p.materialNameKo} {p.nominalA}A, {p.L_m}m)
                <span style={{ marginLeft: 8, color: 'var(--text-quaternary)' }}>V={p.V_ms.toFixed(3)} m/s, Re={Math.round(p.Re).toLocaleString()}</span>
                <VelocityChip side="suction" V_ms={p.V_ms} />
              </td>
              <td style={{ ...tdSubS, textAlign: 'right' }}>{p.hf_m.toFixed(4)}</td>
            </tr>
          ))}

          {/* 토출측 배관 합산 */}
          <tr style={{ backgroundColor: 'var(--bg-surface-2)' }}>
            <td style={{ ...tdS, fontWeight: 600 }}>
              토출측 배관 합산 (DP-1{r.disPipes.length > 1 ? `~DP-${r.disPipes.length}` : ''})
            </td>
            <td style={{ ...tdS, textAlign: 'right', fontWeight: 600 }}>
              {r.disPipeLoss_total_m.toFixed(4)}
            </td>
          </tr>
          {r.disPipes.map(p => (
            <tr key={p.pipeLabel}>
              <td style={tdSubS}>
                ↳ {p.pipeLabel} ({p.materialNameKo} {p.nominalA}A, {p.L_m}m)
                <span style={{ marginLeft: 8, color: 'var(--text-quaternary)' }}>V={p.V_ms.toFixed(3)} m/s, Re={Math.round(p.Re).toLocaleString()}</span>
                <VelocityChip side="discharge" V_ms={p.V_ms} />
              </td>
              <td style={{ ...tdSubS, textAlign: 'right' }}>{p.hf_m.toFixed(4)}</td>
            </tr>
          ))}

          {/* 흡입측 부속류 */}
          <tr>
            <td style={tdS}>흡입측 부속류 손실</td>
            <td style={{ ...tdS, textAlign: 'right' }}>{r.sucFittingLoss_m.toFixed(4)}</td>
          </tr>
          {/* 토출측 부속류 */}
          <tr>
            <td style={tdS}>토출측 부속류 손실</td>
            <td style={{ ...tdS, textAlign: 'right' }}>{r.disFittingLoss_m.toFixed(4)}</td>
          </tr>
          {/* 장비류 */}
          {r.equipLoss_m > 0 && (
            <tr>
              <td style={tdS}>
                장비류 합산 손실
                {r.equipDetails.length > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-quaternary)' }}>
                    ({r.equipDetails.map(e => e.equipLabel).join(', ')})
                  </span>
                )}
              </td>
              <td style={{ ...tdS, textAlign: 'right' }}>{r.equipLoss_m.toFixed(4)}</td>
            </tr>
          )}
          {/* 정수두 차 */}
          <tr>
            <td style={tdS}>정수두 차 {isClosed ? '' : '(Hd - Hs)'}</td>
            <td style={{ ...tdS, textAlign: 'right' }}>
              {isClosed ? '0 (폐회로)' : r.staticHead_m.toFixed(3)}
            </td>
          </tr>
          {/* 잔류압력 수두 */}
          <tr>
            <td style={tdS}>잔류압력 수두 H_res</td>
            <td style={{ ...tdS, textAlign: 'right' }}>{r.Hres_m.toFixed(3)}</td>
          </tr>
        </tbody>
      </table>
      </div>

      {/* KPI 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
        <KpiCard label="총양정 TDH" value={r.TDH_m.toFixed(2)} unit="m" highlight />
        <KpiCard label="설계 양정" value={r.designHead_m.toFixed(2)} unit="m" />
        <NpshCard
          NPSHa_m={r.NPSHa_m}
          NPSHverdict={r.NPSHverdict}
          NPSHmargin_actual_m={r.NPSHmargin_actual_m}
          npshMargin={npshMargin}
        />
        <PowerCard
          theoPower_W={r.theoPower_W}
          designPower_W={r.designPower_W}
          recommendedMotorRating_kW={r.recommendedMotorRating_kW}
          powerUnit={powerUnit}
          setPowerUnit={setPowerUnit}
          powerFactor={powerFactor}
        />
      </div>

      {/* 양정 구성 분석 */}
      <HeadCompositionCard result={r} />

      {/* 운전점 차트 */}
      <div style={{ marginTop: 14, borderTop: `1px solid var(--border-subtle)`, paddingTop: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: C.textDark, margin: '0 0 4px 0' }}>운전점 차트</p>
        <OperatingPointChart
          systemCurve={r.systemCurve}
          pumpCurveFamily={pumpCurveFamily}
          catalogHz={catalogHz}
          BEP_Q_m3h={BEP_Q_m3h}
          operatingPoint={operatingPoint}
          Q_design_m3h={
            r.k_system > 0
              ? Math.sqrt((r.TDH_m - r.H_static_now_m) / r.k_system)
              : (r.systemCurve.length > 0
                  ? r.systemCurve[Math.floor(r.systemCurve.length * 2 / 3)].Q_m3h
                  : 0)
          }
          TDH_design_m={r.TDH_m}
        />
      </div>

      {/* 부속 손실 상세 */}
      {r.fittingDetails.length > 0 && (
        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, color: C.textDark, fontWeight: 600 }}>
            부속 손실 상세 ({r.fittingDetails.length}건)
          </summary>
          <div style={{ overflowX: 'auto', marginTop: 6 }}>
          <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-2)' }}>
                <th style={thS}>번호</th>
                <th style={thS}>배관참조</th>
                <th style={thS}>부속명</th>
                <th style={thS}>측</th>
                <th style={{ ...thS, textAlign: 'right' }}>K</th>
                <th style={{ ...thS, textAlign: 'right' }}>V (m/s)</th>
                <th style={{ ...thS, textAlign: 'right' }}>qty</th>
                <th style={{ ...thS, textAlign: 'right' }}>손실합계 (m)</th>
              </tr>
            </thead>
            <tbody>
              {r.fittingDetails.map((d) => (
                <tr key={d.fittingLabel}>
                  <td style={tdS}>{d.fittingLabel}</td>
                  <td style={tdS}>{d.pipeLabel}</td>
                  <td style={tdS}>{d.nameKo}</td>
                  <td style={tdS}>{d.side === 'suction' ? '흡입' : '토출'}</td>
                  <td style={{ ...tdS, textAlign: 'right' }}>{d.K.toFixed(2)}</td>
                  <td style={{ ...tdS, textAlign: 'right' }}>{d.V_ms.toFixed(3)}</td>
                  <td style={{ ...tdS, textAlign: 'right' }}>{d.qty}</td>
                  <td style={{ ...tdS, textAlign: 'right' }}>{d.h_total_m.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </details>
      )}

      {/* 장비류 상세 */}
      {r.equipDetails.length > 0 && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, color: C.textDark, fontWeight: 600 }}>
            장비류 손실 상세 ({r.equipDetails.length}건)
          </summary>
          <div style={{ overflowX: 'auto', marginTop: 6 }}>
          <table style={{ width: '100%', minWidth: 420, borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-2)' }}>
                <th style={thS}>번호</th>
                <th style={thS}>배관참조</th>
                <th style={thS}>장비명</th>
                <th style={{ ...thS, textAlign: 'right' }}>압력강하 (Pa)</th>
                <th style={{ ...thS, textAlign: 'right' }}>손실수두 (m)</th>
              </tr>
            </thead>
            <tbody>
              {r.equipDetails.map(e => (
                <tr key={e.equipLabel}>
                  <td style={tdS}>{e.equipLabel}</td>
                  <td style={tdS}>{e.pipeLabel}</td>
                  <td style={tdS}>{e.name}</td>
                  <td style={{ ...tdS, textAlign: 'right' }}>{e.dP_Pa.toFixed(0)}</td>
                  <td style={{ ...tdS, textAlign: 'right' }}>{e.h_m.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </details>
      )}
    </div>
  );
}

function KpiCard({
  label, value, unit, highlight = false, note,
}: {
  label: string; value: string; unit: string; highlight?: boolean; note?: string;
}) {
  return (
    <div style={{
      backgroundColor: C.surface, borderRadius: 8, padding: 12,
      border: `1px solid ${highlight ? C.blue : C.border}`,
    }}>
      <p style={{ fontSize: 11, color: C.text, margin: '0 0 4px 0' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: highlight ? C.blue : C.heading }}>{value}</span>
        <span style={{ fontSize: 13, color: C.textDark }}>{unit}</span>
      </div>
      {note && <p style={{ fontSize: 11, color: 'var(--text-quaternary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>{note}</p>}
    </div>
  );
}

function NpshCard({
  NPSHa_m, NPSHverdict, NPSHmargin_actual_m, npshMargin,
}: {
  NPSHa_m: number;
  NPSHverdict: 'pass' | 'low-margin' | 'risk' | 'na';
  NPSHmargin_actual_m: number | null;
  npshMargin: number;
}) {
  const verdictConfig = {
    pass:       { bg: '#dcfce7', color: '#166534', text: '여유 통과 ✓' },
    'low-margin': { bg: '#fef3c7', color: '#92400e', text: '여유 부족 ⚠️' },
    risk:       { bg: '#fee2e2', color: '#991b1b', text: '캐비테이션 위험 ✕' },
    na:         null,
  };
  const vc = verdictConfig[NPSHverdict];
  return (
    <div style={{ backgroundColor: C.surface, borderRadius: 8, padding: 12, border: `1px solid ${C.border}` }}>
      <p style={{ fontSize: 11, color: C.text, margin: '0 0 4px 0' }}>NPSHa</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: C.heading }}>{NPSHa_m.toFixed(2)}</span>
        <span style={{ fontSize: 13, color: C.textDark }}>m</span>
      </div>
      {vc ? (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{
            display: 'inline-block', padding: '2px 8px', borderRadius: 12,
            fontSize: 12, fontWeight: 600,
            backgroundColor: vc.bg, color: vc.color,
          }}>
            {vc.text}
          </span>
          {NPSHmargin_actual_m !== null && (
            <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>
              여유 = NPSHa - NPSHr = {NPSHmargin_actual_m.toFixed(2)} m
            </span>
          )}
        </div>
      ) : (
        <p style={{ fontSize: 11, color: 'var(--text-quaternary)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
          NPSHr 입력 시 판정 표시 (여유: +{npshMargin}m 권장)
        </p>
      )}
    </div>
  );
}

function PowerCard({
  theoPower_W, designPower_W, recommendedMotorRating_kW, powerUnit, setPowerUnit, powerFactor,
}: {
  theoPower_W: number; designPower_W: number;
  recommendedMotorRating_kW: number;
  powerUnit: PowerUnitKey; setPowerUnit: (v: PowerUnitKey) => void;
  powerFactor: number;
}) {
  const [us] = useUnitSystem();
  return (
    <div style={{ backgroundColor: C.surface, borderRadius: 8, padding: 12, border: `1px solid ${C.border}` }}>
      <p style={{ fontSize: 11, color: C.text, margin: '0 0 4px 0' }}>이론 동력 / 설계 동력</p>
      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: C.blue }}>
          {(theoPower_W * powerFactor).toFixed(2)}
        </span>
        <span style={{ fontSize: 12, color: C.textDark }}>→ {(designPower_W * powerFactor).toFixed(2)}</span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
        {getPowerUnits(us).map(u => (
          <button key={u.key}
            onClick={() => setPowerUnit(u.key)}
            style={{
              padding: '3px 8px', fontSize: 11, borderRadius: 4,
              border: `1px solid ${powerUnit === u.key ? C.blue : C.borderInput}`,
              backgroundColor: powerUnit === u.key ? 'var(--accent-primary-bg-soft)' : C.surface,
              color: powerUnit === u.key ? C.blue : C.textDark,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >{u.label}</button>
        ))}
      </div>
      {recommendedMotorRating_kW > 0 && (
        <p style={{ fontSize: 11, color: 'var(--text-quaternary)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
          권장 정격 (IEC): <strong style={{ color: C.textDark }}>{recommendedMotorRating_kW} kW</strong> (IE3 효율등급 이상 권장)
        </p>
      )}
    </div>
  );
}

// ── CV Authority 배지 ────────────────────────────────────────────
function CVAuthorityBadge({ authority, verdict }: { authority: number; verdict: CVAuthorityVerdict }) {
  type Config = { bg: string; fg: string; icon: string; text: string };
  const configs: Record<CVAuthorityVerdict, Config | null> = {
    'ok':          { bg: '#dcfce7', fg: '#166534', icon: 'v', text: `권장 범위 (β = ${authority.toFixed(2)})` },
    'low-margin':  { bg: '#fef3c7', fg: '#92400e', icon: '!', text: `권위 부족 (β = ${authority.toFixed(2)})` },
    'too-low':     { bg: '#fee2e2', fg: '#991b1b', icon: 'x', text: `제어성 위험 — CV ΔP 키울 것 (β = ${authority.toFixed(2)})` },
    'high-margin': { bg: '#fef3c7', fg: '#92400e', icon: '!', text: `다소 과도 (β = ${authority.toFixed(2)})` },
    'too-high':    { bg: '#fee2e2', fg: '#991b1b', icon: 'x', text: `동력 낭비 — CV ΔP 줄일 것 (β = ${authority.toFixed(2)})` },
    'na': null,
  };
  const cfg = configs[verdict];
  if (!cfg) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
      <span style={{
        display: 'inline-block', padding: '3px 10px', borderRadius: 12,
        fontSize: 12, fontWeight: 700,
        backgroundColor: cfg.bg, color: cfg.fg,
        border: `1px solid ${cfg.fg}`,
      }}>
        {cfg.icon === 'v' ? '✓' : cfg.icon === '!' ? '⚠' : '✕'} {cfg.text}
      </span>
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
        컨트롤 밸브가 TDH의 25~50%를 차지해야 자동제어가 안정적입니다 (Valve Authority β)
      </span>
    </div>
  );
}

// ── 양정 구성 분석 카드 ──────────────────────────────────────────
function HeadCompositionCard({ result }: { result: NonNullable<ReturnType<typeof computePumpHvac>> }) {
  const breakdown = result.headBreakdown_m;
  const TDH = result.TDH_m;
  if (TDH <= 0) return null;

  type Item = { label: string; value: number; color: string };
  const items: Item[] = [
    { label: '컨트롤 밸브', value: breakdown.controlValve,    color: '#a855f7' },
    { label: '열교환기',    value: breakdown.heatExchanger,   color: '#0ea5e9' },
    { label: '필터',        value: breakdown.filter,          color: '#eab308' },
    { label: '펌프 부속',   value: breakdown.pumpEquip,       color: '#f97316' },
    { label: '기타 장비',   value: breakdown.otherEquip,      color: '#94a3b8' },
    { label: '배관 마찰',   value: breakdown.pipeFriction,    color: '#3b82f6' },
    { label: '정수두+잔류', value: breakdown.staticAndResidual, color: '#64748b' },
  ].filter(it => it.value > 0);

  return (
    <div className="pump-section" style={{ ...sectionStyle, marginTop: 12 }}>
      <p style={{ ...sectionTitleStyle, color: C.blue }}>
        양정 구성 분석 (TDH {TDH.toFixed(2)} m)
      </p>
      {items.map(it => {
        const pct = (it.value / TDH) * 100;
        return (
          <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 90, fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>{it.label}</span>
            <div style={{ flex: 1, height: 14, backgroundColor: 'var(--bg-surface-3, #e5e7eb)', borderRadius: 7, overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(pct, 100)}%`, height: '100%',
                backgroundColor: it.color, transition: 'width 0.3s',
              }} />
            </div>
            <span style={{ width: 52, fontSize: 12, textAlign: 'right', color: 'var(--text-primary)', flexShrink: 0 }}>{pct.toFixed(1)}%</span>
            <span style={{ width: 72, fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>{it.value.toFixed(2)} m</span>
          </div>
        );
      })}
      {result.cvVerdict !== 'na' && (
        <CVAuthorityBadge authority={result.cvAuthority} verdict={result.cvVerdict} />
      )}
      {result.cvVerdict === 'na' && (
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
          컨트롤 밸브 입력 시 권위(Authority) 자동 진단 — 권장 25~50% (ASHRAE)
        </p>
      )}
    </div>
  );
}
