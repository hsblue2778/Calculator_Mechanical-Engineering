// 관마찰손실 — 계산 탭

import { useState } from 'react';
import { RotateCcw, Printer, Download, AlertTriangle, Save, Check } from 'lucide-react';
import Frac from '../../../components/Frac';
import FIn from '../../../components/FIn';
import FormulaSection from '../../../components/FormulaSection';
import UnitPanel from '../../../components/UnitPanel';
import {
  FLOW_UNITS, type FlowUnitKey,
  PRESSURE_UNITS, type PressureUnitKey,
} from '../units';
import {
  PIPE_MATERIALS, type PipeMaterial,
  formatMaterialOptionLabel, formatMaterialHelperText,
} from '../../../data/pipeMaterials';
import {
  computeFriction, validateFrictionInput,
  computeFrictionFromV, validateFrictionInputV,
} from '../calc';
import { flowRegime, rangeStatus, RANGES, formatRe } from '../analysis';
import ResultBlocks from './ResultBlocks';
import { downloadCsv, printToPdf } from '../../../utils/exportUtils';
import { C, inputStyle, labelStyle } from '../styles';
import PrintReport from '../../../components/PrintReport';
import PrintReportContent from '../PrintReportContent';

interface Props {
  inputMode: 'Q' | 'v';
  setInputMode: (m: 'Q' | 'v') => void;
  Q: string; v: string; D: string; L: string;
  setQ: (v: string) => void; setV: (v: string) => void;
  setD: (v: string) => void; setL: (v: string) => void;
  matIdx: number; setMatIdx: (i: number) => void;
  fOverride: string; setFOverride: (v: string) => void;
  flowUnit: FlowUnitKey; setFlowUnit: (u: FlowUnitKey) => void;
  pressureUnit: PressureUnitKey; setPressureUnit: (u: PressureUnitKey) => void;
  onReset: () => void;
  onSave?: () => void;
  canSave?: boolean;
}

