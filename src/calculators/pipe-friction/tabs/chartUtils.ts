// 관마찰손실 — log-log SVG 선도 공통 헬퍼 (MoodyChart · FrictionLossChart 공용)

import { C } from '../styles';

const SUP_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

export function sup(n: number): string {
  const s = Math.abs(n).toString().split('').map(d => SUP_DIGITS[Number(d)]).join('');
  return (n < 0 ? '⁻' : '') + s;
}

/** 2.99×10⁵ 형식 */
export function fmtSci(v: number, dp = 2): string {
  const e = Math.floor(Math.log10(v));
  const m = v / Math.pow(10, e);
  return e === 0 ? m.toFixed(dp) : `${m.toFixed(dp)}×10${sup(e)}`;
}

/** v 이하의 가장 가까운 log 눈금값 */
export function tickFloor(v: number, mantissas: readonly number[]): number {
  const d = Math.floor(Math.log10(v));
  const cands = mantissas.map(m => m * Math.pow(10, d)).filter(c => c <= v * 1.0001);
  return cands.length ? Math.max(...cands) : Math.pow(10, d);
}

/** v 이상의 가장 가까운 log 눈금값 */
export function tickCeil(v: number, mantissas: readonly number[]): number {
  for (let d = Math.floor(Math.log10(v)); ; d++) {
    const cands = mantissas.map(m => m * Math.pow(10, d)).filter(c => c >= v * 0.9999);
    if (cands.length) return Math.min(...cands);
  }
}

export function logTicks(min: number, max: number, mantissas: readonly number[]): number[] {
  const out: number[] = [];
  for (let d = Math.floor(Math.log10(min)); d <= Math.ceil(Math.log10(max)); d++) {
    for (const m of mantissas) {
      const v = m * Math.pow(10, d);
      if (v >= min * 0.999 && v <= max * 1.001) out.push(v);
    }
  }
  return out;
}

export function logRange(a: number, b: number, n: number): number[] {
  const la = Math.log10(a), lb = Math.log10(b);
  return Array.from({ length: n }, (_, i) => Math.pow(10, la + ((lb - la) * i) / (n - 1)));
}

/** SVG 텍스트 후광(배경색 테두리) — 격자·곡선 위 라벨 가독성 확보 */
export const HALO = {
  paintOrder: 'stroke',
  stroke: C.surface,
  strokeWidth: 3.5,
  strokeLinejoin: 'round',
} as const;
