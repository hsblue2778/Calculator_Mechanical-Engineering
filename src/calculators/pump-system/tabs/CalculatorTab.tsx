// HVAC 펌프 시스템 — 계산 탭
// 섹션: 시스템기본조건(시스템모드포함) / 흡입측배관(다중) / 토출측배관(다중) /
//       부속류 / 장비류 / 정수두잔류압력 / 안전율프리셋 / 결과 / PDF

import { useId } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import ChainBanner from '../../../components/ChainBanner';
import { SaveBtn } from './FormComponents';
import { PipeMultiTable } from './PipeMultiTable';
import HeadPressureSection from './HeadPressureSection';
import SystemConditionSection from './SystemConditionSection';
import type { ScheduleId } from '../../../data/pipeSizes';
import type { PipeCondition } from '../../../data/pipeRoughness.ts';
import { FITTING_K_VALUES } from '../../../data/fitting-k-values';
import {
  FLOW_UNITS_PUMP, PRESSURE_UNITS_PUMP, POWER_UNITS,
  type FlowUnitPumpKey, type LengthUnitKey, type PressureUnitPumpKey, type PowerUnitKey,
} from '../units';
import { generatePumpCurveFamily, findOperatingPoint, type EquipKind, type SystemMode, type PumpCurveAtHz, type PumpHvacResult } from '../calc';
import type { PumpFieldConfig, FluidId } from '../configs/types';
import { C } from '../styles';
import { downloadCsv, downloadWordFile, printHtmlReport } from '../../../utils/exportUtils';
import { useInitialAction } from '../../../utils/useInitialAction';
import { buildPumpHvacReportHtml } from '../htmlReport/index';
import { buildPumpHvacCsvRows } from '../csvExport';
import ResultSection from './ResultSection';
import { FittingTable, EquipTable } from './FittingEquipTables';
import WorkspaceLayout from '../workspace/WorkspaceLayout';
import type { SectionItem } from '../workspace/SectionStepper';

// ── 공개 타입 ─────────────────────────────────────────────────────
export interface PipeRowState {
  uid: string;
  materialId: string;
  scheduleId: ScheduleId;   // 두께규격 (신규)
  nominalA: number;
  lStr: string;
  lUnit: LengthUnitKey;
}

export interface FittingRowState {
  uid: string;
  fittingId: string;
  pipeRefSide: 'suction' | 'discharge';
  pipeRefIndex: number;
  qty: number;
}

export interface EquipRowState {
  uid: string;
  name: string;
  dP: string;
  dPUnit: 'kPa' | 'mAq' | 'kgfcm2';
  pipeRefSide: 'suction' | 'discharge';
  pipeRefIndex: number;
  kind: EquipKind;        // 장비 종류 (기본 'other')
  dirtyMargin: boolean;   // 필터 Dirty 마진 적용 여부 (기본 false)
}

// 배관 참조 레이블 목록 생성 헬퍼 (드롭다운용)
export function buildPipeRefOptions(
  sucCount: number,
  disCount: number,
): { label: string; side: 'suction' | 'discharge'; index: number }[] {
  const opts: { label: string; side: 'suction' | 'discharge'; index: number }[] = [];
  for (let i = 0; i < sucCount; i++) opts.push({ label: `SP-${i + 1}`, side: 'suction', index: i });
  for (let i = 0; i < disCount; i++) opts.push({ label: `DP-${i + 1}`, side: 'discharge', index: i });
  return opts;
}

interface Props {
  fieldLabel: string;
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
  setFlowUnit: (v: FlowUnitPumpKey) => void;

  sucPipeRows: PipeRowState[];
  setSucPipeRows: (v: PipeRowState[]) => void;
  disPipeRows: PipeRowState[];
  setDisPipeRows: (v: PipeRowState[]) => void;
  pipeCondition: PipeCondition;
  setPipeCondition: (v: PipeCondition) => void;

  fittingRows: FittingRowState[];
  setFittingRows: (v: FittingRowState[]) => void;

  equipRows: EquipRowState[];
  setEquipRows: (v: EquipRowState[]) => void;

  HsStr: string;
  setHsStr: (v: string) => void;
  HdStr: string;
  setHdStr: (v: string) => void;
  PresStr: string;
  setPresStr: (v: string) => void;
  presUnit: PressureUnitPumpKey;
  setPresUnit: (v: PressureUnitPumpKey) => void;
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

