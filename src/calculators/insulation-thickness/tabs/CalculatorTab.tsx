// 냉수배관 보온 두께 계산기 — 계산 탭

import { useMemo, useState } from 'react';
import { RotateCcw, AlertTriangle, Save, Check, ChevronDown, FileDown } from 'lucide-react';
import {
  PIPE_OD_TABLE, INSULATION_MATERIALS,
  calculate, validate, type InsulationInputs, type Grade,
} from '../calc';
import { buildInsulationReportHtml } from '../htmlReport';
import { downloadHtmlFile } from '../../../utils/exportUtils';
import { C, inputStyle, labelStyle } from '../styles';
import InsulationVisuals from './InsulationVisuals';

interface Props {
  state: InsulationInputs;
  setState: (patch: Partial<InsulationInputs>) => void;
  onReset: () => void;
  onSave?: () => void;
  canSave: boolean;
}

export default function CalculatorTab({ state, setState, onReset, onSave, canSave }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const validationErr = useMemo(() => {
    const allEmpty = !state.Ta && !state.Ti && !state.RH;
    if (allEmpty) return null;
    return validate(state);
  }, [state]);

  const result = useMemo(() => calculate(state), [state]);

  const mat = INSULATION_MATERIALS[state.matIdx];
  const isCustomK = mat?.id === 'custom';

  function handleHtmlExport() {
    if (!result) return;
    const pipe = PIPE_OD_TABLE[state.pipeIdx];
    const k = isCustomK ? parseFloat(state.customK) : (mat.k as number);
    const html = buildInsulationReportHtml({
      pipe, mat, k, inputs: state, result,
    });
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadHtmlFile(`insulation-${pipe.nominalA}A_${ts}.html`, html);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 관경 + 보온재 — 한 줄 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <FieldSelect
          label="관경 (KS 강관)"
          value={state.pipeIdx}
          onChange={v => setState({ pipeIdx: v })}
        >
          {PIPE_OD_TABLE.map((p, i) => (
            <option key={p.nominalA} value={i}>
              {p.nominalA}A — 외경 {p.od_mm.toFixed(1)} mm
            </option>
          ))}
        </FieldSelect>

        <FieldSelect
          label="보온재 종류"
          value={state.matIdx}
          onChange={v => setState({ matIdx: v })}
        >
          {INSULATION_MATERIALS.map((m, i) => (
            <option key={m.id} value={i}>
              {m.nameKo}{m.k != null ? ` — k = ${m.k}` : ''}
            </option>
          ))}
        </FieldSelect>
      </div>

      {/* 직접 입력 k */}
      {isCustomK && (
        <FieldNumber
          label={<>열전도율 k <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>(W/m·K)</span></>}
          value={state.customK}
          onChange={v => setState({ customK: v })}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
        <FieldNumber
          label={<>외기 온도 Tₐ <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>(°C)</span></>}
          value={state.Ta} onChange={v => setState({ Ta: v })}
        />
        <FieldNumber
          label={<>관내 온도 Tᵢ <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>(°C)</span></>}
          value={state.Ti} onChange={v => setState({ Ti: v })}
        />
        <FieldNumber
          label={<>상대습도 RH <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>(%)</span></>}
          value={state.RH} onChange={v => setState({ RH: v })}
        />
      </div>

      {/* 고급 옵션 (접힘) */}
      <details
        open={advancedOpen}
        onToggle={e => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
        style={{
          backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '12px 16px',
        }}
      >
        <summary style={{
          cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.textDark,
          display: 'flex', alignItems: 'center', gap: 6,
          listStyle: 'none',
        }}>
          <ChevronDown size={14} style={{ transform: advancedOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
          고급 옵션 (표면 열전달률 · 안전계수)
        </summary>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          <FieldNumber
            label={<>표면 열전달률 hₒ <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>(W/m²·K)</span></>}
            value={state.ho} onChange={v => setState({ ho: v })}
            hint="자연대류 실내 표준 9.3"
          />
          <FieldNumber
            label={<>안전계수 <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>(배수)</span></>}
            value={state.safetyFactor} onChange={v => setState({ safetyFactor: v })}
            hint="통상 1.0 ~ 1.5"
          />
        </div>
      </details>

      {validationErr ? (
        <ErrorBanner message={validationErr.message} />
      ) : result ? (
        <>
          <ResultPanel result={result} />
          <InsulationVisuals
            pipe={PIPE_OD_TABLE[state.pipeIdx]}
            k={isCustomK ? parseFloat(state.customK) : (mat.k as number)}
            ho={parseFloat(state.ho)}
            Ti={parseFloat(state.Ti)}
            Ta={parseFloat(state.Ta)}
            RH={parseFloat(state.RH)}
            result={result}
          />
        </>
      ) : (
        <div style={{
          backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: 24, textAlign: 'center',
        }}>
          <p style={{ fontSize: 13, color: C.text, margin: 0 }}>
            외기 온도 · 관내 온도 · 상대습도를 입력하면 결과가 표시됩니다.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        {onSave && <SaveBtn onClick={onSave} enabled={canSave} />}
        <button
          onClick={handleHtmlExport}
          disabled={!result}
          title="편집 가능한 HTML 산출서 파일 다운로드"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 16px', fontSize: 13, fontWeight: 500,
            color: result ? C.textDark : 'var(--text-quaternary)',
            backgroundColor: C.surface,
            border: `1px solid ${result ? C.borderInput : C.border}`,
            borderRadius: 8,
            cursor: result ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
          }}
        >
          <FileDown size={14} /> HTML 산출서
        </button>
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
    </div>
  );
}

function ResultPanel({ result }: { result: ReturnType<typeof calculate> }) {
  if (!result) return null;
  const { d_recommended_mm, grade, warnings } = result;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{
        background: gradeBg(grade), border: `1px solid ${gradeColor(grade)}`,
        borderLeft: `4px solid ${gradeColor(grade)}`,
        borderRadius: 8, padding: '14px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, color: C.text, marginBottom: 2,
            textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            결로 위험 등급
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: gradeColor(grade) }}>
            {grade}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: C.text, marginBottom: 2 }}>추천 시판 두께</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.heading }}>
            {d_recommended_mm != null ? `${d_recommended_mm} mm` : '50 mm 초과'}
          </div>
        </div>
      </div>

      {warnings.length > 0 && (
        <div style={{
          backgroundColor: 'var(--state-warn-bg)',
          border: '1px solid var(--state-warn-text)',
          borderLeft: '3px solid var(--state-warn)',
          borderRadius: 6, padding: '10px 14px',
        }}>
          {warnings.map((w, i) => (
            <div key={i} style={{
              fontSize: 12, color: C.warn, lineHeight: 1.55,
              display: 'flex', gap: 6, alignItems: 'flex-start',
              marginTop: i === 0 ? 0 : 4,
            }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function gradeColor(g: Grade): string {
  if (g === '안전') return 'var(--state-success-text)';
  if (g === '주의') return 'var(--state-warn-text)';
  return 'var(--state-error-text)';
}
function gradeBg(g: Grade): string {
  if (g === '안전') return 'var(--state-success-bg)';
  if (g === '주의') return 'var(--state-warn-bg)';
  return 'var(--state-error-bg)';
}

function FieldSelect({
  label, value, onChange, children,
}: {
  label: React.ReactNode; value: number; onChange: (v: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ ...inputStyle, borderColor: C.borderInput }}
        onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
        onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
      >
        {children}
      </select>
    </div>
  );
}

function FieldNumber({
  label, value, onChange, hint,
}: {
  label: React.ReactNode; value: string; onChange: (v: string) => void; hint?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="number" value={value} onChange={e => onChange(e.target.value)}
        step="any"
        style={{ ...inputStyle, borderColor: C.borderInput }}
        onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
        onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
      />
      {hint && (
        <p style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 4, paddingLeft: 2 }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
      backgroundColor: 'var(--state-error-bg)', border: '1px solid var(--state-error-text)',
      borderLeft: '3px solid var(--state-error)',
      borderRadius: 6, color: 'var(--state-error-text)', fontSize: 13,
    }}>
      <AlertTriangle size={16} />
      <span>{message}</span>
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
