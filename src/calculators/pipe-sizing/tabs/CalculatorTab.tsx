// 관경 계산기 — 계산 탭

import { useMemo, useState } from 'react';
import { RotateCcw, Printer, Download, AlertTriangle, Save, Check, FileText, ArrowRight } from 'lucide-react';
import Frac from '../../../components/Frac';
import FormulaSection from '../../../components/FormulaSection';
import UnitPanel from '../../../components/UnitPanel';
import {
  FLOW_UNITS, type FlowUnitKey,
  PRESSURE_UNITS, type PressureUnitKey,
} from '../../pipe-friction/units';
import { flowRegime } from '../../pipe-friction/analysis';
import { fMethodLabel } from '../../pipe-friction/interpret.ts';
import {
  PIPE_SIZE_MATERIALS, type PipeMaterialSize,
} from '../../../data/pipeSizes';
import { PIPE_CONDITIONS, type PipeCondition } from '../../../data/pipeRoughness.ts';
import {
  pfFluidMeta, PF_PRESSURE_MIN_MMHG, PF_PRESSURE_MAX_MMHG,
} from '../../../data/fluidProperties.ts';
import {
  sizingTable, selectPipeSize, validateSizingInput,
  type SizingRow, type SizingConditions, type SizingFluid,
} from '../calc';
import {
  displayToMmAq, mmAqToDisplay, convertFlowToLpm,
} from '../units';
import { SizingDetailTable } from './ResultPanel';
import AnalysisBlock from './AnalysisBlock';
import StickyResults from './StickyResults';
import { downloadCsv, downloadWordFile, printHtmlReport } from '../../../utils/exportUtils';
import { useInitialAction } from '../../../utils/useInitialAction';
import { buildPipeSizingReportHtml } from '../htmlReport';
import { C, inputStyle, labelStyle, PA_PER_MM_AQ } from '../styles';

// 체이닝 전달값 강조 — 연한 보라색
const CHAIN_BG = 'rgba(147, 51, 234, 0.10)';
const CHAIN_BORDER = 'rgba(147, 51, 234, 0.55)';
const CHAIN_TEXT = 'var(--text-secondary)';

interface Props {
  Q: string; dP: string;
  setQ: (v: string) => void; setDP: (v: string) => void;
  matIdx: number; setMatIdx: (i: number) => void;
  fluid: SizingFluid; setFluid: (f: SizingFluid) => void;
  tempC: string; setTempC: (v: string) => void;
  pressureMmHg: string; setPressureMmHg: (v: string) => void;
  condition: PipeCondition; setCondition: (c: PipeCondition) => void;
  epsStr: string; setEpsStr: (v: string) => void;
  epsDefault: string;
  cond: SizingConditions | null;
  flowUnit: FlowUnitKey; setFlowUnit: (u: FlowUnitKey) => void;
  pressureUnit: PressureUnitKey; setPressureUnit: (u: PressureUnitKey) => void;
  onReset: () => void;
  onSave?: () => void;
  canSave?: boolean;
  chainedFrom?: string;
  initialAction?: string;              // 기록 ⋯ 메뉴 진입 시 1회 실행 (csv·word·pdf)
  onInitialActionDone?: () => void;
}

