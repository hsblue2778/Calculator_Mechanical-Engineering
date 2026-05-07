// 관경 계산기 — 계산 탭

import { useMemo, useState } from 'react';
import { RotateCcw, Printer, Download, AlertTriangle, Save, Check } from 'lucide-react';
import Frac from '../../../components/Frac';
import FormulaSection from '../../../components/FormulaSection';
import UnitPanel from '../../../components/UnitPanel';
import {
  FLOW_UNITS, type FlowUnitKey,
  PRESSURE_UNITS, type PressureUnitKey,
} from '../../pipe-friction/units';
import { NU } from '../../pipe-friction/calc';
import { flowRegime } from '../../pipe-friction/analysis';
import {
  PIPE_SIZE_MATERIALS, type PipeMaterialSize,
} from '../../../data/pipeSizes';
import {
  sizingTable, selectPipeSize, validateSizingInput, type SizingRow,
} from '../calc';
import {
  displayToMmAq, mmAqToDisplay, convertFlowToLpm,
} from '../units';
import { SizingDetailTable } from './ResultPanel';
import AnalysisBlock from './AnalysisBlock';
import StickyResults from './StickyResults';
import { downloadCsv, printToPdf } from '../../../utils/exportUtils';
import { C, inputStyle, labelStyle, PA_PER_MM_AQ } from '../styles';
import PrintReport from '../../../components/PrintReport';
import PrintReportContent from '../PrintReportContent';

interface Props {
  Q: string; dP: string;
  setQ: (v: string) => void; setDP: (v: string) => void;
  matIdx: number; setMatIdx: (i: number) => void;
  flowUnit: FlowUnitKey; setFlowUnit: (u: FlowUnitKey) => void;
  pressureUnit: PressureUnitKey; setPressureUnit: (u: PressureUnitKey) => void;
  onReset: () => void;
  onSave?: () => void;
  canSave?: boolean;
}

