// 마찰손실 계통 계산기 — 메인 컴포넌트 (계산 + 개요 + 예시)
// 공식: 참조 엑셀 '마찰손실 계통 계산기' 이식 — 부모ID 트리 Q 합산 + Q형 Darcy-Weisbach
//   f: 층류 64/Re · Re≥2300 전부 Swamee-Jain (pipe-friction 엔진 swameeJain 재사용)
//   판정: 최대(누적손실+요구압) vs 설계 가용정압 P_avail×(1−α)

import { useMemo, useState } from 'react';
import type { FieldContext } from '../../config/calculators';
import {
  FN_MAX_ROWS, FN_V_LIMIT_DEFAULTS, FN_TARGET_R_PA_PER_M,
  type FNSystemType, type FNGrade, type FNFluidId,
  type FNMaterialId, type FNCondition,
} from '../../data/frictionNetworkRef.ts';
import {
  computeNetwork, validateSettings,
  type FNSettings, type FNSegmentInput, type FNFlowUnit, type FNShape,
} from './calc';
import { fnSuggestDe, type FNSuggestion } from './design';
import CalculatorTab from './tabs/CalculatorTab';
import OverviewTab from './tabs/OverviewTab';
import ExamplesTab, { type FNPreset } from './tabs/ExamplesTab';
import { C } from './styles';

type TabKey = 'calculator' | 'overview' | 'examples';

interface Props {
  initialTab?: string;
  initialState?: Record<string, any>;
  onSave?: (ctx: FieldContext) => void;
}

function normalizeTab(t?: string): TabKey {
  if (t === 'overview' || t === 'examples' || t === 'calculator') return t;
  return 'calculator';
}

// ── 상태 타입 (전부 문자열 보관 — 표시·편집 그대로) ───────────────

export interface FNVLimitState { min: string; max: string }

export interface FNSettingsState {
  systemType: FNSystemType;
  fluid: FNFluidId;
  tempC: string;
  pressAbs: string;               // 절대압 (bar a)
  rhoCustom: string;              // 직접입력 ρ (kg/m³)
  nuCustom: string;               // 직접입력 ν (×10⁻⁶ m²/s)
  pAvail: string;                 // 가용정압 (Pa)
  alphaPct: string;               // 여유율 (%)
  designTotalFlow: string;        // 설계 총유량 (flowUnit) — Σ말단 대조용, 선택 입력
  targetR: string;                // 목표 마찰률 R (Pa/m) — 제안De 전용, 손실 계산 미사용
  flowUnit: FNFlowUnit;
  vLimits: Record<FNGrade, FNVLimitState>;
}

export interface FNSegmentState {
  id: string; parentId: string;
  grade: FNGrade; shape: FNShape;
  D: string; a: string; b: string;
  L: string; sumK: string; equip: string;
  materialId: FNMaterialId; condition: FNCondition;
  terminalFlow: string; pReq: string;
}

function defaultVLimits(t: FNSystemType): Record<FNGrade, FNVLimitState> {
  const d = FN_V_LIMIT_DEFAULTS[t];
  return {
    main:   { min: String(d.main.min),   max: String(d.main.max) },
    sub:    { min: String(d.sub.min),    max: String(d.sub.max) },
    branch: { min: String(d.branch.min), max: String(d.branch.max) },
  };
}

function defaultSettings(t: FNSystemType = 'pipe'): FNSettingsState {
  return {
    systemType: t, fluid: t === 'duct' ? 'air' : 'water', tempC: '20',
    pressAbs: '1.01325', rhoCustom: '', nuCustom: '',
    pAvail: '', alphaPct: '10',
    designTotalFlow: '', targetR: String(FN_TARGET_R_PA_PER_M[t]),
    flowUnit: t === 'duct' ? 'CMH' : 'LPM',
    vLimits: defaultVLimits(t),
  };
}

