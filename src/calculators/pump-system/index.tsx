// 펌프 시스템 계산기 — 메인 컴포넌트

import { useEffect, useMemo, useState } from 'react';
import { PIPE_MATERIALS_V2, getMaterialLabel } from '../../data/pipeSizes';
import { pfMaterial, type PFMaterialId, type PipeCondition } from '../../data/pipeRoughness.ts';
import type { PumpFieldId, FluidId } from './configs/types';
import { getPumpFieldConfig } from './configs/index';
import { type FlowUnitPumpKey, type PressureUnitPumpKey, type PowerUnitKey, FLOW_UNITS_PUMP, LENGTH_UNITS, PRESSURE_UNITS_PUMP } from './units';
import CalculatorTab from './tabs/CalculatorTab';
import type { FittingRowState, EquipRowState, PipeRowState } from './tabs/CalculatorTab';
import type { FieldContext } from '../../config/calculators';
import { computePumpHvac, type SystemMode } from './calc';
import type { FluidType } from '../../data/glycol-properties';
import { FITTING_K_VALUES } from '../../data/fitting-k-values';

// PIPE_MATERIALS_V2 id → pipeRoughness PFMaterialId (ε 조회용)
const PF_MATERIAL_BY_V2: Record<string, PFMaterialId> = {
  sgp: 'steel', stainless: 'sts304', pvc: 'pvc', copper: 'copper',
  // legacy 저장 기록 호환
  sts10s: 'sts304', 'pvc-cpvc': 'pvc',
};

const FITTING_K_MAP: Record<string, number> = Object.fromEntries(
  FITTING_K_VALUES.map(f => [f.id, f.K]),
);
const FITTING_NAME_MAP: Record<string, string> = Object.fromEntries(
  FITTING_K_VALUES.map(f => [f.id, f.nameKo]),
);

interface Props {
  field: PumpFieldId;          // 신규 필수 prop
  initialState?: Record<string, any>;
  onStateChange?: (ctx: FieldContext) => void;   // 자동기록 — 렌더마다 보고 (중복 제거는 App)
  initialAction?: string;              // 기록 ⋯ 메뉴 진입 시 1회 실행 (html·pdf)
  onInitialActionDone?: () => void;
}

// 기본 배관 행 (흡입 100A·5m·sgp·KS일반, 토출 80A·50m·sgp·KS일반)
const defaultSucRow = (): PipeRowState => ({
  uid: `suc-default-${Date.now()}`,
  materialId: 'sgp',
  scheduleId: 'ks-std',
  nominalA: 100,
  lStr: '5',
  lUnit: 'm',
});
const defaultDisRow = (): PipeRowState => ({
  uid: `dis-default-${Date.now()}`,
  materialId: 'sgp',
  scheduleId: 'ks-std',
  nominalA: 80,
  lStr: '50',
  lUnit: 'm',
});

// 초기화 — 28개 useState를 개별 리셋하는 대신 key 리마운트로 공장 기본값 복원
// (리셋 시 initialState·initialAction 폐기: pipe-sizing/pipe-friction reset()과 동일한 의미론)
export default function PumpSystemCalculator(props: Props) {
  const [resetKey, setResetKey] = useState(0);
  return (
    <PumpSystemInner
      key={resetKey}
      {...props}
      initialState={resetKey === 0 ? props.initialState : undefined}
      initialAction={resetKey === 0 ? props.initialAction : undefined}
      onReset={() => setResetKey(k => k + 1)}
    />
  );
}