  powerUnit: PowerUnitKey;
  setPowerUnit: (v: PowerUnitKey) => void;

  // 열부하 → 유량 보조 입력
  heatLoadStr: string;
  setHeatLoadStr: (v: string) => void;
  deltaTStr: string;
  setDeltaTStr: (v: string) => void;
  useHeatLoadCalc: boolean;
  setUseHeatLoadCalc: (v: boolean) => void;

  npshrStr: string;
  setNpshrStr: (v: string) => void;

  // 펌프 H-Q 곡선 (선택 입력)
  pumpCurveRows: { uid: string; qStr: string; hStr: string }[];
  setPumpCurveRows: (v: { uid: string; qStr: string; hStr: string }[]) => void;
  bepQStr: string;
  setBepQStr: (v: string) => void;

  // 인버터(VFD) 운전
  catalogHzStr: string;
  setCatalogHzStr: (v: string) => void;
  operatingHzList: number[];
  setOperatingHzList: (v: number[]) => void;

  // 부모(index.tsx)에서 단일 useMemo로 계산한 결과를 그대로 전달받는다.
  // 화면용·저장용 계산이 갈리지 않도록 내부에서 재계산하지 않는다.
  result: PumpHvacResult | null;

  onSave?: () => void;
  canSave?: boolean;
  chainedFrom?: string;                // 체이닝 수신 안내 배너 (계통 압력손실·관경 선정)
  initialAction?: string;              // 기록 ⋯ 메뉴 진입 시 1회 실행 (csv·word·pdf)
  onInitialActionDone?: () => void;
}