export default function CalculatorTab({
  inputMode, setInputMode,
  Q, v, D, L, setQ, setV, setD, setL,
  matIdx, setMatIdx, fOverride, setFOverride,
  flowUnit, setFlowUnit, pressureUnit, setPressureUnit, onReset,
  onSave, canSave,
}: Props) {
  const mat = PIPE_MATERIALS[matIdx];
  const pressDef = PRESSURE_UNITS.find(u => u.key === pressureUnit)!;
  const flowUnitLabel = FLOW_UNITS.find(u => u.key === flowUnit)?.label ?? '';
  const flowUnitDivisor = FLOW_UNITS.find(u => u.key === flowUnit)?.divisor ?? 3600;

  const D_mm = parseFloat(D);
  const L_m = parseFloat(L);
  const f = (fOverride.trim() ? parseFloat(fOverride) : mat.frictionFactor);

  const inputErr = (Q || v || D || L || fOverride)
    ? (inputMode === 'v'
        ? validateFrictionInputV(v, D_mm, L_m, f)
        : validateFrictionInput(Q, D_mm, L_m, f))
    : null;

  const res = !inputErr
    ? (inputMode === 'v'
        ? computeFrictionFromV({ v_str: v, D_mm, L_m, f })
        : computeFriction({ Q_str: Q, flowUnit, D_mm, L_m, f }))
    : null;

  const unitLossDisplay = res ? res.unitLoss_Pa * pressDef.factor : null;
  const Q_display = (res && inputMode === 'v') ? res.Q_m3s * flowUnitDivisor : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <div style={{ position: 'relative' }}>
          <label style={labelStyle}>배관 재질</label>
          <select
            value={matIdx}
            onChange={e => { setMatIdx(Number(e.target.value)); setFOverride(''); }}
            style={{
              ...inputStyle,
              borderColor: C.borderInput,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
            onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
          >
            {PIPE_MATERIALS.map((m, i) => (
              <option key={i} value={i}>{formatMaterialOptionLabel(m)}</option>
            ))}
          </select>
          <p style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 4, paddingLeft: 2 }}>
            {formatMaterialHelperText(mat)} · 옵션 라벨에 ε (조도) 포함
          </p>
        </div>
        <div>
          <label style={labelStyle}>입력 값</label>
          <select
            value={inputMode}
            onChange={e => setInputMode(e.target.value as 'Q' | 'v')}
            style={{ ...inputStyle, borderColor: C.borderInput }}
            onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
            onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
          >
            <option value="Q">유량</option>
            <option value="v">유속</option>
          </select>
          <p style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 4, paddingLeft: 2 }}>
            유량(Q) 또는 유속(v) 중 입력할 값을 선택
          </p>
        </div>
      </div>

      <UnitPanel
        flowOptions={inputMode === 'v'
          ? [{ key: 'ms', label: 'm/s' }]
          : FLOW_UNITS.map(u => ({ key: u.key, label: u.label }))}
        flowValue={inputMode === 'v' ? 'ms' : flowUnit}
        onFlowChange={val => {
          if (inputMode === 'v') return;       // v 모드: m/s 단일 옵션, 변경 없음
          setFlowUnit(val as FlowUnitKey);
        }}
        flowLabel={inputMode === 'v' ? '유속 단위' : '유량 단위'}
        pressureOptions={PRESSURE_UNITS.map(u => ({ key: u.key, label: u.label }))}
        pressureValue={pressureUnit}
        onPressureChange={val => setPressureUnit(val as PressureUnitKey)}
      />

      <FormulaSection title="① 마찰손실 (Darcy-Weisbach)">
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <span>hf</span><span>=</span>
          {inputMode === 'v' ? (
            <Frac
              n={<><FIn value={fOverride || mat.frictionFactor.toString()} onChange={setFOverride} placeholder="f" /> × <FIn value={L} onChange={setL} placeholder="L" /> × <span style={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700 }}><FIn value={v} onChange={setV} placeholder="v" width={80} />²</span></>}
              d={<>2 × g × <FIn value={D} onChange={setD} placeholder="D" /></>}
            />
          ) : (
            <Frac
              n={<>8 × <FIn value={fOverride || mat.frictionFactor.toString()} onChange={setFOverride} placeholder="f" /> × <FIn value={L} onChange={setL} placeholder="L" /> × <span style={{ display: 'inline-flex', alignItems: 'center', fontWeight: 700 }}><FIn value={Q} onChange={setQ} placeholder="Q" width={80} />²</span></>}
              d={<>π² × g × <FIn value={D} onChange={setD} placeholder="D" />⁵</>}
            />
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginTop: 16 }}>
          {inputMode === 'v' ? (
            <FieldNumber
              label={<>유속 v <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>(m/s)</span></>}
              value={v} onChange={setV}
            />
          ) : (
            <FieldNumber
              label={<>유량 Q <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>({flowUnitLabel})</span></>}
              value={Q} onChange={setQ}
            />
          )}
          <FieldNumber
            label={<>관 내경 D <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>(mm)</span></>}
            value={D} onChange={setD}
          />
          <FieldNumber
            label={<>배관 길이 L <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>(m)</span></>}
            value={L} onChange={setL}
          />
        </div>

        <p style={{ fontSize: 12, color: C.text, marginTop: 14 }}>
          {inputMode === 'v'
            ? 'g = 9.81 m/s² (고정), v는 m/s 단위로 입력합니다.'
            : 'g = 9.81 m/s² (고정), Q는 선택한 단위로 내부 변환되어 계산됩니다.'}
        </p>
      </FormulaSection>

      {inputErr && (Q || v || D || L) ? (
        <ErrorBanner message={inputErr.message} />
      ) : res ? (
        <ResultBlocks
          res={res} pressDef={pressDef} unitLossDisplay={unitLossDisplay}
          inputMode={inputMode} Q_display={Q_display} flowUnitLabel={flowUnitLabel}
        />
      ) : (
        <div style={{
          backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '24px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 13, color: C.text, margin: 0 }}>
            재질·유량·관 내경·배관 길이를 모두 입력하면 결과가 표시됩니다.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        {onSave && <SaveBtn onClick={onSave} enabled={!!canSave} />}
        <ActionBtn icon={<Download size={14} />} label="CSV 내보내기"
          enabled={!!res}
          onClick={() => res && handleCsvExport(
            res, mat,
            inputMode === 'v' && Q_display !== null ? Q_display.toFixed(2) : Q,
            D, L, flowUnit, pressDef, unitLossDisplay,
          )} />
        <ActionBtn icon={<Printer size={14} />} label="PDF로 저장"
          enabled={!!res}
          onClick={() => printToPdf('관마찰손실 계산결과')}
          title="브라우저 인쇄 다이얼로그에서 '대상: PDF로 저장' 선택" />
        <button
          onClick={onReset}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 20px', fontSize: 14, fontWeight: 500,
            color: C.text, backgroundColor: 'transparent',
            border: `1px solid ${C.borderInput}`, borderRadius: 8,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <RotateCcw size={14} /> 초기화
        </button>
      </div>

      {res && (
        <PrintReport title="관마찰손실 계산결과">
          <PrintReportContent
            res={res} mat={mat} inputMode={inputMode}
            Q={Q} v={v} D={D} L={L} fOverride={fOverride}
            flowUnit={flowUnit} pressureUnit={pressureUnit}
          />
        </PrintReport>
      )}
    </div>
  );
}

function SaveBtn({ onClick, enabled }: { onClick: () => void; enabled: boolean }) {
  const [saved, setSaved] = useState(false);
  function handle() {
    onClick();
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }
  return (
    <button
      onClick={handle}
      disabled={!enabled}
      title={enabled ? '현재 계산을 기록에 저장' : '계산 결과가 유효할 때 저장할 수 있습니다'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '10px 16px', fontSize: 13, fontWeight: 500,
        color: enabled ? 'var(--text-inverse)' : 'var(--border-subtle)',
        backgroundColor: enabled ? (saved ? 'var(--state-success)' : C.blue) : 'var(--border-default)',
        border: 'none', borderRadius: 8,
        cursor: enabled ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
        transition: 'background-color 0.15s',
      }}
    >
      {saved ? <Check size={14} /> : <Save size={14} />}
      {saved ? '저장됨' : '기록 저장'}
    </button>
  );
}

function FieldNumber({
  label, value, onChange,
}: {
  label: React.ReactNode; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <label style={labelStyle}>{label}</label>
      <input
        type="number" value={value} onChange={e => onChange(e.target.value)}
        min="0" step="any"
        style={{
          ...inputStyle,
          borderColor: C.borderInput,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
        onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
      />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '12px 16px',
      backgroundColor: 'var(--state-error-bg)', border: '1px solid var(--state-error-text)',
      borderLeft: '3px solid var(--state-error)',
      borderRadius: 6, color: 'var(--state-error-text)', fontSize: 13,
    }}>
      <AlertTriangle size={16} />
      <span>{message}</span>
    </div>
  );
}

function ActionBtn({
  icon, label, enabled, onClick, title,
}: {
  icon: React.ReactNode; label: string; enabled: boolean;
  onClick: () => void; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!enabled}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '10px 16px', fontSize: 13, fontWeight: 500,
        color: enabled ? C.textDark : 'var(--text-quaternary)',
        backgroundColor: C.surface,
        border: `1px solid ${enabled ? C.borderInput : C.border}`, borderRadius: 8,
        cursor: enabled ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
      }}
    >
      {icon} {label}
    </button>
  );
}