export default function CalculatorTab({
  Q, dP, setQ, setDP,
  matIdx, setMatIdx,
  fluid, setFluid,
  tempC, setTempC, pressureMmHg, setPressureMmHg, condition, setCondition,
  epsStr, setEpsStr, epsDefault, cond,
  flowUnit, setFlowUnit, pressureUnit, setPressureUnit, onReset,
  onSave, canSave, chainedFrom, initialAction, onInitialActionDone,
}: Props) {
  const mat = PIPE_SIZE_MATERIALS[matIdx];
  const pressDef = PRESSURE_UNITS.find(u => u.key === pressureUnit)!;
  const flowUnitLabel = FLOW_UNITS.find(u => u.key === flowUnit)?.label ?? '';
  const epsEdited = epsStr.trim() !== epsDefault;
  const fluidMeta = pfFluidMeta(fluid);
  const fluidLabel = fluid === 'air' ? '공기' : '물';

  // 체이닝 전달값 강조(연보라) — 해당 칸을 직접 수정하거나 초기화하면 해제
  const [hlQ, setHlQ] = useState<boolean>(!!chainedFrom);
  const [hlDP, setHlDP] = useState<boolean>(!!chainedFrom);
  const handleQChange = (v: string) => { if (hlQ) setHlQ(false); setQ(v); };
  const handleDPChange = (v: string) => { if (hlDP) setHlDP(false); setDP(v); };
  const handleReset = () => { setHlQ(false); setHlDP(false); onReset(); };

  const result = useMemo(() => {
    const Q_lpm = convertFlowToLpm(Q, flowUnit);
    const dP_display = parseFloat(dP);
    const allowable_mmAq = displayToMmAq(dP_display, pressureUnit);

    const err = (Q || dP) ? validateSizingInput(Q_lpm, allowable_mmAq, parseFloat(tempC), parseFloat(epsStr), fluid) : null;
    if (err) return { error: err };

    if (!cond || !Number.isFinite(Q_lpm) || !Number.isFinite(allowable_mmAq)) return null;

    const rows = sizingTable(Q_lpm, allowable_mmAq, mat, cond);
    const selected = selectPipeSize(Q_lpm, allowable_mmAq, mat, cond);

    let analysis: { V: number; Re: number; unitLoss_Pa: number } | null = null;
    if (selected) {
      analysis = {
        V: selected.v_ms,
        Re: selected.Re,
        unitLoss_Pa: selected.dropPerM_mmAqPerM * PA_PER_MM_AQ,
      };
    }

    return { rows, selected, analysis };
  }, [Q, dP, flowUnit, pressureUnit, mat, cond, tempC, epsStr, fluid]);

  const inputErr = result && 'error' in result ? result.error : null;
  const ok = result && !('error' in result) ? result : null;
  const noSolution = ok !== null && !ok.selected;

  // 기록 ⋯ 메뉴 진입 액션 — 결과 준비 후 1회 자동 실행
  useInitialAction(initialAction, !!ok?.selected, a => {
    if (!ok?.selected) return;
    if (a === 'csv') handleSizingCsvExport(ok.selected, ok.rows ?? [], ok.analysis ?? null, mat, Q, dP, flowUnit, pressDef, tempC, condition, epsStr, fluid, pressureMmHg);
    else if (a === 'word') handleSizingWordSave(ok.selected, ok.rows ?? [], ok.analysis ?? null, mat, Q, dP, flowUnit, pressureUnit, tempC, condition, epsStr, fluid, pressureMmHg);
    else if (a === 'pdf') handleSizingPdfPrint(ok.selected, ok.rows ?? [], ok.analysis ?? null, mat, Q, dP, flowUnit, pressureUnit, tempC, condition, epsStr, fluid, pressureMmHg);
  }, onInitialActionDone);

  return (
    <div className="calc-workspace" style={{ display: 'flex', minHeight: 0, gap: 0 }}>
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20, paddingRight: 8 }}>
      {chainedFrom === 'pipe-friction' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', fontSize: 13, lineHeight: 1.5,
          color: CHAIN_TEXT, backgroundColor: CHAIN_BG,
          border: `1px solid ${CHAIN_BORDER}`, borderRadius: 8,
        }}>
          <ArrowRight size={15} style={{ flexShrink: 0 }} />
          <span>마찰손실 계산기에서 전달된 <b>유량·마찰손실(ΔP/L)</b> 값입니다 (연보라 표시). 이 조건에 맞는 적정 관경을 역산출합니다.</span>
        </div>
      )}
      {/* 유체·재질·온도·(압력)·상태·조도 — 계산 조건 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <div>
          <label style={labelStyle}>유체 종류</label>
          <select
            value={fluid}
            onChange={e => setFluid(e.target.value as SizingFluid)}
            style={inputStyle}
          >
            <option value="water">물</option>
            <option value="air">공기</option>
          </select>
          <p style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 4, paddingLeft: 2 }}>
            {fluid === 'air' ? '이상기체 ν·ρ (온도·압력 반영)' : '온도별 ν·ρ 물성표 적용'}
          </p>
        </div>
        <div style={{ position: 'relative' }}>
          <label style={labelStyle}>배관 재질</label>
          <select
            value={matIdx}
            onChange={e => setMatIdx(Number(e.target.value))}
            style={{
              ...inputStyle,
              borderColor: C.borderInput,
            }}
            onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
            onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}
          >
            {PIPE_SIZE_MATERIALS.map((m, i) => (
              <option key={m.id} value={i}>
                {m.nameKo}{m.abbreviation ? ` (${m.abbreviation})` : ''}
              </option>
            ))}
          </select>
          <p style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 4, paddingLeft: 2 }}>
            {mat.description} · {mat.sizes[0].nominalA}A ~ {mat.sizes[mat.sizes.length - 1].nominalA}A
          </p>
        </div>
        <div>
          <label style={labelStyle}>{fluidLabel} 온도 (°C)</label>
          <input
            type="number" step="any" value={tempC}
            onChange={e => setTempC(e.target.value)}
            style={inputStyle}
          />
          <p style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 4, paddingLeft: 2 }}>
            {fluidMeta.tempMin}~{fluidMeta.tempMax}°C · ν·ρ 물성표 선형보간 자동 적용
          </p>
        </div>
        {fluid === 'air' && (
          <div>
            <label style={labelStyle}>압력 (mmHg)</label>
            <input
              type="number" step="any" value={pressureMmHg}
              onChange={e => setPressureMmHg(e.target.value)}
              style={inputStyle}
            />
            <p style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 4, paddingLeft: 2 }}>
              기본 760 (1atm) · 유효 {PF_PRESSURE_MIN_MMHG}~{PF_PRESSURE_MAX_MMHG} · ρ·ν에 반영
            </p>
          </div>
        )}
        <div>
          <label style={labelStyle}>배관 상태</label>
          <select
            value={condition}
            onChange={e => setCondition(e.target.value as PipeCondition)}
            style={inputStyle}
          >
            {PIPE_CONDITIONS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <p style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 4, paddingLeft: 2 }}>
            ε 기본값 선택 (내식 재질은 노후=신관)
          </p>
        </div>
        <div>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>절대조도 ε (mm)</span>
            {epsEdited && (
              <span style={{
                fontSize: 10, fontWeight: 600, color: 'var(--state-warn-text)',
                backgroundColor: 'var(--state-warn-bg)',
                padding: '1px 6px', borderRadius: 999, textTransform: 'none',
              }}>수정됨</span>
            )}
          </label>
          <input
            type="number" min="0" step="any" value={epsStr}
            onChange={e => setEpsStr(e.target.value)}
            style={inputStyle}
          />
          <p style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 4, paddingLeft: 2 }}>
            기본값 {epsDefault} — 수정 시 수정값으로 계산
          </p>
        </div>
      </div>

      <UnitPanel
        flowOptions={FLOW_UNITS.map(u => ({ key: u.key, label: u.label }))}
        flowValue={flowUnit}
        onFlowChange={v => setFlowUnit(v as FlowUnitKey)}
        pressureOptions={PRESSURE_UNITS.map(u => ({ key: u.key, label: u.label }))}
        pressureValue={pressureUnit}
        onPressureChange={v => setPressureUnit(v as PressureUnitKey)}
      />

      <FormulaSection title="마찰손실 (Darcy-Weisbach + 영역별 마찰계수)">
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <span>ΔP/L</span><span>=</span>
          <span>ρ(T) · g ·</span>
          <Frac
            n={<>f · V²</>}
            d={<>D · 2g</>}
          />
          <span style={{ marginLeft: 8, color: C.text, fontSize: 12 }}>[Pa/m]</span>
        </div>
        <p style={{ fontSize: 11, color: C.text, margin: '6px 0 0 0' }}>
          f: 유동 영역별 자동 — 층류 64/Re · 천이(2,300~4,000) 3차 보간 · 난류 Colebrook-White 반복해 · Re = V·D/ν(T)
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-quaternary)', margin: '2px 0 12px 0' }}>
          관마찰손실 계산기와 동일 엔진 (ε: Moody·ASHRAE Ch.22·NFPA 13·KDS 57 / 물성: {fluid === 'air' ? '공기 ν·ρ 이상기체·압력 반영' : '물 ν표·NIST ρ'})
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          <FieldNumber
            label={<>유량 Q <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>({flowUnitLabel})</span></>}
            value={Q} onChange={handleQChange} highlight={hlQ}
          />
          <FieldNumber
            label={<>허용 압력강하 ΔP/L <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>({pressDef.label}/m)</span></>}
            value={dP} onChange={handleDPChange} highlight={hlDP}
          />
        </div>
      </FormulaSection>

      {inputErr ? (
        <ErrorBanner message={inputErr.message} />
      ) : ok ? (
        <>
          {ok.analysis && ok.selected && (
            <AnalysisBlock
              V={ok.analysis.V}
              Re={ok.analysis.Re}
              unitLoss_Pa={ok.analysis.unitLoss_Pa}
              fluid={fluid}
              variant="secondary"
            />
          )}

          {ok.rows && (
            <details style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px' }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.textDark }}>
                관경별 상세 결과 보기
              </summary>
              <SizingDetailTable rows={ok.rows} selected={ok.selected ?? null} pressureUnit={pressureUnit} />
            </details>
          )}
        </>
      ) : null}

      <ActionBar
        className="calc-actions calc-actions-desktop"
        onSave={onSave} canSave={canSave}
        canExport={!!ok?.selected}
        onCsv={() => ok?.selected && handleSizingCsvExport(ok.selected, ok.rows ?? [], ok.analysis ?? null, mat, Q, dP, flowUnit, pressDef, tempC, condition, epsStr, fluid, pressureMmHg)}
        onWord={() => ok?.selected && handleSizingWordSave(ok.selected, ok.rows ?? [], ok.analysis ?? null, mat, Q, dP, flowUnit, pressureUnit, tempC, condition, epsStr, fluid, pressureMmHg)}
        onPdf={() => ok?.selected && handleSizingPdfPrint(ok.selected, ok.rows ?? [], ok.analysis ?? null, mat, Q, dP, flowUnit, pressureUnit, tempC, condition, epsStr, fluid, pressureMmHg)}
        onReset={handleReset}
      />
      </main>
      <StickyResults
        selected={ok?.selected ?? null}
        noSolution={noSolution}
        mat={mat}
        pressureUnit={pressureUnit}
        fluid={fluid}
      />
      <ActionBar
        className="calc-actions calc-actions-mobile"
        onSave={onSave} canSave={canSave}
        canExport={!!ok?.selected}
        onCsv={() => ok?.selected && handleSizingCsvExport(ok.selected, ok.rows ?? [], ok.analysis ?? null, mat, Q, dP, flowUnit, pressDef, tempC, condition, epsStr, fluid, pressureMmHg)}
        onWord={() => ok?.selected && handleSizingWordSave(ok.selected, ok.rows ?? [], ok.analysis ?? null, mat, Q, dP, flowUnit, pressureUnit, tempC, condition, epsStr, fluid, pressureMmHg)}
        onPdf={() => ok?.selected && handleSizingPdfPrint(ok.selected, ok.rows ?? [], ok.analysis ?? null, mat, Q, dP, flowUnit, pressureUnit, tempC, condition, epsStr, fluid, pressureMmHg)}
        onReset={handleReset}
      />
    </div>
  );
}

function buildSizingHtml(
  selected: SizingRow,
  rows: SizingRow[],
  analysis: { V: number; Re: number; unitLoss_Pa: number } | null,
  mat: PipeMaterialSize,
  Q: string, dP: string,
  flowUnit: FlowUnitKey, pressureUnit: PressureUnitKey,
  tempC: string, condition: PipeCondition, epsStr: string,
  fluid: SizingFluid, pressureMmHg: string,
): string {
  return buildPipeSizingReportHtml({
    selected, rows, analysis, mat, Q, dP, flowUnit, pressureUnit,
    tempC, condLabel: condition === 'new' ? '신관' : '노후', epsStr,
    fluid, pressureMmHg,
  });
}

function handleSizingWordSave(
  selected: SizingRow,
  rows: SizingRow[],
  analysis: { V: number; Re: number; unitLoss_Pa: number } | null,
  mat: PipeMaterialSize,
  Q: string, dP: string,
  flowUnit: FlowUnitKey, pressureUnit: PressureUnitKey,
  tempC: string, condition: PipeCondition, epsStr: string,
  fluid: SizingFluid, pressureMmHg: string,
) {
  const html = buildSizingHtml(selected, rows, analysis, mat, Q, dP, flowUnit, pressureUnit, tempC, condition, epsStr, fluid, pressureMmHg);
  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  downloadWordFile(`pipe-sizing_${ts}.doc`, html);
}

function handleSizingPdfPrint(
  selected: SizingRow,
  rows: SizingRow[],
  analysis: { V: number; Re: number; unitLoss_Pa: number } | null,
  mat: PipeMaterialSize,
  Q: string, dP: string,
  flowUnit: FlowUnitKey, pressureUnit: PressureUnitKey,
  tempC: string, condition: PipeCondition, epsStr: string,
  fluid: SizingFluid, pressureMmHg: string,
) {
  const html = buildSizingHtml(selected, rows, analysis, mat, Q, dP, flowUnit, pressureUnit, tempC, condition, epsStr, fluid, pressureMmHg);
  printHtmlReport(html);
}

function ActionBar({
  className, onSave, canSave, canExport, onCsv, onWord, onPdf, onReset,
}: {
  className: string;
  onSave?: () => void; canSave?: boolean;
  canExport: boolean;
  onCsv: () => void; onWord: () => void; onPdf: () => void; onReset: () => void;
}) {
  return (
    <div
      className={className}
      style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}
    >
      {onSave && <SaveBtn onClick={onSave} enabled={!!canSave} />}
      <ActionBtn icon={<Download size={14} />} label="CSV 내보내기"
        enabled={canExport} onClick={onCsv} />
      <ActionBtn icon={<FileText size={14} />} label="Word로 저장"
        enabled={canExport} onClick={onWord}
        title="PDF 산출서와 동일한 양식의 Word(.doc) 파일 다운로드" />
      <ActionBtn icon={<Printer size={14} />} label="PDF로 저장"
        enabled={canExport} onClick={onPdf}
        title="인쇄 다이얼로그에서 '대상: PDF로 저장' 선택" />
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
  label, value, onChange, min = '0', max, highlight,
}: {
  label: React.ReactNode; value: string; onChange: (v: string) => void;
  min?: string; max?: string; highlight?: boolean;
}) {
  const baseBorder = highlight ? CHAIN_BORDER : C.borderInput;
  return (
    <div style={{ position: 'relative' }}>
      <label style={labelStyle}>{label}</label>
      <input
        type="number" value={value} onChange={e => onChange(e.target.value)}
        min={min} max={max} step="any"
        style={{
          ...inputStyle,
          borderColor: baseBorder,
          backgroundColor: highlight ? CHAIN_BG : inputStyle.backgroundColor,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
        onBlur={e => { e.currentTarget.style.borderColor = baseBorder; }}
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

function handleSizingCsvExport(
  selected: SizingRow,
  rows: SizingRow[],
  analysis: { V: number; Re: number; unitLoss_Pa: number } | null,
  mat: PipeMaterialSize,
  Q: string, dP: string,
  flowUnit: FlowUnitKey,
  pressDef: typeof PRESSURE_UNITS[number],
  tempC: string, condition: PipeCondition, epsStr: string,
  fluid: SizingFluid, pressureMmHg: string,
) {
  const flowLabel = FLOW_UNITS.find(u => u.key === flowUnit)?.label ?? '';
  const drop_display = mmAqToDisplay(selected.dropPerM_mmAqPerM, pressDef.key);
  const condLabel = condition === 'new' ? '신관' : '노후';
  const fluidLabel = fluid === 'air' ? '공기' : '물';

  const data: (string | number)[][] = [
    ['항목', '값', '단위', '비고'],
    ['계산기', '관경 선정 (Darcy-Weisbach + 영역별 마찰계수)', '', ''],
    ['유체', fluidLabel, '', fluid === 'air' ? '이상기체 ν·ρ' : 'ν·ρ 물성표'],
    ['배관 재질', `${mat.nameKo} (${condLabel})`, '', `ε=${epsStr} mm`],
    [`${fluidLabel} 온도`, tempC, '°C', 'ν·ρ 물성표 보간'],
    ...(fluid === 'air' ? [['압력', pressureMmHg, 'mmHg', 'ρ·ν 압력 반영']] as (string | number)[][] : []),
    ['유량 Q', Q, flowLabel, ''],
    ['허용 압력강하 ΔP/L', dP, `${pressDef.label}/m`, ''],
    ['', '', '', ''],
    ['선정 관경', `${selected.size.nominalA}A`, '', `ID ${selected.size.id_mm.toFixed(1)} mm`],
    ['선정 관경 유속 V', selected.v_ms.toFixed(3), 'm/s', ''],
    ['선정 관경 단위손실', drop_display.toFixed(pressDef.dp), `${pressDef.label}/m`, ''],
    ['선정 관경 마찰계수 f', selected.f.toFixed(6), '-', fMethodLabel(selected.fMethod)],
  ];

  if (analysis) {
    data.push(['선정 관경 Re', analysis.Re.toFixed(0), '-', flowRegime(analysis.Re).label]);
  }

  data.push(['', '', '', '']);
  data.push(['-- 관경별 상세 --', '', '', '']);
  data.push(['호칭', '내경(mm)', '유속(m/s)', `단위손실(${pressDef.label}/m)`]);
  for (const r of rows) {
    const drop = mmAqToDisplay(r.dropPerM_mmAqPerM, pressDef.key);
    data.push([
      `${r.size.nominalA}A`,
      r.size.id_mm.toFixed(1),
      r.v_ms.toFixed(2),
      drop.toFixed(pressDef.dp),
    ]);
  }

  const ts = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  downloadCsv(`pipe-sizing_${ts}.csv`, data);
}
