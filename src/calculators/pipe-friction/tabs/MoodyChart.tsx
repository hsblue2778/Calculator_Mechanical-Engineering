// 마찰저항선도 (Moody diagram) — log-log SVG 직접 렌더
// 현재 조건 ε/D 곡선(전 영역: 층류 64/Re·천이 보간·난류 Colebrook-White)을 강조하고 운전점 (Re, f)을 표시.
// 곡선 산출은 engine.ts의 동일 함수를 재사용하므로 수치 결과와 선도가 항상 일치한다.

import { useMemo } from 'react';
import {
  colebrookWhite, frictionFactor, RE_LAMINAR_MAX, RE_TURBULENT_MIN,
  type PipeFrictionResult,
} from '../engine.ts';
import { fMethodLabel } from '../interpret.ts';
import { C } from '../styles';

// 플롯 영역 (viewBox 720×400)
const W = 720, H = 400;
const X0 = 50, X1 = 660, Y0 = 26, Y1 = 360;

// 배경 ε/D 곡선군 — 표준 Moody 선도 구성
const FAMILY: { rr: number; label: string }[] = [
  { rr: 0,     label: '매끈관' },
  { rr: 1e-5,  label: '10⁻⁵' },
  { rr: 1e-4,  label: '10⁻⁴' },
  { rr: 5e-4,  label: '5×10⁻⁴' },
  { rr: 1e-3,  label: '10⁻³' },
  { rr: 5e-3,  label: '5×10⁻³' },
  { rr: 0.01,  label: '0.01' },
  { rr: 0.02,  label: '0.02' },
  { rr: 0.05,  label: '0.05' },
];

// log 축 눈금 후보 가수 (예: 0.005, 0.007, 0.01, 0.015 …)
const TICK_MANTISSAS = [1, 1.5, 2, 3, 4, 5, 7];

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function sup(n: number): string {
  const s = Math.abs(n).toString().split('').map(d => SUP[Number(d)]).join('');
  return (n < 0 ? '⁻' : '') + s;
}

/** 2.99×10⁵ 형식 */
function fmtSci(v: number, dp = 2): string {
  const e = Math.floor(Math.log10(v));
  const m = v / Math.pow(10, e);
  return e === 0 ? m.toFixed(dp) : `${m.toFixed(dp)}×10${sup(e)}`;
}

function tickFloor(v: number): number {
  const d = Math.floor(Math.log10(v));
  const cands = TICK_MANTISSAS.map(m => m * Math.pow(10, d)).filter(c => c <= v * 1.0001);
  return cands.length ? Math.max(...cands) : Math.pow(10, d);
}

function tickCeil(v: number): number {
  for (let d = Math.floor(Math.log10(v)); ; d++) {
    const cands = TICK_MANTISSAS.map(m => m * Math.pow(10, d)).filter(c => c >= v * 0.9999);
    if (cands.length) return Math.min(...cands);
  }
}

function logTicks(min: number, max: number): number[] {
  const out: number[] = [];
  for (let d = Math.floor(Math.log10(min)); d <= Math.ceil(Math.log10(max)); d++) {
    for (const m of TICK_MANTISSAS) {
      const v = m * Math.pow(10, d);
      if (v >= min * 0.999 && v <= max * 1.001) out.push(v);
    }
  }
  return out;
}

function logRange(a: number, b: number, n: number): number[] {
  const la = Math.log10(a), lb = Math.log10(b);
  return Array.from({ length: n }, (_, i) => Math.pow(10, la + ((lb - la) * i) / (n - 1)));
}