function PumpSystemInner({ field, initialState, onStateChange, initialAction, onInitialActionDone, onReset }: Props & { onReset: () => void }) {
  const fieldConfig = getPumpFieldConfig(field);

  // §1 시스템 기본조건
  // state carry-over 보호: 저장된 값이 분야 허용 범위 밖이면 fieldConfig.default 로 fallback
  const [systemMode, setSystemMode] = useState<SystemMode>(() => {
    const saved = initialState?.systemMode as SystemMode | undefined;
    if (saved && fieldConfig.availableSystemModes.includes(saved)) return saved;
    return fieldConfig.defaultSystemMode;
  });
  const [fluid, setFluid] = useState<FluidId>(() => {
    const saved = initialState?.fluid as FluidId | undefined;
    if (saved && fieldConfig.availableFluids.includes(saved)) return saved;
    return fieldConfig.defaultFluid;
  });
  const [tempC, setTempC] = useState<string>(() => initialState?.tempC ?? '20');
  const [Q, setQ] = useState<string>(() => initialState?.Q ?? '');
  const [flowUnit, setFlowUnit] = useState<FlowUnitPumpKey>(() => initialState?.flowUnit ?? 'm3h');

  // §2 흡입측 배관 (다중)
  const [sucPipeRows, setSucPipeRows] = useState<PipeRowState[]>(
    () => initialState?.sucPipeRows ?? [defaultSucRow()],
  );
  // 배관 상태 (신관/노후) — ε 기본값 선택 (전 구간 공통)
  const [pipeCondition, setPipeCondition] = useState<PipeCondition>(
    () => (initialState?.pipeCondition === 'old' ? 'old' : 'new'),
  );

  // §3 토출측 배관 (다중)
  const [disPipeRows, setDisPipeRows] = useState<PipeRowState[]>(
    () => initialState?.disPipeRows ?? [defaultDisRow()],
  );

  // §4 부속류
  const [fittingRows, setFittingRows] = useState<FittingRowState[]>(
    () => initialState?.fittingRows ?? [],
  );

  // §5 장비류 (carry-over: kind/dirtyMargin 누락 시 기본값으로 채움)
  const [equipRows, setEquipRows] = useState<EquipRowState[]>(
    () => (initialState?.equipRows ?? []).map((r: any) => ({
      ...r,
      kind: r.kind ?? 'other',
      dirtyMargin: r.dirtyMargin ?? false,
    })),
  );

  // §6 정수두·잔류압력
  const [HsStr, setHsStr] = useState<string>(() => initialState?.HsStr ?? '0');
  const [HdStr, setHdStr] = useState<string>(() => initialState?.HdStr ?? '0');
  const [PresStr, setPresStr] = useState<string>(() => initialState?.PresStr ?? '0');
  const [presUnit, setPresUnit] = useState<PressureUnitPumpKey>(
    () => initialState?.presUnit ?? 'kPa',
  );
  const [PatmStr, setPatmStr] = useState<string>(() => initialState?.PatmStr ?? '101.325');

  // §7 안전율 프리셋 (fieldConfig.preset 경유)
  const [headMarginStr, setHeadMarginStr] = useState<string>(
    () => initialState?.headMarginStr ?? String(fieldConfig.preset.headMarginPct),
  );
  const [powerMarginStr, setPowerMarginStr] = useState<string>(
    () => initialState?.powerMarginStr ?? String(fieldConfig.preset.powerMarginFactor),
  );
  const [npshMarginStr, setNpshMarginStr] = useState<string>(
    () => initialState?.npshMarginStr ?? String(fieldConfig.preset.npshMargin_m),
  );
  const [presetApplied, setPresetApplied] = useState<{ head: boolean; power: boolean; npsh: boolean }>(
    () => initialState?.presetApplied ?? { head: true, power: true, npsh: true },
  );

  // 동력 단위
  const [powerUnit, setPowerUnit] = useState<PowerUnitKey>(() => initialState?.powerUnit ?? 'kW');

  // 열부하 → 유량 보조 입력
  const [heatLoadStr, setHeatLoadStr] = useState<string>(() => initialState?.heatLoadStr ?? '');
  const [deltaTStr, setDeltaTStr] = useState<string>(() => initialState?.deltaTStr ?? '');
  const [useHeatLoadCalc, setUseHeatLoadCalc] = useState<boolean>(() => initialState?.useHeatLoadCalc ?? false);

  // NPSHr (펌프 카탈로그) — 선택 입력, 빈 값/0 = 미입력
  const [npshrStr, setNpshrStr] = useState<string>(() => initialState?.npshrStr ?? '');

  // 펌프 H-Q 곡선 (선택 입력)
  const [pumpCurveRows, setPumpCurveRows] = useState<{ uid: string; qStr: string; hStr: string }[]>(
    () => initialState?.pumpCurveRows ?? [],
  );
  const [bepQStr, setBepQStr] = useState<string>(() => initialState?.bepQStr ?? '');

  // 인버터(VFD) 운전 — 카탈로그 기준 Hz + 비교 운전 Hz 리스트
  const [catalogHzStr, setCatalogHzStr] = useState<string>(() => initialState?.catalogHzStr ?? '60');
  const [operatingHzList, setOperatingHzList] = useState<number[]>(
    () => initialState?.operatingHzList ?? [60],
  );

  // 체이닝으로 들어온 경우 — 발신 계산기 안내 배너 표시 (관경 선정)
  const chainedFrom = typeof initialState?.chainedFrom === 'string' ? initialState.chainedFrom : undefined;

  // 현재 inputs/outputs (자동기록용)
  const inputs = {
    systemMode, fluid, tempC, Q, flowUnit,
    sucPipeRows, disPipeRows, pipeCondition,
    fittingRows, equipRows,
    HsStr, HdStr, PresStr, presUnit, PatmStr,
    headMarginStr, powerMarginStr, npshMarginStr, presetApplied,
    powerUnit,
    heatLoadStr, deltaTStr, useHeatLoadCalc,
    npshrStr,
    pumpCurveRows, bepQStr,
    catalogHzStr, operatingHzList,
  };

  // outputs 계산 — 화면 표시·저장 모두에서 공유. 입력 변환을 한 곳에서만 수행해
  // 두 경로 사이의 미묘한 차이(예: Patm 기본값)로 결과가 갈리는 일을 막는다.
  const result = useMemo(() => {
    const Q_num = parseFloat(Q);
    if (!Number.isFinite(Q_num) || Q_num <= 0) return null;
    const flowUnitFactor = FLOW_UNITS_PUMP.find(u => u.key === flowUnit)?.toM3s ?? 0;
    const Q_m3s = Q_num * flowUnitFactor;

    const headMargin = parseFloat(headMarginStr);
    const powerMargin = parseFloat(powerMarginStr);
    if (!Number.isFinite(headMargin) || !Number.isFinite(powerMargin)) return null;

    const presToPa = PRESSURE_UNITS_PUMP.find(u => u.key === presUnit)?.toPa ?? 1000;
    const Pres_n = parseFloat(PresStr);
    const Pres_Pa = (!Number.isFinite(Pres_n) || Pres_n < 0) ? 0 : Pres_n * presToPa;

    function lenToM(str: string, unit: typeof LENGTH_UNITS[number]['key']): number {
      const n = parseFloat(str);
      if (!Number.isFinite(n) || n <= 0) return 0;
      return n * (LENGTH_UNITS.find(u => u.key === unit)?.toM ?? 1);
    }

    function rowsToSegments(rows: PipeRowState[], side: 'suction' | 'discharge') {
      return rows.map(row => {
        const matV2 = PIPE_MATERIALS_V2.find(m => m.id === row.materialId);
        const schedSpec = matV2?.schedules.find(s => s.id === row.scheduleId) ?? matV2?.schedules[0];
        const sizeSpec = schedSpec?.sizes.find(s => s.nominalA === row.nominalA) ?? schedSpec?.sizes[0];
        const L_m = lenToM(row.lStr, row.lUnit);
        if (!sizeSpec || !schedSpec || L_m <= 0) return null;
        return {
          side,
          materialId: row.materialId,
          scheduleId: schedSpec.id,
          scheduleLabel: schedSpec.label,
          nominalA: sizeSpec.nominalA,
          id_mm: sizeSpec.id_mm,
          L_m,
          eps_mm: pfMaterial(PF_MATERIAL_BY_V2[row.materialId] ?? 'steel').eps_mm[pipeCondition],
          materialNameKo: getMaterialLabel(row.materialId),
        };
      });
    }

    const sucSegments = rowsToSegments(sucPipeRows, 'suction');
    const disSegments = rowsToSegments(disPipeRows, 'discharge');
    if (
      sucSegments.length === 0 || sucSegments.some(s => s === null) ||
      disSegments.length === 0 || disSegments.some(s => s === null)
    ) return null;

    const fittingsForCalc = fittingRows
      .filter(r => r.fittingId && r.qty > 0)
      .map(r => ({
        fittingId: r.fittingId,
        pipeRefIndex: r.pipeRefIndex,
        pipeRefSide: r.pipeRefSide,
        qty: r.qty,
      }));

    const equipForCalc = equipRows
      .filter(r => r.name.trim())
      .map(r => {
        const n = parseFloat(r.dP);
        const unit = PRESSURE_UNITS_PUMP.find(u => u.key === r.dPUnit);
        const dP_Pa = (!Number.isFinite(n) || n <= 0) ? 0 : n * (unit?.toPa ?? 1000);
        return {
          name: r.name,
          dP_Pa,
          pipeRefIndex: r.pipeRefIndex,
          pipeRefSide: r.pipeRefSide,
          kind: r.kind ?? 'other',
          dirtyMargin: r.dirtyMargin ?? false,
        };
      });

    return computePumpHvac(
      {
        systemMode,
        fluid: fluid as FluidType,
        concPct: 0, tempC: parseFloat(tempC) || 20,
        sucPipes: sucSegments as NonNullable<typeof sucSegments[0]>[],
        disPipes: disSegments as NonNullable<typeof disSegments[0]>[],
        Q_m3s,
        fittings: fittingsForCalc,
        equipItems: equipForCalc,
        Hs_m: parseFloat(HsStr) || 0,
        Hd_m: systemMode === 'closed' ? 0 : (parseFloat(HdStr) || 0),
        Pres_Pa,
        Patm_Pa: (parseFloat(PatmStr) || 101.325) * 1000,
        headMarginPct: headMargin,
        powerMarginFactor: powerMargin,
        npshMargin_m: parseFloat(npshMarginStr) || 0,
        NPSHr_m: parseFloat(npshrStr) || 0,
        eta: 0.65,
      },
      FITTING_K_MAP, FITTING_NAME_MAP,
    );
  }, [
    systemMode, fluid, tempC, Q, flowUnit,
    sucPipeRows, disPipeRows, pipeCondition, fittingRows, equipRows,
    HsStr, HdStr, PresStr, presUnit, PatmStr,
    headMarginStr, powerMarginStr, npshMarginStr, npshrStr,
  ]);

  useEffect(() => { onStateChange?.({ inputs, outputs: result }); });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <CalculatorTab
        fieldLabel={fieldConfig.fieldLabel}
        fieldConfig={fieldConfig}
        systemMode={systemMode} setSystemMode={setSystemMode}
        fluid={fluid} setFluid={setFluid}
        tempC={tempC} setTempC={setTempC}
        Q={Q} setQ={setQ}
        flowUnit={flowUnit} setFlowUnit={setFlowUnit}
        sucPipeRows={sucPipeRows} setSucPipeRows={setSucPipeRows}
        disPipeRows={disPipeRows} setDisPipeRows={setDisPipeRows}
        pipeCondition={pipeCondition} setPipeCondition={setPipeCondition}
        fittingRows={fittingRows} setFittingRows={setFittingRows}
        equipRows={equipRows} setEquipRows={setEquipRows}
        HsStr={HsStr} setHsStr={setHsStr}
        HdStr={HdStr} setHdStr={setHdStr}
        PresStr={PresStr} setPresStr={setPresStr}
        presUnit={presUnit} setPresUnit={setPresUnit}
        PatmStr={PatmStr} setPatmStr={setPatmStr}
        headMarginStr={headMarginStr} setHeadMarginStr={setHeadMarginStr}
        powerMarginStr={powerMarginStr} setPowerMarginStr={setPowerMarginStr}
        npshMarginStr={npshMarginStr} setNpshMarginStr={setNpshMarginStr}
        presetApplied={presetApplied} setPresetApplied={setPresetApplied}
        powerUnit={powerUnit} setPowerUnit={setPowerUnit}
        heatLoadStr={heatLoadStr} setHeatLoadStr={setHeatLoadStr}
        deltaTStr={deltaTStr} setDeltaTStr={setDeltaTStr}
        useHeatLoadCalc={useHeatLoadCalc} setUseHeatLoadCalc={setUseHeatLoadCalc}
        npshrStr={npshrStr} setNpshrStr={setNpshrStr}
        pumpCurveRows={pumpCurveRows} setPumpCurveRows={setPumpCurveRows}
        bepQStr={bepQStr} setBepQStr={setBepQStr}
        catalogHzStr={catalogHzStr} setCatalogHzStr={setCatalogHzStr}
        operatingHzList={operatingHzList} setOperatingHzList={setOperatingHzList}
        result={result}
        onReset={onReset}
        chainedFrom={chainedFrom}
        initialAction={initialAction}
        onInitialActionDone={onInitialActionDone}
      />
    </div>
  );
}
