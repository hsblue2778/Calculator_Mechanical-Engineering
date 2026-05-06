// HVAC 펌프 시스템 — §1 시스템 기본조건 섹션
// CalculatorTab.tsx에서 분리 (500줄 초과 규칙 §5)
// Phase 1.1: fieldConfig 기반으로 fluid/systemMode 옵션 렌더 (하드코딩 제거)

import { Calculator } from 'lucide-react';
import { UnitBtn } from './FormComponents';
import { FLOW_UNITS_PUMP, type FlowUnitPumpKey } from '../units';
import { C, inputStyle, labelStyle, sectionStyle, sectionTitleStyle } from '../styles';
import type { SystemMode } from '../calc';
import { calcFlowFromHeatLoad } from '../calc';
import type { PumpFieldConfig, FluidId } from '../configs/types';
import type { FluidType } from '../../../data/glycol-properties';

// 유체 ID → 표시 라벨 매핑
const FLUID_LABELS: Record<FluidId, string> = {
  'water': '냉수',
  'cooling-water': '냉각수',
  'hot-water': '온수',
  'glycol-eg': 'EG 브라인 (Phase 1.5)',
  'glycol-pg': 'PG 브라인 (Phase 1.5)',
};

// 유체 ID → disabled 여부 (Phase 1.5 이전 글리콜 미구현)
const FLUID_DISABLED: Record<FluidId, boolean> = {
  'water': false,
  'cooling-water': false,
  'hot-water': false,
  'glycol-eg': true,
  'glycol-pg': true,
};

// 시스템 모드 → 표시 라벨
const SYSTEM_MODE_LABELS: Record<'open' | 'closed', string> = {
  'open': '개방계 (Open)',
  'closed': '폐회로 (Closed)',
};

interface Props {
  fieldConfig: PumpFieldConfig;
  systemMode: SystemMode;
  setSystemMode: (v: SystemMode) => void;
  fluid: FluidId;
  setFluid: (v: FluidId) => void;
  tempC: string;
  setTempC: (v: string) => void;
  Q: string;
  setQ: (v: string) => void;
  flowUnit: FlowUnitPumpKey;
  onFlowUnitChange: (v: FlowUnitPumpKey) => void;
  // 열부하 → 유량 보조 입력
  heatLoadStr: string;
  setHeatLoadStr: (v: string) => void;
  deltaTStr: string;
  setDeltaTStr: (v: string) => void;
  useHeatLoadCalc: boolean;
  setUseHeatLoadCalc: (v: boolean) => void;
}

