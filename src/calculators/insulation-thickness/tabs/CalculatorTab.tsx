// 냉수배관 보온 두께 계산기 — 계산 탭

import { useMemo, useState } from 'react';
import { RotateCcw, AlertTriangle, ChevronDown } from 'lucide-react';
import ExportMenu from '../../../components/ExportMenu';
import {
  PIPE_OD_TABLE, INSULATION_MATERIALS,
  calculate, validate, type InsulationInputs,
} from '../calc';
import { buildInsulationReportHtml } from '../htmlReport';
import { downloadCsv, downloadWordFile, printHtmlReport } from '../../../utils/exportUtils';
import { useInitialAction } from '../../../utils/useInitialAction';
import { C, inputStyle, labelStyle } from '../styles';
import InsulationVisuals from './InsulationVisuals';
import StickyResults from './StickyResults';

interface Props {
  state: InsulationInputs;
  setState: (patch: Partial<InsulationInputs>) => void;
  onReset: () => void;
  initialAction?: string;              // 기록 ⋯ 메뉴 진입 시 1회 실행 (csv·word·pdf)
  onInitialActionDone?: () => void;
}

export default function CalculatorTab({ state, setState, onReset, initialAction, onInitialActionDone }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const validationErr = useMemo(() => {
    const allEmpty = !state.Ta && !state.Ti && !state.RH;
    if (allEmpty) return null;
    return validate(state);
  }, [state]);

  const result = useMemo(() => calculate(state), [state]);

  const mat = INSULATION_MATERIALS[state.matIdx];
  const isCustomK = mat?.id === 'custom';

  function buildHtml(): string | null {
    if (!result) return null;
    const pipe = PIPE_OD_TABLE[state.pipeIdx];
    const k = isCustomK ? parseFloat(state.customK) : (mat.k as number);
    return buildInsulationReportHtml({
      pipe, mat, k, inputs: state, result,
    });
  }

  function handleWordSave() {
    const html = buildHtml();
    if (!html) return;
    const pipe = PIPE_OD_TABLE[state.pipeIdx];
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadWordFile(`insulation-${pipe.nominalA}A_${ts}.doc`, html);
  }

  function handlePdfPrint() {
    const html = buildHtml();
    if (!html) return;
    printHtmlReport(html);
  }

  function handleCsvExport() {
    if (!result) return;
    const pipe = PIPE_OD_TABLE[state.pipeIdx];
    const k = isCustomK ? parseFloat(state.customK) : (mat.k as number);
    const rows: (string | number)[][] = [
      ['항목', '값', '단위', '비고'],
      ['계산기', '보온재 선정 계산기', '', ''],
      ['관경 (호칭)', `${pipe.nominalA}A`, '', `외경 ${pipe.od_mm.toFixed(1)} mm`],
      ['보온재', mat.nameKo, '', `k = ${k} W/(m·K)`],
      ['외기 온도 Tₐ', state.Ta, '°C', ''],
      ['관내 유체 온도 Tᵢ', state.Ti, '°C', ''],
      ['상대습도 RH', state.RH, '%', ''],
      ['표면 열전달률 hₒ', state.ho, 'W/(m²·K)', '자연대류 실내 표준'],
      ['안전계수 SF', state.safetyFactor, '배수', ''],
      ['', '', '', ''],
      ['노점 온도 Tᴅ', Number.isFinite(result.Td) ? result.Td.toFixed(2) : '', '°C', 'Magnus 식'],
      ['한계 두께 d', Number.isFinite(result.d_mm) ? result.d_mm.toFixed(2) : '', 'mm', 'Tˢ = Tᴅ 되는 이론 최소'],
      ['안전 두께 (× SF)', Number.isFinite(result.d_safe_mm) ? result.d_safe_mm.toFixed(2) : '', 'mm', `한계 × ${state.safetyFactor}`],
      ['추천 시판 두께', result.d_recommended_mm != null ? result.d_recommended_mm : '50 mm 초과', 'mm', '시판 라인업 [13·19·25·32·38·50]'],
      ['시공 후 표면 온도 Tˢ', result.Ts != null ? result.Ts.toFixed(2) : '', '°C', '추천 두께 적용 시 검산'],
      ['노점 대비 여유', result.margin != null ? result.margin.toFixed(2) : '', '°C', `등급 「${result.grade}」`],
    ];
    const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadCsv(`insulation-${pipe.nominalA}A_${ts}.csv`, rows);
  }

  // 기록 ⋯ 메뉴 진입 액션 — 결과 준비 후 1회 자동 실행
  useInitialAction(initialAction, !!result, a => {
    if (a === 'csv') handleCsvExport();
    else if (a === 'word') handleWordSave();
    else if (a === 'pdf') handlePdfPrint();
  }, onInitialActionDone);

  return (
    <div className="calc-workspace" style={{ display: 'flex', minHeight: 0, gap: 0 }}>
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20, paddingRight: 8 }}>
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
          <InsulationVisuals
            pipe={PIPE_OD_TABLE[state.pipeIdx]}
            k={isCustomK ? parseFloat(state.customK) : (mat.k as number)}
            ho={parseFloat(state.ho)}
            Ti={parseFloat(state.Ti)}
            Ta={parseFloat(state.Ta)}
            RH={parseFloat(state.RH)}
            result={result}
          />
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-quaternary)', margin: 0, padding: '8px 2px' }}>
            외기 온도 · 관내 온도 · 상대습도를 입력하면 결과가 표시됩니다.
          </p>
        )}

        <ActionBar
          className="calc-actions calc-actions-desktop"
          canExport={!!result}
          onCsv={handleCsvExport}
          onWord={handleWordSave}
          onPdf={handlePdfPrint}
          onReset={onReset}
        />
      </main>

      <StickyResults
        result={validationErr ? null : result}
        Ta={parseFloat(state.Ta)}
        RH={parseFloat(state.RH)}
      />

      <ActionBar
        className="calc-actions calc-actions-mobile"
        canExport={!!result}
        onCsv={handleCsvExport}
        onWord={handleWordSave}
        onPdf={handlePdfPrint}
        onReset={onReset}
      />
    </div>
  );
}

function ActionBar({
  className, canExport, onCsv, onWord, onPdf, onReset,
}: {
  className: string;
  canExport: boolean;
  onCsv: () => void; onWord: () => void; onPdf: () => void; onReset: () => void;
}) {
  return (
    <div
      className={className}
      style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}
    >
      <ExportMenu enabled={canExport} onCsv={onCsv} onWord={onWord} onPdf={onPdf} />
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
  );
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