export function newRow(prevRows: FNSegmentState[], systemType: FNSystemType): FNSegmentState {
  // ID 자동 부여: S01, S02, ... (기존과 중복 회피)
  let n = prevRows.length + 1;
  const ids = new Set(prevRows.map(r => r.id.trim()));
  let id = `S${String(n).padStart(2, '0')}`;
  while (ids.has(id)) { n++; id = `S${String(n).padStart(2, '0')}`; }
  return {
    id,
    parentId: prevRows.length === 0 ? 'ROOT' : prevRows[prevRows.length - 1].id,
    grade: prevRows.length === 0 ? 'main' : 'branch',
    shape: 'circle', D: '', a: '', b: '',
    L: '', sumK: '0', equip: '0',
    materialId: systemType === 'duct' ? 'galv-sheet' : 'steel', condition: 'new',
    terminalFlow: '', pReq: '0',
  };
}

// 미입력 행 — 치수·길이·말단유량 전부 빈값이면 계산 대상에서 제외
function isBlankRow(r: FNSegmentState): boolean {
  return r.D.trim() === '' && r.a.trim() === '' && r.b.trim() === ''
    && r.L.trim() === '' && r.terminalFlow.trim() === '';
}

const num = (s: string) => parseFloat(s);

export default function FrictionNetworkCalculator({ initialTab, initialState, onSave }: Props) {
  const [tab, setTab] = useState<TabKey>(normalizeTab(initialTab));
  const [st, setSt] = useState<FNSettingsState>(() => ({
    ...defaultSettings(), ...(initialState?.settings ?? {}),
  }));
  const [rows, setRows] = useState<FNSegmentState[]>(() =>
    Array.isArray(initialState?.segments) && initialState.segments.length > 0
      ? initialState.segments
      : [newRow([], 'pipe')]);

  function patchSettings(patch: Partial<FNSettingsState>) {
    setSt(s => ({ ...s, ...patch }));
  }
  // 계통 종류 변경 → 유속범위·마찰률 R 기본값·유량 단위·유체 기본값 재설정 (엑셀 Settings 동작)
  function changeSystemType(t: FNSystemType) {
    setSt(s => ({
      ...s, systemType: t,
      vLimits: defaultVLimits(t),
      targetR: String(FN_TARGET_R_PA_PER_M[t]),
      flowUnit: t === 'duct' ? 'CMH' : 'LPM',
      fluid: t === 'duct' ? 'air' : 'water',
    }));
  }
  function patchRow(i: number, patch: Partial<FNSegmentState>) {
    setRows(rs => rs.map((r, j) => j === i ? { ...r, ...patch } : r));
  }
  function addRow() {
    setRows(rs => rs.length >= FN_MAX_ROWS ? rs : [...rs, newRow(rs, st.systemType)]);
  }
  function removeRow(i: number) {
    setRows(rs => rs.length <= 1 ? rs : rs.filter((_, j) => j !== i));
  }

  // ── 파싱 → 계산 ──
  const settings: FNSettings = useMemo(() => ({
    systemType: st.systemType, fluid: st.fluid,
    tempC: num(st.tempC), pressAbs_bar: num(st.pressAbs),
    rhoCustom_kgm3: num(st.rhoCustom), nuCustom_m2s: num(st.nuCustom) * 1e-6,
    pAvail_Pa: st.pAvail.trim() === '' ? 0 : num(st.pAvail),
    alpha: num(st.alphaPct) / 100,
    vLimits: {
      main:   { min: num(st.vLimits.main.min),   max: num(st.vLimits.main.max) },
      sub:    { min: num(st.vLimits.sub.min),    max: num(st.vLimits.sub.max) },
      branch: { min: num(st.vLimits.branch.min), max: num(st.vLimits.branch.max) },
    },
    flowUnit: st.flowUnit,
  }), [st]);

  const settingsError = useMemo(() => validateSettings(settings), [settings]);

  const activeSegments: FNSegmentInput[] = useMemo(() =>
    rows.filter(r => !isBlankRow(r)).map(r => ({
      id: r.id, parentId: r.parentId, grade: r.grade, shape: r.shape,
      D_mm: num(r.D), a_mm: num(r.a), b_mm: num(r.b),
      L_m: num(r.L), sumK: num(r.sumK), equipLoss_Pa: num(r.equip),
      materialId: r.materialId, condition: r.condition,
      terminalFlow: num(r.terminalFlow), pReq_Pa: num(r.pReq),
    })), [rows]);

  const net = useMemo(() => {
    if (settingsError || activeSegments.length === 0) return null;
    return computeNetwork(settings, activeSegments);
  }, [settings, settingsError, activeSegments]);

  // 행별 관경 설계 제안 (유속·마찰률 R 이원 기준 + 규격 스냅) — 표시 전용
  const suggestions = useMemo(() => {
    const byId: Record<string, FNSuggestion> = {};
    if (!net) return byId;
    const segById = new Map(activeSegments.map(s => [s.id.trim(), s]));
    for (const r of net.rows) {
      if (r.error) continue;
      const seg = segById.get(r.id.trim());
      if (!seg) continue;
      const s = fnSuggestDe({
        Q_m3s: r.Q_m3s, grade: seg.grade, vLimits: settings.vLimits,
        targetR_Pa_per_m: num(st.targetR),
        rho_kgm3: net.rho_kgm3, nu_m2s: net.nu_m2s,
        eps_mm: r.eps_mm, materialId: seg.materialId,
      });
      if (s) byId[r.id] = s;
    }
    return byId;
  }, [net, activeSegments, settings, st.targetR]);

  const pAvailEntered = st.pAvail.trim() !== '' && Number.isFinite(num(st.pAvail));
  // 설계 총유량 (m³/s) — 미입력·무효 시 null (대조 생략)
  const designTotalFlow_m3s =
    st.designTotalFlow.trim() !== '' && Number.isFinite(num(st.designTotalFlow)) && num(st.designTotalFlow) > 0
      ? num(st.designTotalFlow) / (st.flowUnit === 'LPM' ? 60000 : 3600)
      : null;
  const canSave = !!net && !net.hasErrors && net.rows.length > 0 && pAvailEntered;

  const inputs = { settings: st, segments: rows };
  const outputs = net ? {
    rowCount: net.rows.length,
    worstId: net.worstId,
    worstDemand_Pa: net.worstDemand_Pa,
    designAvail_Pa: net.designAvail_Pa,
    margin_Pa: net.margin_Pa,
    totalLeafFlow_m3s: net.totalLeafFlow_m3s,
    rho_kgm3: net.rho_kgm3, nu_m2s: net.nu_m2s,
  } : null;

  function loadPreset(p: FNPreset) {
    setSt({ ...defaultSettings(p.settings.systemType), ...p.settings });
    setRows(p.segments.map(r => ({ ...r })));
    setTab('calculator');
  }

  function reset() {
    setSt(defaultSettings());
    setRows([newRow([], 'pipe')]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Tabs value={tab} onChange={setTab} />

      {tab === 'calculator' && (
        <CalculatorTab
          st={st}
          patchSettings={patchSettings}
          changeSystemType={changeSystemType}
          rows={rows}
          patchRow={patchRow}
          addRow={addRow}
          removeRow={removeRow}
          settingsError={settingsError}
          net={net}
          suggestions={suggestions}
          pAvailEntered={pAvailEntered}
          designTotalFlow_m3s={designTotalFlow_m3s}
          onReset={reset}
          onSave={onSave ? () => onSave({ inputs, outputs }) : undefined}
          canSave={canSave}
        />
      )}
      {tab === 'overview' && <OverviewTab />}
      {tab === 'examples' && <ExamplesTab onLoad={loadPreset} />}
    </div>
  );
}

function Tabs({ value, onChange }: { value: TabKey; onChange: (t: TabKey) => void }) {
  const items: { key: TabKey; label: string }[] = [
    { key: 'calculator', label: '계산' },
    { key: 'overview',   label: '개요' },
    { key: 'examples',   label: '예시' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.border}` }}>
      {items.map(item => {
        const active = value === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            style={{
              padding: '10px 16px', fontSize: 14,
              fontWeight: active ? 600 : 500,
              color: active ? C.blue : C.text,
              background: 'transparent', border: 'none',
              borderBottom: `2px solid ${active ? C.blue : 'transparent'}`,
              marginBottom: -1, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