export default function MoodyChart({ res }: { res: PipeFrictionResult }) {
  const m = useMemo(() => buildModel(res.Re, res.f, res.relRough), [res.Re, res.f, res.relRough]);

  const chip = `Re = ${fmtSci(res.Re)} · f = ${res.f.toPrecision(4)}`;
  const chipRight = m.px > X1 - 175;            // 우측 가장자리 근접 시 라벨 좌측 배치
  const chipBelow = m.py < Y0 + 48;             // 상단 근접 시 라벨 하단 배치
  const chipX = chipRight ? m.px - 12 : m.px + 12;
  const chipY = chipBelow ? m.py + 22 : m.py - 26;
  const halo = { paintOrder: 'stroke' as const, stroke: C.surface, strokeWidth: 3.5, strokeLinejoin: 'round' as const };

  return (
    <div style={{
      backgroundColor: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 8, padding: '16px 20px',
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.heading }}>
        마찰저항선도 <span style={{ fontSize: 11, fontWeight: 400, color: C.text }}>— Moody Diagram</span>
      </div>
      <div style={{ fontSize: 11, color: C.text, margin: '2px 0 10px' }}>
        강조 곡선 = 현재 조건 ε/D · ● 운전점 · 층류 64/Re — 천이 3차 보간 — 난류 Colebrook-White
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img" aria-label={`Moody 선도 — 운전점 ${chip}`}>
        <defs>
          <clipPath id="pf-moody-clip"><rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} /></clipPath>
        </defs>

        {/* 천이역 음영 + 영역 경계 (Re 2,300 / 4,000) */}
        <rect x={m.x(RE_LAMINAR_MAX)} y={Y0} width={m.x(RE_TURBULENT_MIN) - m.x(RE_LAMINAR_MAX)} height={Y1 - Y0}
          fill={C.surfaceAlt} opacity={0.75} />
        {[RE_LAMINAR_MAX, RE_TURBULENT_MIN].map(re => (
          <line key={re} x1={m.x(re)} y1={Y0} x2={m.x(re)} y2={Y1}
            stroke={C.borderInput} strokeDasharray="4 3" opacity={0.8} />
        ))}
        <text x={(X0 + m.x(RE_LAMINAR_MAX)) / 2} y={Y0 + 13} textAnchor="middle" fontSize={10} fill={C.text}>층류</text>
        <text x={(m.x(RE_LAMINAR_MAX) + m.x(RE_TURBULENT_MIN)) / 2} y={Y0 + 13} textAnchor="middle" fontSize={10} fill={C.text}>천이</text>
        <text x={(m.x(RE_TURBULENT_MIN) + X1) / 2} y={Y0 + 13} textAnchor="middle" fontSize={10} fill={C.text}>난류</text>

        {/* 격자 — x 부눈금(2~9×10ⁿ)·주눈금(10ⁿ)·y 눈금 */}
        {m.xMinor.map(v => (
          <line key={`xm${v}`} x1={m.x(v)} y1={Y0} x2={m.x(v)} y2={Y1} stroke={C.border} opacity={0.4} />
        ))}
        {m.xMajor.map(v => (
          <g key={`xM${v}`}>
            <line x1={m.x(v)} y1={Y0} x2={m.x(v)} y2={Y1} stroke={C.border} />
            <text x={m.x(v)} y={Y1 + 15} textAnchor="middle" fontSize={10} fill={C.text}>
              10{sup(Math.round(Math.log10(v)))}
            </text>
          </g>
        ))}
        {m.yTicks.map(v => (
          <g key={`y${v}`}>
            <line x1={X0} y1={m.y(v)} x2={X1} y2={m.y(v)} stroke={C.border} opacity={0.8} />
            <text x={X0 - 5} y={m.y(v) + 3} textAnchor="end" fontSize={10} fill={C.text}>
              {String(parseFloat(v.toPrecision(3)))}
            </text>
          </g>
        ))}
        <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} fill="none" stroke={C.borderInput} />

        {/* 축 제목 */}
        <text x={(X0 + X1) / 2} y={H - 6} textAnchor="middle" fontSize={11} fill={C.textDark}>레이놀즈수 Re</text>
        <text x={13} y={(Y0 + Y1) / 2} textAnchor="middle" fontSize={11} fill={C.textDark}
          transform={`rotate(-90 13 ${(Y0 + Y1) / 2})`}>마찰계수 f</text>
        <text x={X1 + 6} y={Y0 + 13} fontSize={9.5} fill={C.text}>ε/D</text>

        {/* 배경 ε/D 곡선군 */}
        <g clipPath="url(#pf-moody-clip)">
          {m.family.map(c => (
            <polyline key={c.label} points={c.points} fill="none" stroke={C.borderInput} strokeWidth={1} />
          ))}
          {/* 현재 조건 강조 곡선 (층류→천이→난류 연속) */}
          <polyline points={m.highlight} fill="none" stroke={C.blue} strokeWidth={2.2} strokeLinejoin="round" />
        </g>
        {m.family.map(c => (
          <text key={`l${c.label}`} x={X1 + 6} y={c.labelY + 3} fontSize={9.5} fill="var(--text-quaternary)">
            {c.label}
          </text>
        ))}

        {/* 운전점 — 크로스헤어 + 마커 + 라벨 */}
        <line x1={X0} y1={m.py} x2={m.px} y2={m.py} stroke={C.navy} strokeDasharray="3 3" opacity={0.55} />
        <line x1={m.px} y1={m.py} x2={m.px} y2={Y1} stroke={C.navy} strokeDasharray="3 3" opacity={0.55} />
        <circle cx={m.px} cy={m.py} r={5} fill={C.navy} stroke={C.surface} strokeWidth={2} />
        <text x={chipX} y={chipY} textAnchor={chipRight ? 'end' : 'start'} fontSize={11.5} fontWeight={600}
          fill={C.heading} style={halo}>{chip}</text>
        <text x={chipX} y={chipY + 14} textAnchor={chipRight ? 'end' : 'start'} fontSize={10}
          fill={C.text} style={halo}>{fMethodLabel(res.fMethod)}{res.fMethod === 'override' ? ' — 곡선과 무관' : ''}</text>
      </svg>

      <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 8 }}>
        현재 ε/D = {fmtSci(res.relRough)} (ε = {res.eps_mm} mm, D = {(res.D_m * 1000).toFixed(1)} mm)
        {res.fMethod === 'override' ? ' · f 수동 입력 — 운전점이 ε/D 곡선에서 벗어날 수 있습니다' : ''}
      </div>
    </div>
  );
}