export default function SystemConditionSection({
  fieldConfig,
  systemMode, setSystemMode,
  fluid, setFluid,
  tempC, setTempC,
  Q, setQ,
  flowUnit, onFlowUnitChange,
  heatLoadStr, setHeatLoadStr,
  deltaTStr, setDeltaTStr,
  useHeatLoadCalc, setUseHeatLoadCalc,
}: Props) {
  const isClosed = systemMode === 'closed';

  // 열부하 → 유량 산출 (실시간)
  const q_kW = parseFloat(heatLoadStr);
  const deltaT_K = parseFloat(deltaTStr);
  const tempC_num = parseFloat(tempC);
  const derivedQ_m3s = calcFlowFromHeatLoad({
    fluid: fluid as FluidType,
    concPct: 0,
    tempC: Number.isFinite(tempC_num) ? tempC_num : 20,
    q_kW,
    deltaT_K,
  });
  const derivedQ_m3h = derivedQ_m3s !== null ? derivedQ_m3s * 3600 : null;

  function handleApplyHeatLoad() {
    if (derivedQ_m3h === null) return;
    setQ(derivedQ_m3h.toFixed(2));
    onFlowUnitChange('m3h');
  }

  return (
    <div style={sectionStyle}>
      <p style={sectionTitleStyle}>시스템 기본조건</p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(80px, 0.5fr) minmax(110px, 0.8fr) minmax(90px, 0.6fr) minmax(380px, 3fr)',
        gap: 12,
      }}>
        <div>
          <label style={labelStyle}>분야</label>
          <input readOnly value={fieldConfig.fieldLabel}
            style={{ ...inputStyle, backgroundColor: 'var(--bg-surface-3)', color: 'var(--text-tertiary)', cursor: 'default' }} />
        </div>
        <div>
          <label style={labelStyle}>운전 유체</label>
          {/* availableFluids 기반 렌더 — 하드코딩 없음 */}
          <select value={fluid} onChange={e => setFluid(e.target.value as FluidId)}
            style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
            onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
          >
            {fieldConfig.availableFluids.map(fId => (
              <option key={fId} value={fId} disabled={FLUID_DISABLED[fId]}>
                {FLUID_LABELS[fId]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>운전 온도 (°C)</label>
          <input type="number" value={tempC} onChange={e => setTempC(e.target.value)}
            min={0} max={150} step="any" style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
            onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }} />
        </div>
        <div>
          <label style={labelStyle}>정격 유량 Q</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="number" value={Q} onChange={e => setQ(e.target.value)}
              min={0} step="any" style={{ ...inputStyle, flex: 1 }}
              onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
              onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }} />
            <div style={{ display: 'flex', gap: 2 }}>
              {FLOW_UNITS_PUMP.map(u => (
                <UnitBtn key={u.key} label={u.label} active={flowUnit === u.key}
                  onClick={() => onFlowUnitChange(u.key)} />
              ))}
            </div>
            {/* 열부하 → 유량 토글 버튼 */}
            <button
              type="button"
              onClick={() => setUseHeatLoadCalc(!useHeatLoadCalc)}
              title="열부하와 온도차로 유량 산출"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', fontSize: 12, fontWeight: 500,
                color: useHeatLoadCalc ? '#fff' : C.blue,
                backgroundColor: useHeatLoadCalc ? C.blue : 'transparent',
                border: `1px solid ${C.blue}`,
                borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              <Calculator size={13} />
              부하로 계산
            </button>
          </div>
        </div>

        {/* 열부하 → 유량 인라인 펼침 영역 */}
        {useHeatLoadCalc && (
          <div style={{
            gridColumn: '1 / -1',
            backgroundColor: 'var(--bg-surface-2, #f8f9fa)',
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
          }}>
            <div>
              <label style={labelStyle}>열부하 q (kW)</label>
              <input
                type="number"
                value={heatLoadStr}
                onChange={e => setHeatLoadStr(e.target.value)}
                min={0} step="any"
                placeholder="예: 100"
                style={{ ...inputStyle, width: 120 }}
                onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
                onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
              />
            </div>
            <div>
              <label style={labelStyle}>온도차 ΔT (℃)</label>
              <input
                type="number"
                value={deltaTStr}
                onChange={e => setDeltaTStr(e.target.value)}
                min={0} step="any"
                placeholder="예: 5"
                style={{ ...inputStyle, width: 120 }}
                onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
                onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              <div>
                <label style={labelStyle}>산출 Q</label>
                <div style={{
                  ...inputStyle,
                  display: 'flex', alignItems: 'center',
                  backgroundColor: 'var(--bg-surface-3, #eef0f2)',
                  color: derivedQ_m3h !== null ? C.heading : C.text,
                  minWidth: 140, cursor: 'default',
                }}>
                  {derivedQ_m3h !== null
                    ? `→ ${derivedQ_m3h.toFixed(2)} m³/h`
                    : '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleApplyHeatLoad}
                disabled={derivedQ_m3h === null}
                style={{
                  padding: '7px 14px', fontSize: 13, fontWeight: 600,
                  color: derivedQ_m3h !== null ? '#fff' : 'var(--text-quaternary)',
                  backgroundColor: derivedQ_m3h !== null ? C.blue : 'var(--bg-surface-3, #eef0f2)',
                  border: 'none', borderRadius: 6,
                  cursor: derivedQ_m3h !== null ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                  marginBottom: 1,
                }}
              >
                적용
              </button>
            </div>
          </div>
        )}

        {/* 시스템 모드 라디오 — availableSystemModes 기반 렌더, 하드코딩 없음 */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>시스템 모드</label>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', paddingTop: 4 }}>
            {fieldConfig.availableSystemModes.map(mode => (
              <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, color: C.heading }}>
                <input
                  type="radio"
                  name="systemMode"
                  value={mode}
                  checked={systemMode === mode}
                  onChange={() => setSystemMode(mode)}
                  style={{ accentColor: C.blue }}
                />
                {SYSTEM_MODE_LABELS[mode]}
              </label>
            ))}
            {isClosed && (
              <span style={{
                fontSize: 12, color: C.badgeText, backgroundColor: C.badge,
                border: `1px solid var(--accent-primary-bg)`, borderRadius: 4, padding: '2px 8px',
              }}>
                폐회로: 정수두 차 = 0
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