function handleCsvExport(
  res: NonNullable<ReturnType<typeof computeFriction>>,
  mat: PipeMaterial,
  Q: string, D: string, L: string,
  flowUnit: FlowUnitKey,
  pressDef: typeof PRESSURE_UNITS[number],
  unitLossDisplay: number | null,
) {
  const flowLabel = FLOW_UNITS.find(u => u.key === flowUnit)?.label ?? '';
  const regime = flowRegime(res.Re);
  const rangeV = rangeStatus(res.V_ms, RANGES.velocity);
  const rangeU = rangeStatus(res.unitLoss_Pa, RANGES.unitLossPa);
  const deltaP_unit = res.deltaP_Pa * pressDef.factor;

  const rows: (string | number)[][] = [
    ['항목', '값', '단위', '비고'],
    ['계산기', '관마찰손실 (Darcy-Weisbach)', '', ''],
    ['배관 재질', mat.nameKo + (mat.abbreviation ? ` (${mat.abbreviation})` : ''), '', `f=${mat.frictionFactor}`],
    ['유량 Q', Q, flowLabel, ''],
    ['관 내경 D', D, 'mm', ''],
    ['배관 길이 L', L, 'm', ''],
    ['', '', '', ''],
    ['유속 V', res.V_ms.toFixed(3), 'm/s', rangeV.label],
    ['레이놀즈수 Re', res.Re.toFixed(0), '-', regime.label + ' (' + formatRe(res.Re) + ')'],
    ['총 마찰손실 ΔP', deltaP_unit.toFixed(pressDef.dp), pressDef.label, ''],
    ['단위 마찰손실', unitLossDisplay !== null ? unitLossDisplay.toFixed(pressDef.dpM) : '', `${pressDef.label}/m`, rangeU.label],
    ['수두 hf', res.hf_m.toFixed(3), 'm', ''],
    ['적용 마찰계수 f', res.f.toFixed(4), '-', ''],
  ];
  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  downloadCsv(`pipe-friction_${ts}.csv`, rows);
}
