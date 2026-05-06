// 관마찰손실 결과 해석 — V·Re·단위손실을 한국 실무 관행 기준으로 분류하고 맥락 경고 생성
// 계산 자체는 calc.ts 참조

export interface Range {
  optMin: number;    optMax: number;
  allowMin: number;  allowMax: number;
  absMin: number;    absMax: number;
  unit: string;
  label: string;
}

// 한국 실무 관행 중간 엄격도 기준
export const RANGES: Record<'velocity' | 'unitLossPa', Range> = {
  velocity:   { optMin: 1.0,  optMax: 2.0,  allowMin: 0.6, allowMax: 3.0, absMin: 0.3, absMax: 4.0, unit: 'm/s', label: '유속 (V)' },
  unitLossPa: { optMin: 150,  optMax: 300,  allowMin: 100, allowMax: 400, absMin: 0,   absMax: 800, unit: 'Pa/m', label: '단위 마찰손실' },
};

export interface RegimeInfo {
  key: 'laminar' | 'transition' | 'turbulent' | 'none';
  label: string;
  color: string;
  desc: string;
}

export function flowRegime(Re: number): RegimeInfo {
  if (!Number.isFinite(Re) || Re <= 0) {
    return { key: 'none', label: '—', color: '#9CA3AF', desc: '' };
  }
  if (Re < 2300)  return { key: 'laminar',    label: '층류', color: '#10B981', desc: 'Re < 2,300' };
  if (Re < 4000)  return { key: 'transition', label: '천이', color: '#F59E0B', desc: '2,300 ≤ Re < 4,000' };
  return              { key: 'turbulent',  label: '난류', color: '#3B82F6', desc: 'Re ≥ 4,000' };
}

export type RangeStatusKey = 'opt' | 'allow' | 'low' | 'high' | 'none';

export interface RangeStatus {
  key: RangeStatusKey;
  label: string;
  color: string;
  bg: string;
}

export function rangeStatus(value: number, range: Range): RangeStatus {
  if (!Number.isFinite(value)) return { key: 'none',  label: '—',    color: '#9CA3AF', bg: '#F3F4F6' };
  if (value < range.allowMin)  return { key: 'low',   label: '저속', color: '#B45309', bg: '#FEF3C7' };
  if (value > range.allowMax)  return { key: 'high',  label: '과다', color: '#B91C1C', bg: '#FEE2E2' };
  if (value >= range.optMin && value <= range.optMax)
                               return { key: 'opt',   label: '최적', color: '#047857', bg: '#D1FAE5' };
                               return { key: 'allow', label: '허용', color: '#1D4ED8', bg: '#DBEAFE' };
}

export interface ContextWarning {
  level: 'error' | 'warn' | 'info';
  title: string;
  msg: string;
}

export function warnings(V: number, Re: number, unitLossPa: number): ContextWarning[] {
  const ws: ContextWarning[] = [];

  if (Number.isFinite(V) && V > 0) {
    if (V > 3.0)      ws.push({ level: 'error', title: '유속 과다',  msg: `${V.toFixed(2)} m/s — 소음·에로젼·수격 위험` });
    else if (V > 2.5) ws.push({ level: 'warn',  title: '유속 높음',  msg: `${V.toFixed(2)} m/s — 2.5 m/s 초과` });
    if (V < 0.6)      ws.push({ level: 'warn',  title: '저유속',     msg: `${V.toFixed(2)} m/s — 침전·공기정체 우려` });
  }

  if (Number.isFinite(unitLossPa) && unitLossPa > 0) {
    if (unitLossPa > 400)      ws.push({ level: 'warn', title: '단위손실 과다', msg: `${unitLossPa.toFixed(0)} Pa/m — 펌프 동력 낭비. 관경 상향 검토.` });
    else if (unitLossPa < 100) ws.push({ level: 'info', title: '단위손실 여유', msg: `${unitLossPa.toFixed(0)} Pa/m — 관경 축소 검토 가능` });
  }

  if (Number.isFinite(Re) && Re > 0 && Re < 2300) {
    ws.push({ level: 'info', title: '층류 유동', msg: 'f = 64/Re 적용 권장 (현재는 재질 기반 대표값)' });
  }

  return ws;
}

// Re 표기 (1,000 이상 → k 표기)
export function formatRe(Re: number): string {
  if (!Number.isFinite(Re) || Re <= 0) return '—';
  if (Re >= 10000) return `${(Re / 1000).toFixed(1)}k`;
  if (Re >= 1000)  return `${(Re / 1000).toFixed(2)}k`;
  return Re.toFixed(0);
}

// 게이지 라벨용 — RANGES → src/components/RangeGauge.tsx의 RangeSpec 형식
export function toRangeSpec(r: Range) {
  return {
    optMin: r.optMin, optMax: r.optMax,
    allowMin: r.allowMin, allowMax: r.allowMax,
    absMin: r.absMin, absMax: r.absMax,
  };
}
