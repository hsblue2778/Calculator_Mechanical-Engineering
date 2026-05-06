// HVAC 펌프 시스템 — 예시 탭
// 프리셋 클릭 → 계산 탭에 값 주입
//
// 본 프리셋은 일반적인 HVAC 펌프 계산 시나리오를 학습용으로 제공합니다.
// 실제 카탈로그 모델·프로젝트 사양과는 무관합니다.

import type { ScheduleId } from '../../../data/pipeSizes';
import type { EquipKind } from '../calc';

export interface PumpHvacPresetData {
  label: string;
  description: string;
  systemMode: 'open' | 'closed';
  fluid: 'water' | 'cooling-water' | 'hot-water';
  tempC: number;
  Q_m3h: number;
  sucPipes: { nominalA: number; L_m: number; materialId: string; scheduleId?: ScheduleId }[];
  disPipes: { nominalA: number; L_m: number; materialId: string; scheduleId?: ScheduleId }[];
  fittings: {
    fittingId: string;
    pipeRefSide: 'suction' | 'discharge';
    pipeRefIndex: number;
    qty: number;
  }[];
  equipItems: {
    name: string;
    dP_kPa: number;
    pipeRefSide: 'suction' | 'discharge';
    pipeRefIndex: number;
    kind?: EquipKind;
  }[];
  Hs_m: number;
  Hd_m: number;
  Pres_kPa: number;
  Patm_kPa?: number; // 폐회로 시 P_fill (kPa, 절대압). 미지정 시 101.325
}

interface Props {
  onLoad: (preset: PumpHvacPresetData) => void;
}

