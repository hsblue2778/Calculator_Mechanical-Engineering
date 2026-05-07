// HVAC 펌프 시스템 — §6 정수두·잔류압력 + §7 안전율 프리셋 섹션
// CalculatorTab.tsx에서 분리 (500줄 초과 규칙 §5)

import { FieldNum, PresetField, UnitBtn } from './FormComponents';
import { PRESSURE_UNITS_PUMP, type PressureUnitPumpKey } from '../units';
import { C, inputStyle, labelStyle, sectionStyle, sectionTitleStyle } from '../styles';
import type { PumpFieldConfig } from '../configs/types';

interface Props {
  isClosed: boolean;
  fieldLabel: string;
  fieldConfig: PumpFieldConfig;

  HsStr: string;
  setHsStr: (v: string) => void;
  HdStr: string;
  setHdStr: (v: string) => void;
  PresStr: string;
  setPresStr: (v: string) => void;
  presUnit: PressureUnitPumpKey;
  onPresUnitChange: (v: PressureUnitPumpKey) => void;
  PatmStr: string;
  setPatmStr: (v: string) => void;

  headMarginStr: string;
  setHeadMarginStr: (v: string) => void;
  powerMarginStr: string;
  setPowerMarginStr: (v: string) => void;
  npshMarginStr: string;
  setNpshMarginStr: (v: string) => void;
  presetApplied: { head: boolean; power: boolean; npsh: boolean };
  setPresetApplied: (v: { head: boolean; power: boolean; npsh: boolean }) => void;
}

export default function HeadPressureSection({
  isClosed,
  fieldLabel,
  fieldConfig,
  HsStr, setHsStr, HdStr, setHdStr,
  PresStr, setPresStr, presUnit, onPresUnitChange,
  PatmStr, setPatmStr,
  headMarginStr, setHeadMarginStr,
  powerMarginStr, setPowerMarginStr,
  npshMarginStr, setNpshMarginStr,
  presetApplied, setPresetApplied,
}: Props) {
  const hsLabel = isClosed ? '펌프 위치 수두 차 (m)' : '흡입측 정수두 Hs (m)';
  const hsHint = isClosed
    ? '팽창탱크(충진 기준점) 대비 펌프 위치 — 펌프가 아래면 양수'
    : '음수 = 흡입 양정';
  const patmLabel = isClosed ? '시스템 충진 절대압력 P_fill (kPa)' : '흡입측 표면 절대압력 P_atm (kPa)';
  const patmHint = isClosed ? '절대압력 (예: 200 kPa)' : '기본: 101.325 kPa (대기압)';

  return (
    <>
      {/* §6 정수두·잔류압력 */}
      <div className="pump-section" style={sectionStyle}>
        <p style={sectionTitleStyle}>정수두 · 잔류압력</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <FieldNum label={hsLabel} hint={hsHint} value={HsStr} onChange={setHsStr} allowNegative />
          {!isClosed && (
            <FieldNum label="토출측 정수두 Hd (m)" value={HdStr} onChange={setHdStr} allowNegative />
          )}
          <div style={{ gridColumn: 'span 2', minWidth: 0 }}>
            <label style={labelStyle}>{fieldConfig.labels.residualPressure} P_res</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="number" value={PresStr} min={0} step="any"
                onChange={e => setPresStr(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 80 }}
                onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
                onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }} />
              <div style={{ display: 'flex', gap: 2 }}>
                {PRESSURE_UNITS_PUMP.map(u => (
                  <UnitBtn key={u.key} label={u.label} active={presUnit === u.key}
                    onClick={() => onPresUnitChange(u.key as PressureUnitPumpKey)} />
                ))}
              </div>
            </div>
          </div>
          <FieldNum label={patmLabel} hint={patmHint} value={PatmStr} onChange={setPatmStr} />
        </div>
      </div>

      {/* §7 안전율 프리셋 */}
      <div className="pump-section" style={sectionStyle}>
        <p style={sectionTitleStyle}>안전율 프리셋 ({fieldLabel})</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <PresetField label="양정 여유 (%)" value={headMarginStr}
            onChange={v => { setHeadMarginStr(v); setPresetApplied({ ...presetApplied, head: false }); }}
            isPreset={presetApplied.head} />
          <PresetField label="동력 여유 (배율)" value={powerMarginStr}
            onChange={v => { setPowerMarginStr(v); setPresetApplied({ ...presetApplied, power: false }); }}
            isPreset={presetApplied.power} />
          <PresetField label="NPSH 여유 (m)" value={npshMarginStr}
            onChange={v => { setNpshMarginStr(v); setPresetApplied({ ...presetApplied, npsh: false }); }}
            isPreset={presetApplied.npsh} />
        </div>
      </div>
    </>
  );
}
