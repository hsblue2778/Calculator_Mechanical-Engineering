// 마찰손실 계통 계산기 — ① 계통 설정 (계통·유체·가용정압·등급별 목표 유속범위)
// 스크래치 환산기(Q·V·D)는 미제공 — 마찰 손실 계산기(pipe-friction)와 중복이라 뺐음 (개요 탭 안내)

import {
  FN_FLUIDS, FN_GRADES, FN_V_LIMIT_DEFAULTS, FN_TARGET_R_PA_PER_M, FN_PA_PER_MMAQ,
  FN_R_UNITS, fnFluidDef, fnRUnit, fmtR,
  type FNFluidId, type FNSystemType,
} from '../../../data/frictionNetworkRef.ts';
import { fnFluidTempRange } from '../fluids';
import type { FNFlowUnit, FNNetworkResult } from '../calc';
import type { FNSettingsState } from '../index';
import { C, inputStyle, labelStyle, cellInputStyle, cellSelectStyle } from '../styles';

interface Props {
  st: FNSettingsState;
  patchSettings: (patch: Partial<FNSettingsState>) => void;
  changeSystemType: (t: FNSystemType) => void;
  net: FNNetworkResult | null;
  pAvailEntered: boolean;
}

export default function SettingsPanel({ st, patchSettings, changeSystemType, net, pAvailEntered }: Props) {
  const fluidDef = fnFluidDef(st.fluid);
  const tempRange = fnFluidTempRange(st.fluid);
  const showPress = fluidDef.pressCorrect || fluidDef.compressible;   // 공기(보정)·증기(압축성 경고)
  const designAvail = pAvailEntered && net ? net.designAvail_Pa : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <SectionLabel>① 계통 설정</SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
        <div>
          <label style={labelStyle}>계통 종류</label>
          <select value={st.systemType} onChange={e => changeSystemType(e.target.value as FNSystemType)} style={inputStyle}>
            <option value="pipe">배관</option>
            <option value="duct">덕트</option>
          </select>
          <Hint>목표 유속범위·유량 단위 기본값 적용</Hint>
        </div>
        <div>
          <label style={labelStyle}>유체</label>
          <select value={st.fluid} onChange={e => patchSettings({ fluid: e.target.value as FNFluidId })} style={inputStyle}>
            {FN_FLUIDS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <Hint>{st.fluid === 'custom' ? 'ρ·ν 직접입력' : '참조표 선형보간 (범위 밖 clamp)'}</Hint>
        </div>
        {st.fluid !== 'custom' && (
          <div>
            <label style={labelStyle}>온도 (°C)</label>
            <input type="number" step="any" value={st.tempC}
              onChange={e => patchSettings({ tempC: e.target.value })} style={inputStyle} />
            {tempRange && <Hint>{tempRange.min}~{tempRange.max}°C 범위 clamp 후 보간</Hint>}
          </div>
        )}
        {showPress && (
          <div>
            <label style={labelStyle}>절대압 P_abs (bar a)</label>
            <input type="number" step="any" value={st.pressAbs}
              onChange={e => patchSettings({ pressAbs: e.target.value })} style={inputStyle} />
            <Hint>{fluidDef.pressCorrect ? 'ρ×=P/1.01325 · ν÷=P/1.01325 + 압축성 경고 기준' : '압축성 경고 기준 (ΔP > 0.1·P_abs)'}</Hint>
          </div>
        )}
        {st.fluid === 'custom' && (
          <>
            <div>
              <label style={labelStyle}>밀도 ρ (kg/m³)</label>
              <input type="number" step="any" value={st.rhoCustom}
                onChange={e => patchSettings({ rhoCustom: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>동점성계수 ν (×10⁻⁶ m²/s)</label>
              <input type="number" step="any" value={st.nuCustom}
                onChange={e => patchSettings({ nuCustom: e.target.value })} style={inputStyle} />
              <Hint>예: 물 20°C = 1.004</Hint>
            </div>
          </>
        )}
        <div>
          <label style={labelStyle}>말단유량 단위</label>
          <select value={st.flowUnit} onChange={e => patchSettings({ flowUnit: e.target.value as FNFlowUnit })} style={inputStyle}>
            <option value="LPM">LPM (L/min)</option>
            <option value="CMH">CMH (m³/h)</option>
          </select>
          <Hint>Q = LPM÷60000 · CMH÷3600 (m³/s)</Hint>
        </div>
        <div>
          <label style={labelStyle}>가용정압 P_avail (Pa)</label>
          <input type="number" step="any" value={st.pAvail}
            onChange={e => patchSettings({ pAvail: e.target.value })} style={inputStyle} />
          <Hint>팬·펌프가 계통에 쓸 수 있는 정압</Hint>
        </div>
        <div>
          <label style={labelStyle}>여유율 α (%)</label>
          <input type="number" step="any" min="0" value={st.alphaPct}
            onChange={e => patchSettings({ alphaPct: e.target.value })} style={inputStyle} />
          <Hint>
            설계 가용정압 = P_avail×(1−α)
            {designAvail !== null && ` = ${designAvail.toFixed(0)} Pa (${(designAvail / FN_PA_PER_MMAQ).toFixed(1)} mmAq)`}
          </Hint>
        </div>
        <div>
          <label style={labelStyle}>설계 총유량 ({st.flowUnit}) — 대조용</label>
          <input type="number" step="any" min="0" value={st.designTotalFlow}
            onChange={e => patchSettings({ designTotalFlow: e.target.value })} style={inputStyle} />
          <TotalFlowHint st={st} net={net} />
        </div>
      </div>

      {net && (
        <p style={{ fontSize: 12, color: C.text, margin: 0 }}>
          적용 물성: ρ = <Mono>{net.rho_kgm3.toFixed(3)}</Mono> kg/m³ · ν = <Mono>{(net.nu_m2s * 1e6).toFixed(4)}</Mono> ×10⁻⁶ m²/s
          {net.tempClamped && <span style={{ color: C.warn }}> (온도 범위 밖 — 경계값으로 clamp)</span>}
        </p>
      )}

      {/* 등급별 목표 유속범위 — 계통 종류가 기본값 선택, 직접 수정 가능 */}
      <div style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px' }}>
        <p style={{ ...labelStyle, marginBottom: 8 }}>
          목표 유속범위 (m/s) — {st.systemType === 'duct' ? '덕트' : '배관'} 기본값, 수정 가능
        </p>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          {FN_GRADES.map(g => {
            const def = FN_V_LIMIT_DEFAULTS[st.systemType][g.key];
            const v = st.vLimits[g.key];
            return (
              <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textDark, width: 34 }}>{g.label}</span>
                <input type="number" step="any" value={v.min} style={{ ...cellInputStyle, width: 58 }}
                  onChange={e => patchSettings({ vLimits: { ...st.vLimits, [g.key]: { ...v, min: e.target.value } } })} />
                <span style={{ fontSize: 12, color: C.text }}>~</span>
                <input type="number" step="any" value={v.max} style={{ ...cellInputStyle, width: 58 }}
                  onChange={e => patchSettings({ vLimits: { ...st.vLimits, [g.key]: { ...v, max: e.target.value } } })} />
                <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>(기본 {def.min}~{def.max})</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.textDark }}>목표 마찰률 R</span>
          <input type="number" step="any" min="0" value={st.targetR} style={{ ...cellInputStyle, width: 80 }}
            onChange={e => patchSettings({ targetR: e.target.value })} />
          <select value={st.targetRUnit} style={{ ...cellSelectStyle, width: 96 }}
            onChange={e => changeRUnit(st, patchSettings, e.target.value)}>
            {FN_R_UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
          <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>
            (권장 덕트 {fmtR(FN_TARGET_R_PA_PER_M.duct / fnRUnit(st.targetRUnit).toPaPerM)} · 배관 {fmtR(FN_TARGET_R_PA_PER_M.pipe / fnRUnit(st.targetRUnit).toPaPerM)} {fnRUnit(st.targetRUnit).label}) — 제안De 산출 전용, 손실 계산에는 미사용. 비우면 유속 기준만 적용
          </span>
        </div>
      </div>
    </div>
  );
}

// R 단위 변경 — 입력값을 새 단위로 환산해 물리량 유지 (빈값·무효값은 단위만 교체)
function changeRUnit(st: FNSettingsState, patchSettings: (p: Partial<FNSettingsState>) => void, unit: string) {
  const v = parseFloat(st.targetR);
  const patch: Partial<FNSettingsState> = { targetRUnit: unit };
  if (Number.isFinite(v)) {
    patch.targetR = fmtR(v * fnRUnit(st.targetRUnit).toPaPerM / fnRUnit(unit).toPaPerM);
  }
  patchSettings(patch);
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 14, fontWeight: 700, color: C.heading, margin: 0 }}>{children}</h3>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 4, paddingLeft: 2 }}>{children}</p>;
}