// 학습용 프리셋 (가상 시나리오)
const PRESETS: PumpHvacPresetData[] = [
  // ── 예시 1: 소형 냉각수 순환 (개방계) ──────
  {
    label: '예시 1 — 소형 냉각수 순환',
    description:
      '냉각수 25°C, Q=90 m³/h, DN100 SGP. 흡입 8m, 토출 50m. ' +
      '부속(흡입) 90°엘보×2·게이트밸브×1, (토출) 90°엘보×6·게이트밸브×2·스윙체크×1. ' +
      '장비 열교환기 50 kPa·컨트롤밸브 25 kPa. Hs=+2m, Hd=8m, 잔류토출압=0 kPa. 개방계.',
    systemMode: 'open',
    fluid: 'cooling-water',
    tempC: 25,
    Q_m3h: 90,
    sucPipes: [{ nominalA: 100, L_m: 8, materialId: 'sgp', scheduleId: 'ks-std' }],
    disPipes: [{ nominalA: 100, L_m: 50, materialId: 'sgp', scheduleId: 'ks-std' }],
    fittings: [
      { fittingId: 'elbow-90-standard', pipeRefSide: 'suction', pipeRefIndex: 0, qty: 2 },
      { fittingId: 'gate-valve-open',   pipeRefSide: 'suction', pipeRefIndex: 0, qty: 1 },
      { fittingId: 'elbow-90-standard', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 6 },
      { fittingId: 'gate-valve-open',   pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 2 },
      { fittingId: 'swing-check-valve', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 1 },
    ],
    equipItems: [
      { name: '열교환기',     dP_kPa: 50, pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'heat-exchanger' },
      { name: '컨트롤 밸브',  dP_kPa: 25, pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'control-valve' },
    ],
    Hs_m: 2,
    Hd_m: 8,
    Pres_kPa: 0,
  },

  // ── 예시 2: 중형 냉수 순환 (폐회로) ──────
  {
    label: '예시 2 — 중형 냉수 순환 (폐회로)',
    description:
      '냉수 7°C, Q=200 m³/h, DN200 SGP. 흡입 6m, 토출 80m. ' +
      '부속(흡입) 90°엘보×2·게이트밸브×1, (토출) 90°엘보×4·게이트밸브×2·스윙체크×1. ' +
      '장비 증발기 60 kPa·코일 35 kPa·컨트롤밸브 30 kPa. Hs=0m, Hd=0m, 잔류토출압=0 kPa. 폐회로.',
    systemMode: 'closed',
    fluid: 'water',
    tempC: 7,
    Q_m3h: 200,
    sucPipes: [{ nominalA: 200, L_m: 6, materialId: 'sgp', scheduleId: 'ks-std' }],
    disPipes: [{ nominalA: 200, L_m: 80, materialId: 'sgp', scheduleId: 'ks-std' }],
    fittings: [
      { fittingId: 'elbow-90-standard', pipeRefSide: 'suction', pipeRefIndex: 0, qty: 2 },
      { fittingId: 'gate-valve-open',   pipeRefSide: 'suction', pipeRefIndex: 0, qty: 1 },
      { fittingId: 'elbow-90-standard', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 4 },
      { fittingId: 'gate-valve-open',   pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 2 },
      { fittingId: 'swing-check-valve', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 1 },
    ],
    equipItems: [
      { name: '증발기',       dP_kPa: 60, pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'heat-exchanger' },
      { name: '코일',         dP_kPa: 35, pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'heat-exchanger' },
      { name: '컨트롤 밸브',  dP_kPa: 30, pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'control-valve' },
    ],
    Hs_m: 0,
    Hd_m: 0,
    Pres_kPa: 0,
  },

  // ── 예시 3: 대형 냉각탑 펌프 (개방계) ──────
  {
    label: '예시 3 — 대형 냉각탑 펌프',
    description:
      '냉각수 20°C, Q=600 m³/h, DN300 SGP. 흡입 8m, 토출 150m. ' +
      '부속(흡입) 90°엘보×2·게이트밸브×1, (토출) 90°엘보×6·게이트밸브×2·스윙체크×1. ' +
      '장비 응축기 80 kPa·컨트롤밸브 50 kPa. Hs=+2m, Hd=20m, 잔류토출압=100 kPa. 개방계.',
    systemMode: 'open',
    fluid: 'cooling-water',
    tempC: 20,
    Q_m3h: 600,
    sucPipes: [{ nominalA: 300, L_m: 8, materialId: 'sgp', scheduleId: 'ks-std' }],
    disPipes: [{ nominalA: 300, L_m: 150, materialId: 'sgp', scheduleId: 'ks-std' }],
    fittings: [
      { fittingId: 'elbow-90-standard', pipeRefSide: 'suction', pipeRefIndex: 0, qty: 2 },
      { fittingId: 'gate-valve-open',   pipeRefSide: 'suction', pipeRefIndex: 0, qty: 1 },
      { fittingId: 'elbow-90-standard', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 6 },
      { fittingId: 'gate-valve-open',   pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 2 },
      { fittingId: 'swing-check-valve', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 1 },
    ],
    equipItems: [
      { name: '응축기',       dP_kPa: 80, pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'heat-exchanger' },
      { name: '컨트롤 밸브',  dP_kPa: 50, pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'control-valve' },
    ],
    Hs_m: 2,
    Hd_m: 20,
    Pres_kPa: 100,
  },

  // ── 예시 4: 폐회로 가열수 펌프 ──────
  {
    label: '예시 4 — 폐회로 가열수 펌프',
    description:
      '온수 60°C, Q=120 m³/h, DN150 SGP. 흡입 5m, 토출 60m. ' +
      '부속(흡입) 90°엘보×2·게이트밸브×1, (토출) 90°엘보×4·게이트밸브×2·스윙체크×1. ' +
      '장비 보일러 40 kPa·코일 30 kPa·컨트롤밸브 25 kPa. Hs=0m, Hd=0m, 잔류토출압=0 kPa. 폐회로.',
    systemMode: 'closed',
    fluid: 'hot-water',
    tempC: 60,
    Q_m3h: 120,
    sucPipes: [{ nominalA: 150, L_m: 5, materialId: 'sgp', scheduleId: 'ks-std' }],
    disPipes: [{ nominalA: 150, L_m: 60, materialId: 'sgp', scheduleId: 'ks-std' }],
    fittings: [
      { fittingId: 'elbow-90-standard', pipeRefSide: 'suction', pipeRefIndex: 0, qty: 2 },
      { fittingId: 'gate-valve-open',   pipeRefSide: 'suction', pipeRefIndex: 0, qty: 1 },
      { fittingId: 'elbow-90-standard', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 4 },
      { fittingId: 'gate-valve-open',   pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 2 },
      { fittingId: 'swing-check-valve', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 1 },
    ],
    equipItems: [
      { name: '보일러',       dP_kPa: 40, pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'heat-exchanger' },
      { name: '코일',         dP_kPa: 30, pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'heat-exchanger' },
      { name: '컨트롤 밸브',  dP_kPa: 25, pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'control-valve' },
    ],
    Hs_m: 0,
    Hd_m: 0,
    Pres_kPa: 0,
  },

  // ── 예시 5: 소형 응축수 이송 펌프 ──────
  {
    label: '예시 5 — 소형 응축수 이송',
    description:
      '응축수 80°C, Q=10 m³/h, DN50 SGP. 흡입 4m, 토출 30m. ' +
      '부속(흡입) 90°엘보×2·게이트밸브×1, (토출) 90°엘보×4·게이트밸브×1·스윙체크×1. ' +
      '장비 응축수탱크 입구 20 kPa. Hs=-1m, Hd=10m, 잔류토출압=50 kPa. 개방계.',
    systemMode: 'open',
    fluid: 'water',
    tempC: 80,
    Q_m3h: 10,
    sucPipes: [{ nominalA: 50, L_m: 4, materialId: 'sgp', scheduleId: 'ks-std' }],
    disPipes: [{ nominalA: 50, L_m: 30, materialId: 'sgp', scheduleId: 'ks-std' }],
    fittings: [
      { fittingId: 'elbow-90-standard', pipeRefSide: 'suction', pipeRefIndex: 0, qty: 2 },
      { fittingId: 'gate-valve-open',   pipeRefSide: 'suction', pipeRefIndex: 0, qty: 1 },
      { fittingId: 'elbow-90-standard', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 4 },
      { fittingId: 'gate-valve-open',   pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 1 },
      { fittingId: 'swing-check-valve', pipeRefSide: 'discharge', pipeRefIndex: 0, qty: 1 },
    ],
    equipItems: [
      { name: '응축수탱크 입구', dP_kPa: 20, pipeRefSide: 'discharge', pipeRefIndex: 0, kind: 'other' },
    ],
    Hs_m: -1,
    Hd_m: 10,
    Pres_kPa: 50,
  },
];

