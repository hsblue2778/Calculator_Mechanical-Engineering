// 관마찰손실 — CSV 행 빌더 (CalculatorTab에서 분리)

import { flowRegime, formatRe } from './analysis';
import { fMethodLabel } from './interpret.ts';
import { pfFlowUnitDef } from './pfUnits.ts';
import { PRESSURE_UNITS } from './units';
import type { PipeFrictionController } from './usePipeFrictionState.ts';

type PressDef = typeof PRESSURE_UNITS[number];

export function buildPipeFrictionCsvRows(pf: PipeFrictionController, pressDef: PressDef): (string | number)[][] {
  const { st, res, fluidMeta, mat, derivedField, triDisplay } = pf;
  if (!res) return [];
  const regime = flowRegime(res.Re);
  const flowLabel = pfFlowUnitDef(st.flowUnit).label;
  const condLabel = st.condition === 'new' ? '신관' : '노후';
  const deltaP_unit = res.deltaP_Pa * pressDef.factor;
  const unitLoss_unit = res.deltaP_per_m_Pa * pressDef.factor;
  const auto = (f: 'Q' | 'V' | 'D') => (derivedField === f ? '자동 산출' : '입력');

  const rows: (string | number)[][] = [
    ['항목', '값', '단위', '비고'],
    ['계산기', '관마찰손실 (Darcy-Weisbach / Hazen-Williams)', '', ''],
    ['유체', fluidMeta.label, '', fluidMeta.mode === 'fixed' ? '상온·1atm 단일값 (문헌 표 5)' : `온도 ${st.tempC}°C`],
    ...(fluidMeta.hasPressure ? [['압력', st.pressureMmHg, 'mmHg', ''] as (string | number)[]] : []),
    ['배관 재질', `${mat.nameKo} (${condLabel})`, '', ''],
    ['절대조도 ε', st.epsStr, 'mm', st.epsStr.trim() !== pf.epsDefault ? `기본 ${pf.epsDefault} → 수정` : '기본값'],
    ...(st.fluid === 'water'
      ? [['H-W 조도계수 C', st.cStr, '', st.cStr.trim() !== pf.cDefault ? `기본 ${pf.cDefault} → 수정` : '기본값'] as (string | number)[]]
      : []),
    ['유량 Q', triDisplay.Q, flowLabel, auto('Q')],
    ['유속 V', triDisplay.V, 'm/s', auto('V')],
    ['관 내경 D', triDisplay.D, 'mm', auto('D')],
    ['배관 길이 L', st.L, 'm', ''],
    ['', '', '', ''],
    ['동점성계수 ν', res.nu_m2s.toExponential(4), 'm²/s', '자동 산출'],
    ['밀도 ρ', res.rho_kgm3.toFixed(4), 'kg/m³', '자동 산출'],
    ['레이놀즈수 Re', res.Re.toFixed(0), '-', `${regime.label} (${formatRe(res.Re)})`],
    ['상대조도 ε/D', res.relRough.toExponential(4), '-', ''],
    ['마찰계수 f', res.f.toFixed(6), '-', fMethodLabel(res.fMethod)],
    ['Swamee-Jain 검산', res.fSwameeJain !== null ? res.fSwameeJain.toFixed(6) : '적용범위 외', '-', ''],
    ['', '', '', ''],
    ['[D-W] 총 마찰손실 ΔP', deltaP_unit.toFixed(pressDef.dp), pressDef.label, ''],
    ['[D-W] 단위 마찰손실', unitLoss_unit.toFixed(pressDef.dpM), `${pressDef.label}/m`, ''],
    ['[D-W] 수두 hL', res.hL_m.toFixed(4), 'm', ''],
  ];

  if (res.hw) {
    const hwDeltaP_unit = res.hw.deltaP_Pa * pressDef.factor;
    rows.push(
      ['[H-W] 총 마찰손실 ΔP', hwDeltaP_unit.toFixed(pressDef.dp), pressDef.label, `C=${res.hw.C}`],
      ['[H-W] 수두 hL', res.hw.hL_m.toFixed(4), 'm', ''],
      ['[H-W] D-W 대비', `${(100 * (res.hw.hL_m - res.hL_m) / res.hL_m).toFixed(1)}%`, '', ''],
    );
  } else {
    rows.push(['[H-W]', '미적용', '', '물 전용 경험식 — 현재 유체 비대상']);
  }

  return rows;
}