// 설계 총유량 ↔ Σ말단유량 대조 힌트 (차이 0.5% 초과 시 경고색)
function TotalFlowHint({ st, net }: { st: FNSettingsState; net: FNNetworkResult | null }) {
  const design = parseFloat(st.designTotalFlow);
  if (st.designTotalFlow.trim() === '' || !Number.isFinite(design) || design <= 0) {
    return <Hint>입력 시 Σ말단유량과 대조 (계산에는 미사용)</Hint>;
  }
  if (!net) return <Hint>구간 입력 후 Σ말단유량과 대조됩니다</Hint>;
  const mul = st.flowUnit === 'LPM' ? 60000 : 3600;
  const sum = net.totalLeafFlow_m3s * mul;
  const diff = sum - design;
  const relPct = (diff / design) * 100;
  const mismatch = Math.abs(relPct) > 0.5;
  return (
    <p style={{ fontSize: 11, color: mismatch ? C.warn : 'var(--text-quaternary)', marginTop: 4, paddingLeft: 2 }}>
      Σ말단 = {sum.toFixed(1)} {st.flowUnit} · 차이 {diff >= 0 ? '+' : ''}{diff.toFixed(1)} ({relPct >= 0 ? '+' : ''}{relPct.toFixed(1)}%)
    </p>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: 'ui-monospace, monospace', color: C.textDark }}>{children}</span>;
}