export default function ExamplesTab({ onLoad }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>
        프리셋을 클릭하면 계산 탭에 값이 자동 입력됩니다. 시스템 모드·다중 배관 행이 모두 복원됩니다.
      </p>

      {PRESETS.map((preset, i) => (
        <div
          key={i}
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: 16,
            cursor: 'pointer',
            transition: 'box-shadow 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
          onClick={() => onLoad(preset)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
              {preset.label}
            </p>
            <span style={{
              fontSize: 12, color: 'var(--accent-primary)',
              backgroundColor: 'var(--accent-primary-bg-soft)', borderRadius: 4,
              padding: '2px 8px', whiteSpace: 'nowrap', marginLeft: 8,
            }}>
              적용
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.6 }}>
            {preset.description}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface-3)', borderRadius: 4, padding: '2px 8px' }}>
              Q = {preset.Q_m3h} m³/h
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface-3)', borderRadius: 4, padding: '2px 8px' }}>
              T = {preset.tempC}°C
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface-3)', borderRadius: 4, padding: '2px 8px' }}>
              흡입 {preset.sucPipes.length}구간 / 토출 {preset.disPipes.length}구간
            </span>
            <span style={{
              fontSize: 12, borderRadius: 4, padding: '2px 8px',
              color: preset.systemMode === 'closed' ? 'var(--state-info-text)' : 'var(--state-info)',
              backgroundColor: preset.systemMode === 'closed' ? 'var(--accent-primary-bg)' : 'var(--state-info-bg)',
            }}>
              {preset.systemMode === 'closed' ? '폐회로' : '개방계'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