// ── 좌표 모델 (res 변경 시에만 재계산) ────────────────────────────
function buildModel(Re: number, f: number, relRough: number) {
  // 도메인: 표준 Moody 범위(6×10²~10⁸ · 0.005~0.1), 운전점이 벗어나면 눈금 단위로 확장
  const xMin = Math.min(600, Math.pow(10, Math.floor(Math.log10(Re * 0.5))));
  const xMax = Math.max(1e8, Math.pow(10, Math.ceil(Math.log10(Re * 2))));
  const yMin = tickFloor(Math.min(0.005, f * 0.7));
  const yMax = tickCeil(Math.max(0.1, f * 1.15));

  const lx0 = Math.log10(xMin), lx1 = Math.log10(xMax);
  const ly0 = Math.log10(yMin), ly1 = Math.log10(yMax);
  const x = (re: number) => X0 + ((Math.log10(re) - lx0) / (lx1 - lx0)) * (X1 - X0);
  const y = (ff: number) => Y1 - ((Math.log10(ff) - ly0) / (ly1 - ly0)) * (Y1 - Y0);

  const xMajor: number[] = [];
  for (let d = Math.ceil(lx0); d <= Math.floor(lx1); d++) xMajor.push(Math.pow(10, d));
  const xMinor: number[] = [];
  for (let d = Math.floor(lx0); d <= Math.floor(lx1); d++) {
    for (let mm = 2; mm <= 9; mm++) {
      const v = mm * Math.pow(10, d);
      if (v > xMin && v < xMax) xMinor.push(v);
    }
  }
  const yTicks = logTicks(yMin, yMax);

  const toPts = (arr: [number, number][]) =>
    arr.map(([re, ff]) => `${x(re).toFixed(1)},${y(ff).toFixed(1)}`).join(' ');

  // 배경 곡선군 (난류역만) — 현재 ε/D와 사실상 같은 곡선은 중복 제거
  const turbRe = logRange(RE_TURBULENT_MIN, xMax, 60);
  const family = FAMILY
    .filter(c => (relRough === 0 ? c.rr !== 0 : c.rr === 0 || Math.abs(Math.log10(c.rr / relRough)) > 0.04))
    .map(c => {
      const pts: [number, number][] = turbRe.map(re => [re, colebrookWhite(re, c.rr).f]);
      const fEnd = pts[pts.length - 1][1];
      return { label: c.label, points: toPts(pts), labelY: y(Math.min(Math.max(fEnd, yMin), yMax)) };
    });
  // 우측 끝 라벨 겹침 방지 — 위→아래로 최소 11px 간격 확보 후 하단 초과분 되밀기
  const order = family.map((_, i) => i).sort((a, b) => family[a].labelY - family[b].labelY);
  for (let k = 1; k < order.length; k++) {
    const prev = family[order[k - 1]], cur = family[order[k]];
    if (cur.labelY < prev.labelY + 11) cur.labelY = prev.labelY + 11;
  }
  for (let k = order.length - 1; k >= 0; k--) {
    const cur = family[order[k]];
    const next = k < order.length - 1 ? family[order[k + 1]] : null;
    const cap = next ? next.labelY - 11 : Y1 + 4;
    if (cur.labelY > cap) cur.labelY = cap;
  }

  // 강조 곡선 — 층류(64/Re, 상단 진입점부터)→천이→난류 전 구간을 엔진 함수로 샘플링
  const lamStart = Math.max(xMin, 64 / yMax);
  const reSamples = [
    ...(lamStart < RE_LAMINAR_MAX ? logRange(lamStart, RE_LAMINAR_MAX, 14) : []),
    ...logRange(RE_LAMINAR_MAX, RE_TURBULENT_MIN, 12).slice(1),
    ...logRange(RE_TURBULENT_MIN, xMax, 80).slice(1),
  ];
  const highlight = toPts(reSamples.map(re => [re, frictionFactor(re, relRough).f]));

  return { x, y, xMajor, xMinor, yTicks, family, highlight, px: x(Re), py: y(f) };
}