export default function CalculatorTab(props: Props) {
  const {
    fieldLabel, fieldConfig,
    systemMode, setSystemMode,
    fluid, setFluid, tempC, setTempC, Q, setQ, flowUnit, setFlowUnit,
    sucPipeRows, setSucPipeRows, disPipeRows, setDisPipeRows,
    pipeCondition, setPipeCondition,
    fittingRows, setFittingRows,
    equipRows, setEquipRows,
    HsStr, setHsStr, HdStr, setHdStr, PresStr, setPresStr, presUnit, setPresUnit,
    PatmStr, setPatmStr,
    headMarginStr, setHeadMarginStr, powerMarginStr, setPowerMarginStr,
    npshMarginStr, setNpshMarginStr, presetApplied, setPresetApplied,
    powerUnit, setPowerUnit,
    heatLoadStr, setHeatLoadStr,
    deltaTStr, setDeltaTStr,
    useHeatLoadCalc, setUseHeatLoadCalc,
    npshrStr, setNpshrStr,
    pumpCurveRows, setPumpCurveRows,
    bepQStr, setBepQStr,
    catalogHzStr, setCatalogHzStr,
    operatingHzList, setOperatingHzList,
    result,
    onSave, canSave,
    chainedFrom, initialAction, onInitialActionDone,
  } = props;

  const uid = useId();

  const Q_num = parseFloat(Q);
  const Q_m3s = Number.isFinite(Q_num) && Q_num > 0
    ? Q_num * (FLOW_UNITS_PUMP.find(u => u.key === flowUnit)?.toM3s ?? 0)
    : 0;

  // 결과(result)는 부모에서 계산해 prop으로 받음. headMargin/npshMargin 만
  // 표시·섹션 진행도 판단에 직접 쓰이므로 여기서 다시 파싱한다.
  const headMargin = parseFloat(headMarginStr);
  const npshMargin = parseFloat(npshMarginStr);

  const powerFactor = POWER_UNITS.find(u => u.key === powerUnit)?.fromW ?? (1 / 1000);

  // 부속 행 조작
  function addFittingRow() {
    const firstFitting = FITTING_K_VALUES[0];
    setFittingRows([...fittingRows, {
      uid: `${uid}-fit-${Date.now()}`,
      fittingId: firstFitting.id,
      pipeRefSide: 'discharge',
      pipeRefIndex: 0,
      qty: 1,
    }]);
  }
  function removeFittingRow(rowUid: string) {
    setFittingRows(fittingRows.filter(r => r.uid !== rowUid));
  }
  function updateFittingRow(rowUid: string, patch: Partial<FittingRowState>) {
    setFittingRows(fittingRows.map(r => r.uid === rowUid ? { ...r, ...patch } : r));
  }

  // 장비 행 조작
  function addEquipRow() {
    setEquipRows([...equipRows, {
      uid: `${uid}-eq-${Date.now()}`,
      name: '', dP: '', dPUnit: 'kPa',
      pipeRefSide: 'discharge', pipeRefIndex: 0,
      kind: 'other',
      dirtyMargin: false,
    }]);
  }
  function removeEquipRow(rowUid: string) {
    setEquipRows(equipRows.filter(r => r.uid !== rowUid));
  }
  function updateEquipRow(rowUid: string, patch: Partial<EquipRowState>) {
    setEquipRows(equipRows.map(r => r.uid === rowUid ? { ...r, ...patch } : r));
  }

  // 단위 변환 핸들러
  function handleFlowUnitChange(newUnit: FlowUnitPumpKey) {
    if (newUnit === flowUnit) return;
    const n = parseFloat(Q);
    if (Number.isFinite(n) && n > 0) {
      const oldFactor = FLOW_UNITS_PUMP.find(u => u.key === flowUnit)?.toM3s ?? 1;
      const newFactor = FLOW_UNITS_PUMP.find(u => u.key === newUnit)?.toM3s ?? 1;
      setQ(fmtNum(n * oldFactor / newFactor));
    }
    setFlowUnit(newUnit);
  }

  function handlePresUnitChange(newUnit: PressureUnitPumpKey) {
    if (newUnit === presUnit) return;
    const n = parseFloat(PresStr);
    if (Number.isFinite(n) && n >= 0) {
      const oldFactor = PRESSURE_UNITS_PUMP.find(x => x.key === presUnit)?.toPa ?? 1000;
      const newFactor = PRESSURE_UNITS_PUMP.find(x => x.key === newUnit)?.toPa ?? 1000;
      setPresStr(fmtNum(n * oldFactor / newFactor));
    }
    setPresUnit(newUnit);
  }

  // 배관 행 삭제 시 부속/장비 pipeRef 클램프 처리
  function handleSucPipeRowsChange(newRows: PipeRowState[]) {
    setSucPipeRows(newRows);
    const maxIdx = newRows.length - 1;
    // 흡입 참조 부속/장비 중 범위 벗어나면 0으로 클램프
    setFittingRows(fittingRows.map((r: FittingRowState) =>
      r.pipeRefSide === 'suction' && r.pipeRefIndex > maxIdx
        ? { ...r, pipeRefIndex: Math.max(0, maxIdx) }
        : r
    ));
    setEquipRows(equipRows.map((r: EquipRowState) =>
      r.pipeRefSide === 'suction' && r.pipeRefIndex > maxIdx
        ? { ...r, pipeRefIndex: Math.max(0, maxIdx) }
        : r
    ));
  }

  function handleDisPipeRowsChange(newRows: PipeRowState[]) {
    setDisPipeRows(newRows);
    const maxIdx = newRows.length - 1;
    setFittingRows(fittingRows.map((r: FittingRowState) =>
      r.pipeRefSide === 'discharge' && r.pipeRefIndex > maxIdx
        ? { ...r, pipeRefIndex: Math.max(0, maxIdx) }
        : r
    ));
    setEquipRows(equipRows.map((r: EquipRowState) =>
      r.pipeRefSide === 'discharge' && r.pipeRefIndex > maxIdx
        ? { ...r, pipeRefIndex: Math.max(0, maxIdx) }
        : r
    ));
  }

  // 펌프 H-Q 곡선 파싱
  const parsedPumpCurve: { Q_m3h: number; H_m: number }[] = pumpCurveRows
    .map(r => ({ Q_m3h: parseFloat(r.qStr), H_m: parseFloat(r.hStr) }))
    .filter(p => Number.isFinite(p.Q_m3h) && p.Q_m3h >= 0 && Number.isFinite(p.H_m) && p.H_m >= 0);

  const parsedBepQ: number | null = (() => {
    const v = parseFloat(bepQStr);
    return Number.isFinite(v) && v > 0 ? v : null;
  })();

  // 펌프 곡선·시스템 곡선 교점 (카탈로그 기준 Hz 단일 교점 — 하위 호환용)
  const operatingPoint = result && parsedPumpCurve.length >= 2
    ? findOperatingPoint(parsedPumpCurve, result.H_static_now_m, result.k_system)
    : null;

  // 인버터 운전 — 펌프 곡선 family (useMemo 없이 직접 계산: 입력 변경 시마다 갱신)
  const catalogHz = parseFloat(catalogHzStr);
  const validCatalogHz = Number.isFinite(catalogHz) && catalogHz > 0 ? catalogHz : 60;
  const pumpCurveFamily: PumpCurveAtHz[] = result && parsedPumpCurve.length >= 2 && operatingHzList.length > 0
    ? generatePumpCurveFamily(
        parsedPumpCurve,
        validCatalogHz,
        operatingHzList,
        result.H_static_now_m,
        result.k_system,
        result.rho,
        0.65,
        parsedBepQ,
      )
    : [];

  // 모드 플래그
  const isClosed = systemMode === 'closed';

  // 배관 참조 옵션 (드롭다운용)
  const pipeRefOptions = buildPipeRefOptions(sucPipeRows.length, disPipeRows.length);

  const pdfTitle = `${fieldLabel} 펌프 시스템 계산결과`;

  // 기록 ⋯ 메뉴 진입 액션 — 결과 준비 후 1회 자동 실행
  useInitialAction(initialAction, !!result, a => {
    if (a === 'csv') { handlePumpCsv(); return; }
    const html = buildPumpHvacHtml();
    if (!html) return;
    if (a === 'word') downloadWordFile(`${pdfTitle}.doc`, html);
    else if (a === 'pdf') printHtmlReport(html);
  }, onInitialActionDone);

  // 섹션 진행 상태 — 좌측 스테퍼용
  const sucReady = sucPipeRows.length > 0 && sucPipeRows.every(r => parseFloat(r.lStr) > 0);
  const disReady = disPipeRows.length > 0 && disPipeRows.every(r => parseFloat(r.lStr) > 0);
  const headReady = Number.isFinite(parseFloat(HsStr));
  const npshOK = result ? (result.NPSHa_m - (npshMargin || 0)) >= 0 : false;

  const sections: SectionItem[] = [
    { id: 'sec-system',   label: '시스템 조건',    state: Q_m3s > 0 ? 'done' : 'pending' },
    { id: 'sec-suction',  label: '흡입 배관',      state: sucReady ? 'done' : 'pending' },
    { id: 'sec-disch',    label: '토출 배관',      state: disReady ? 'done' : 'pending' },
    { id: 'sec-fittings', label: '부속·장비',      state: (fittingRows.length > 0 || equipRows.length > 0) ? 'done' : 'pending', optional: true },
    { id: 'sec-head',     label: '정수두·여유율',  state: headReady ? 'done' : 'pending' },
    { id: 'sec-result',   label: '결과·검증',      state: result ? (npshOK ? 'done' : 'warn') : 'pending' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {chainedFrom === 'friction-network' && (
        <ChainBanner>
          계통 압력손실 시스템에서 전달된 <b>Σ말단유량(설계유량 Q)·최대 요구압(잔류 토출압)</b> 값입니다. 흡입/토출 배관을 입력하면 TDH가 산출됩니다.
        </ChainBanner>
      )}
      {chainedFrom === 'pipe-sizing' && (
        <ChainBanner>
          관경 계산기에서 전달된 <b>선정 관경·유량</b> 값입니다. 흡입/토출 배관의 길이를 입력하면 TDH가 산출됩니다.
        </ChainBanner>
      )}
      <WorkspaceLayout
        sections={sections}
        result={result}
        headMarginPct={Number.isFinite(headMargin) ? headMargin : 0}
        npshMargin={npshMargin || 1}
        powerUnit={powerUnit}
      >
        {/* §1 시스템 기본조건 */}
        <div id="sec-system">
          <SystemConditionSection
            fieldConfig={fieldConfig}
            systemMode={systemMode} setSystemMode={setSystemMode}
            fluid={fluid} setFluid={setFluid}
            tempC={tempC} setTempC={setTempC}
            Q={Q} setQ={setQ}
            flowUnit={flowUnit} onFlowUnitChange={handleFlowUnitChange}
            heatLoadStr={heatLoadStr} setHeatLoadStr={setHeatLoadStr}
            deltaTStr={deltaTStr} setDeltaTStr={setDeltaTStr}
            useHeatLoadCalc={useHeatLoadCalc} setUseHeatLoadCalc={setUseHeatLoadCalc}
          />
        </div>

        {/* §2 흡입측 배관 (다중) */}
        <div id="sec-suction" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            fontSize: 12, color: 'var(--text-tertiary)',
          }}>
            <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>배관 상태</span>
            <select
              value={pipeCondition}
              onChange={e => setPipeCondition(e.target.value as PipeCondition)}
              style={{
                border: '1px solid var(--border-default)', borderRadius: 6, padding: '4px 8px',
                fontSize: 12, color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)',
                outline: 'none', fontFamily: 'inherit',
              }}
            >
              <option value="new">신관</option>
              <option value="old">노후</option>
            </select>
            <span style={{ color: 'var(--text-quaternary)' }}>
              전 구간 공통 — 재질×상태별 절대조도 ε 자동 적용 (마찰계수는 영역별 자동 산출)
            </span>
          </div>
          <PipeMultiTable
            title="흡입측 배관"
            side="suction"
            prefix="SP"
            rows={sucPipeRows}
            onChange={handleSucPipeRowsChange}
          />
        </div>

        {/* §3 토출측 배관 (다중) */}
        <div id="sec-disch">
          <PipeMultiTable
            title="토출측 배관"
            side="discharge"
            prefix="DP"
            rows={disPipeRows}
            onChange={handleDisPipeRowsChange}
          />
        </div>

        {/* §4 부속·장비 */}
        <div id="sec-fittings" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FittingTable
            rows={fittingRows}
            pipeRefOptions={pipeRefOptions}
            onAdd={addFittingRow}
            onRemove={removeFittingRow}
            onUpdate={updateFittingRow}
          />
          <EquipTable
            rows={equipRows}
            pipeRefOptions={pipeRefOptions}
            onAdd={addEquipRow}
            onRemove={removeEquipRow}
            onUpdate={updateEquipRow}
          />
        </div>

        {/* §4b 펌프 후보 곡선 (선택 입력) */}
        <div id="sec-pump-curve" style={{
          border: `1px solid var(--border-subtle)`,
          borderRadius: 8,
          padding: '14px 16px',
          backgroundColor: 'var(--bg-surface)',
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
            펌프 후보 곡선 (선택)
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 10px 0' }}>
            펌프 카탈로그의 H-Q 곡선에서 5~7개 점을 입력하세요. 비워두면 시스템 곡선만 표시됩니다.
          </p>
          {/* BEP 유량 입력 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 180 }}>
              BEP 유량 Q_BEP [m³/h]
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={bepQStr}
              onChange={e => setBepQStr(e.target.value)}
              placeholder="예: 20.0 (최고효율점 유량, 선택)"
              style={{
                flex: 1, padding: '7px 10px', fontSize: 13,
                border: `1px solid var(--border-input)`, borderRadius: 6,
                fontFamily: 'inherit', backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          {/* 인버터(VFD) 운전 — 카탈로그 기준 Hz */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 180 }}>
              카탈로그 기준 Hz
            </label>
            <input
              type="number"
              min={1}
              step={0.1}
              value={catalogHzStr}
              onChange={e => setCatalogHzStr(e.target.value)}
              placeholder="예: 60"
              style={{
                width: 100, padding: '7px 10px', fontSize: 13,
                border: `1px solid var(--border-input)`, borderRadius: 6,
                fontFamily: 'inherit', backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              입력한 H-Q 곡선이 측정된 주파수 (한국 표준 60Hz, 유럽 표준 50Hz)
            </span>
          </div>
          {/* 인버터(VFD) 운전 — 비교 운전 주파수 다중 선택 */}
          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              비교 운전 주파수 (다중 선택)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[30, 35, 40, 45, 50, 55, 60].map(hz => {
                const isCatalog = hz === validCatalogHz;
                const isChecked = operatingHzList.includes(hz);
                return (
                  <label
                    key={hz}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '4px 10px',
                      border: `1px solid ${isChecked ? 'var(--accent-primary, #2563eb)' : 'var(--border-input)'}`,
                      borderRadius: 6, cursor: 'pointer', fontSize: 13,
                      backgroundColor: isChecked ? 'var(--accent-primary-bg-soft)' : 'var(--bg-surface)',
                      color: isChecked ? 'var(--accent-primary, #2563eb)' : 'var(--text-primary)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e => {
                        if (e.target.checked) {
                          setOperatingHzList([...operatingHzList, hz].sort((a, b) => a - b));
                        } else {
                          setOperatingHzList(operatingHzList.filter(h => h !== hz));
                        }
                      }}
                      style={{ margin: 0 }}
                    />
                    {hz}Hz{isCatalog ? <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 2 }}>(카탈로그)</span> : null}
                  </label>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0 0' }}>
              인버터 운전 분석 — 각 주파수에서의 펌프 곡선이 차트에 함께 표시됩니다
            </p>
          </div>
          {/* H-Q 곡선 행 */}
          {pumpCurveRows.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 8 }}>
              <thead>
                <tr>
                  <th style={{ padding: '4px 8px', textAlign: 'left', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>Q [m³/h]</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>H [m]</th>
                  <th style={{ width: 36, borderBottom: '1px solid var(--border-subtle)' }}></th>
                </tr>
              </thead>
              <tbody>
                {pumpCurveRows.map((row, i) => (
                  <tr key={row.uid}>
                    <td style={{ padding: '3px 8px 3px 0' }}>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={row.qStr}
                        onChange={e => {
                          const updated = pumpCurveRows.map((r, idx) => idx === i ? { ...r, qStr: e.target.value } : r);
                          setPumpCurveRows(updated);
                        }}
                        placeholder="Q"
                        style={{
                          width: '100%', padding: '5px 8px', fontSize: 13,
                          border: `1px solid var(--border-input)`, borderRadius: 5,
                          fontFamily: 'inherit', backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </td>
                    <td style={{ padding: '3px 8px 3px 8px' }}>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={row.hStr}
                        onChange={e => {
                          const updated = pumpCurveRows.map((r, idx) => idx === i ? { ...r, hStr: e.target.value } : r);
                          setPumpCurveRows(updated);
                        }}
                        placeholder="H"
                        style={{
                          width: '100%', padding: '5px 8px', fontSize: 13,
                          border: `1px solid var(--border-input)`, borderRadius: 5,
                          fontFamily: 'inherit', backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </td>
                    <td style={{ padding: '3px 0 3px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => setPumpCurveRows(pumpCurveRows.filter((_, idx) => idx !== i))}
                        style={{
                          width: 28, height: 28, fontSize: 14, borderRadius: 4,
                          border: '1px solid var(--border-input)', cursor: 'pointer',
                          backgroundColor: 'var(--bg-surface)', color: 'var(--text-tertiary)',
                          fontFamily: 'inherit', lineHeight: 1,
                        }}
                        title="행 삭제"
                      >×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button
            onClick={() => setPumpCurveRows([...pumpCurveRows, { uid: `pcr-${Date.now()}`, qStr: '', hStr: '' }])}
            style={{
              padding: '6px 14px', fontSize: 12, borderRadius: 6,
              border: `1px solid var(--border-input)`, cursor: 'pointer',
              backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)',
              fontFamily: 'inherit',
            }}
          >+ 점 추가</button>
        </div>

        {/* §5 정수두·잔류압력 + 안전율 프리셋 */}
        <div id="sec-head">
          <HeadPressureSection
            isClosed={isClosed}
            fieldLabel={fieldLabel}
            fieldConfig={fieldConfig}
            HsStr={HsStr} setHsStr={setHsStr}
            HdStr={HdStr} setHdStr={setHdStr}
            PresStr={PresStr} setPresStr={setPresStr}
            presUnit={presUnit} onPresUnitChange={handlePresUnitChange}
            PatmStr={PatmStr} setPatmStr={setPatmStr}
            headMarginStr={headMarginStr} setHeadMarginStr={setHeadMarginStr}
            powerMarginStr={powerMarginStr} setPowerMarginStr={setPowerMarginStr}
            npshMarginStr={npshMarginStr} setNpshMarginStr={setNpshMarginStr}
            presetApplied={presetApplied} setPresetApplied={setPresetApplied}
          />
          {/* NPSHr 입력 — 펌프 카탈로그 기재값, 선택 입력 */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 210 }}>
              NPSHr (펌프 카탈로그) [m]
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={npshrStr}
              onChange={e => setNpshrStr(e.target.value)}
              placeholder="예: 3.5 (펌프 카탈로그 참조, 빈 칸 = 비교 생략)"
              style={{
                flex: 1, padding: '7px 10px', fontSize: 13,
                border: `1px solid var(--border-input)`, borderRadius: 6,
                fontFamily: 'inherit', backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* §6 결과 */}
        <div id="sec-result">
          {result ? (
            <ResultSection
              result={result}
              powerUnit={powerUnit}
              setPowerUnit={setPowerUnit}
              powerFactor={powerFactor}
              npshMargin={npshMargin || 1}
              pumpCurve={parsedPumpCurve}
              BEP_Q_m3h={parsedBepQ}
              operatingPoint={operatingPoint}
              pumpCurveFamily={pumpCurveFamily}
              catalogHz={validCatalogHz}
            />
          ) : (
            <div style={{
              backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: 24, textAlign: 'center',
            }}>
              <p style={{ fontSize: 13, color: C.text, margin: 0 }}>
                유량·흡입/토출 배관 정보·길이를 모두 입력하면 결과가 표시됩니다.
              </p>
            </div>
          )}
        </div>
      </WorkspaceLayout>

      {/* §7 버튼 영역 — .calc-actions로 화면 하단 고정(sticky) */}
      <div className="calc-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        {onSave && <SaveBtn onClick={onSave} enabled={!!canSave} />}
        <PumpReportBtn
          icon={<Download size={14} />} label="CSV 내보내기"
          title="계산 조건·결과·손실 상세를 CSV 파일로 다운로드"
          enabled={!!result}
          onClick={handlePumpCsv}
        />
        <PumpReportBtn
          icon={<FileText size={14} />} label="Word로 저장"
          title="PDF 산출서와 동일한 양식의 Word(.doc) 파일 다운로드"
          enabled={!!result}
          onClick={() => {
            const html = buildPumpHvacHtml();
            if (html) downloadWordFile(`${pdfTitle}.doc`, html);
          }}
        />
        <PumpReportBtn
          icon={<Printer size={14} />} label="PDF로 저장"
          title="인쇄 다이얼로그에서 '대상: PDF로 저장' 선택"
          enabled={!!result}
          onClick={() => {
            const html = buildPumpHvacHtml();
            if (html) printHtmlReport(html);
          }}
        />
      </div>
    </div>
  );

  function handlePumpCsv() {
    if (!result) return;
    downloadCsv(`${pdfTitle}.csv`, buildPumpHvacCsvRows({
      result, fieldLabel, systemMode, fluid, tempC, Q,
      flowUnitLabel: FLOW_UNITS_PUMP.find(u => u.key === flowUnit)?.label ?? '',
      HsStr, HdStr, PresStr,
      presUnit: PRESSURE_UNITS_PUMP.find(u => u.key === presUnit)?.label ?? presUnit,
      pipeCondition, headMarginStr, powerMarginStr, npshrStr,
      powerUnitLabel: POWER_UNITS.find(u => u.key === powerUnit)?.label ?? powerUnit,
      powerFactor,
    }));
  }

  function buildPumpHvacHtml(): string | null {
    if (!result) return null;
    return buildPumpHvacReportHtml({
      result,
      systemMode,
      fluid,
      tempC: parseFloat(tempC) || 20,
      Q_m3s,
      Q_display: Q,
      flowUnitLabel: FLOW_UNITS_PUMP.find(u => u.key === flowUnit)?.label ?? '',
      HsStr,
      HdStr,
      PresStr,
      presUnit,
      PatmStr,
      headMarginStr,
      powerMarginStr,
      npshMarginStr,
      presetApplied,
      fieldLabel,
      fieldConfig,
      npshrStr,
      pumpCurve: parsedPumpCurve,
      BEP_Q_m3h: parsedBepQ,
      operatingPoint,
      pumpCurveFamily,
      catalogHz: validCatalogHz,
    });
  }
}

function PumpReportBtn({
  icon, label, title, enabled, onClick,
}: {
  icon: React.ReactNode; label: string; title: string;
  enabled: boolean; onClick: () => void;
}) {
  return (
    <button
      disabled={!enabled}
      onClick={onClick}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '10px 16px', fontSize: 13, fontWeight: 500,
        color: enabled ? C.textDark : 'var(--text-quaternary)',
        backgroundColor: C.surface,
        border: `1px solid ${enabled ? C.borderInput : C.border}`,
        borderRadius: 8, cursor: enabled ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
      }}
    >
      {icon} {label}
    </button>
  );
}

function fmtNum(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '';
  if (n === 0) return '0';
  if (n < 1) return n.toFixed(3);
  if (n < 10) return n.toFixed(2);
  if (n < 100) return n.toFixed(1);
  return n.toFixed(0);
}