export default function CalculatorTab({
  Q, dP, setQ, setDP,
  matIdx, setMatIdx,
  flowUnit, setFlowUnit, pressureUnit, setPressureUnit, onReset,
  onSave, canSave,
}: Props) {
  const mat = PIPE_SIZE_MATERIALS[matIdx];
  const pressDef = PRESSURE_UNITS.find(u => u.key === pressureUnit)!;
  const flowUnitLabel = FLOW_UNITS.find(u => u.key === flowUnit)?.label ?? '';

  const result = useMemo(() => {
    const Q_lpm = convertFlowToLpm(Q, flowUnit);
    const dP_display = parseFloat(dP);
    const allowable_mmAq = displayToMmAq(dP_display, pressureUnit);

    const err = (Q || dP) ? validateSizingInput(Q_lpm, allowable_mmAq) : null;
    if (err) return { error: err };

    if (!Number.isFinite(Q_lpm) || !Number.isFinite(allowable_mmAq)) return null;

    const rows = sizingTable(Q_lpm, allowable_mmAq, mat);
    const selected = selectPipeSize(Q_lpm, allowable_mmAq, mat);

    let analysis: { V: number; Re: number; unitLoss_Pa: number } | null = null;
    if (selected) {
      const V = selected.v_ms;
      const D_m = selected.size.id_mm / 1000;
      const Re = V * D_m / NU;
      const unitLoss_Pa = selected.dropPerM_mmAqPerM * PA_PER_MM_AQ;
      analysis = { V, Re, unitLoss_Pa };
    }

    return { rows, selected, analysis };
  }, [Q, dP, flowUnit, pressureUnit, mat]);

  const inputErr = result && 'error' in result ? result.error : null;
  const ok = result && !('error' in result) ? result : null;
  const noSolution = ok !== null && !ok.selected;

  return (
    <div className="calc-workspace" style={{ display: 'flex', minHeight: 0, gap: 0 }}>
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20, paddingRight: 8 }}>
      {/* 재질 선택 — 단독 한 줄 */}
      <div>
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
                {m.nameKo}{m.abbreviation ? ` (${m.abbreviation})` : ''} — f = {m.frictionFactor}
              </option>
            ))}
          </select>
          <p style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 4, paddingLeft: 2 }}>
            {mat.description} · {mat.sizes[0].nominalA}A ~ {mat.sizes[mat.sizes.length - 1].nominalA}A
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

      <FormulaSection title="① 마찰손실 (Darcy-Weisbach)">
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <span>hf/L</span><span>=</span>
          <Frac
            n={<>8 · f · Q²</>}
            d={<>π² · g · D⁵</>}
          />
          <span>× 1000</span>
          <span style={{ marginLeft: 8, color: C.text, fontSize: 12 }}>[mmAq/m]</span>
        </div>
        <p style={{ fontSize: 11, color: C.text, margin: '6px 0 0 0' }}>
          f: 재질별 고정값 · Q [m³/s] = Q[LPM]/60,000 · D [m] = D[mm]/1,000 · g = 9.81 m/s²
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-quaternary)', margin: '2px 0 12px 0' }}>
          출처: 일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          <FieldNumber
            label={<>유량 Q <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>({flowUnitLabel})</span></>}
            value={Q} onChange={setQ}
          />
          <FieldNumber
            label={<>허용 압력강하 ΔP/L <span style={{ color: 'var(--text-quaternary)', fontWeight: 400 }}>({pressDef.label}/m)</span></>}
            value={dP} onChange={setDP}
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

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        {onSave && <SaveBtn onClick={onSave} enabled={!!canSave} />}
        <ActionBtn icon={<Download size={14} />} label="CSV 내보내기"
          enabled={!!ok?.selected}
          onClick={() => ok?.selected && handleSizingCsvExport(ok.selected, ok.rows ?? [], ok.analysis ?? null, mat, Q, dP, flowUnit, pressDef)} />
        <ActionBtn icon={<Printer size={14} />} label="PDF로 저장"
          enabled={!!ok?.selected}
          onClick={() => printToPdf('관경 선정 계산결과')}
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

      {ok?.selected && (
        <PrintReport title="관경 선정 계산결과">
          <PrintReportContent
            selected={ok.selected} rows={ok.rows ?? []} analysis={ok.analysis ?? null}
            mat={mat}
            Q={Q} dP={dP}
            flowUnit={flowUnit} pressureUnit={pressureUnit}
          />
        </PrintReport>
      )}
      </main>
      <StickyResults
        selected={ok?.selected ?? null}
        noSolution={noSolution}
        mat={mat}
        pressureUnit={pressureUnit}
      />
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
  label, value, onChange, min = '0', max,
}: {
  label: React.ReactNode; value: string; onChange: (v: string) => void;
  min?: string; max?: string;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <label style={labelStyle}>{label}</label>
      <input
        type="number" value={value} onChange={e => onChange(e.target.value)}
        min={min} max={max} step="any"
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

function handleSizingCsvExport(
  selected: SizingRow,
  rows: SizingRow[],
  analysis: { V: number; Re: number; unitLoss_Pa: number } | null,
  mat: PipeMaterialSize,
  Q: string, dP: string,
  flowUnit: FlowUnitKey,
  pressDef: typeof PRESSURE_UNITS[number],
) {
  const flowLabel = FLOW_UNITS.find(u => u.key === flowUnit)?.label ?? '';
  const drop_display = mmAqToDisplay(selected.dropPerM_mmAqPerM, pressDef.key);

  const data: (string | number)[][] = [
    ['항목', '값', '단위', '비고'],
    ['계산기', '관경 선정 (Darcy-Weisbach 정통)', '', ''],
    ['배관 재질', mat.nameKo, '', `f=${mat.frictionFactor}`],
    ['유량 Q', Q, flowLabel, ''],
    ['허용 압력강하 ΔP/L', dP, `${pressDef.label}/m`, ''],
    ['', '', '', ''],
    ['선정 관경', `${selected.size.nominalA}A`, '', `ID ${selected.size.id_mm.toFixed(1)} mm`],
    ['선정 관경 유속 V', selected.v_ms.toFixed(3), 'm/s', ''],
    ['선정 관경 단위손실', drop_display.toFixed(pressDef.dp), `${pressDef.label}/m`, ''],
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
