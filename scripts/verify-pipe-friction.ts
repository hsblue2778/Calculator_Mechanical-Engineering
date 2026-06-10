// 관마찰손실 엔진 수치 검증 — 실제 엔진 코드를 import해 실행 (공식 중복 작성 없음)
//
// 실행: node scripts/verify-pipe-friction.ts
// (Node 22.18+ 타입 스트리핑 — tsconfig include 밖이므로 tsc -b 대상 아님)
//
// 기준값: 참조 엑셀 '마찰손실 계산기.xlsm' 캐시값 · 손계산 직접 대입 · 문헌 표 2/표 5

import {
  swameeJain, colebrookWhite, frictionFactor, resolveTriangle, hazenWilliamsHL,
  computePipeFriction, RE_LAMINAR_MAX, RE_TURBULENT_MIN, PF_G,
  type PipeFrictionInput,
} from '../src/calculators/pipe-friction/engine.ts';
import { pfKinematicViscosity, pfDensity } from '../src/data/fluidProperties.ts';
import { pfMaterial } from '../src/data/pipeRoughness.ts';

let pass = 0, fail = 0;
const rows: string[] = [];

function check(name: string, actual: number, expected: number, tol: number, note = '') {
  const ok = Number.isFinite(actual) && Math.abs(actual - expected) <= tol;
  if (ok) pass++; else fail++;
  rows.push(`${ok ? 'PASS' : 'FAIL'} | ${name} | actual=${actual} | expected=${expected} (±${tol}) ${note}`);
}

function checkTrue(name: string, cond: boolean, note = '') {
  if (cond) pass++; else fail++;
  rows.push(`${cond ? 'PASS' : 'FAIL'} | ${name} | ${note}`);
}

// ── 1. 유체 물성 ──────────────────────────────────────────────────
check('ν 물 0°C', pfKinematicViscosity('water', 0), 1.787e-6, 1e-12, '(엑셀 절점)');
check('ν 물 20°C', pfKinematicViscosity('water', 20), 1.004e-6, 1e-12, '(엑셀 절점)');
check('ν 물 25°C 보간', pfKinematicViscosity('water', 25), 0.9025e-6, 1e-12);
check('ν 물 100°C', pfKinematicViscosity('water', 100), 0.294e-6, 1e-12, '(엑셀 절점)');
check('ν 공기 20°C/760', pfKinematicViscosity('air', 20), 15.11e-6, 1e-12, '(엑셀 절점)');
check('ν 공기 -10°C/760', pfKinematicViscosity('air', -10), 12.42e-6, 1e-12, '(문헌 표 2)');
check('ν 공기 20°C/720', pfKinematicViscosity('air', 20, 720), 15.11e-6 * 760 / 720, 1e-12, '(표 2 1.586e-5와 ≤0.6%)');
check('ρ 물 20°C', pfDensity('water', 20), 998.2, 0.01, '(NIST)');
check('ρ 공기 0°C/760', pfDensity('air', 0), 1.293, 1e-6);
check('ρ 공기 20°C/760', pfDensity('air', 20), 1.20479, 0.0001, '(표 2 1.205)');
check('ρ 공기 20°C/720', pfDensity('air', 20, 720), 1.14138, 0.001, '(표 2 1.141)');
check('ν 수은 (표 5)', pfKinematicViscosity('mercury', 20), 1.16e-7, 1e-15);
check('ρ 글리세린 (표 5)', pfDensity('glycerin', 20), 1260, 1e-9);

// ── 2. 엑셀 공식 경로 패리티 (물 20°C · D=150mm · V=2m/s · ε=0.045 직접 대입) ──
const nu20 = pfKinematicViscosity('water', 20);
const Re_x = 2 * 0.15 / nu20;
check('Re 엑셀 패리티', Re_x, 298804.780876494, 0.01, '(엑셀 약식 캐시값)');

const rr_x = 0.045 / 1000 / 0.15;
const fSJ_x = swameeJain(Re_x, rr_x);
check('Swamee-Jain f 엑셀 패리티', fSJ_x, 0.01706748165649927, 1e-9, '(엑셀 캐시값)');

const hL_per_m_SJ = fSJ_x * (1 / 0.15) * 4 / (2 * PF_G);
check('D-W 수두손실 (S-J f 대입)', hL_per_m_SJ * 1000, 23.19739266938399, 0.001, 'mm/m — 엑셀 mmAq/m 수두 기준');

const cw_x = colebrookWhite(Re_x, rr_x);
checkTrue('Colebrook 수렴', cw_x.converged && cw_x.iterations <= 20 && cw_x.residual < 1e-10,
  `f=${cw_x.f.toFixed(7)}, iter=${cw_x.iterations}, residual=${cw_x.residual.toExponential(2)}`);
checkTrue('Colebrook vs S-J ±1.5%', Math.abs(cw_x.f - fSJ_x) / fSJ_x < 0.015,
  `diff=${(100 * (cw_x.f - fSJ_x) / fSJ_x).toFixed(2)}%`);

// ── 3. 삼각 관계 (엑셀 PHASE 1) ──────────────────────────────────
const triQ = resolveTriangle({ V: 2, D: 0.15 });
check('삼각 V+D→Q', triQ!.Q_m3s, Math.PI * 0.15 * 0.15 / 4 * 2, 1e-15, `(LPM=${(triQ!.Q_m3s * 60000).toFixed(3)})`);
const triV = resolveTriangle({ Q: triQ!.Q_m3s, D: 0.15 });
check('삼각 Q+D→V 왕복', triV!.V_ms, 2, 1e-12);
const triD = resolveTriangle({ Q: triQ!.Q_m3s, V: 2 });
check('삼각 Q+V→D 왕복', triD!.D_m, 0.15, 1e-12);

// ── 4. 영역별 마찰계수 ────────────────────────────────────────────
// 층류: 물 20°C, D=20mm, V=0.1
const Re_lam = 0.1 * 0.02 / nu20;
check('층류 Re', Re_lam, 1992.03, 0.01);
const ff_lam = frictionFactor(Re_lam, 0.046 / 1000 / 0.02);
checkTrue('층류 f=64/Re', ff_lam.method === 'laminar' && Math.abs(ff_lam.f - 64 / Re_lam) < 1e-15,
  `f=${ff_lam.f.toFixed(7)}`);

// 천이 연속성·단조성 (rr 3종)
for (const rr of [1e-6, 3e-4, 0.0333]) {
  const fStart = frictionFactor(RE_LAMINAR_MAX, rr);
  check(`천이 시작 연속 (rr=${rr})`, fStart.f, 64 / RE_LAMINAR_MAX, 1e-12);
  const fEnd = frictionFactor(RE_TURBULENT_MIN, rr);
  const cwEnd = colebrookWhite(RE_TURBULENT_MIN, rr);
  check(`천이 끝 연속 (rr=${rr})`, fEnd.f, cwEnd.f, 1e-12);
  let monotone = true;
  let prev = fStart.f;
  const sign = Math.sign(cwEnd.f - fStart.f);
  for (let Re = 2350; Re <= 4000; Re += 50) {
    const fi = frictionFactor(Re, rr).f;
    if (Math.sign(fi - prev) !== sign && fi !== prev) monotone = false;
    prev = fi;
  }
  checkTrue(`천이 단조 (rr=${rr})`, monotone);
}

// Colebrook 저Re·고조도 스트레스
const cwStress = colebrookWhite(4100, 0.5 / 15);
checkTrue('Colebrook 스트레스 (Re=4100, ε/D=0.0333)', cwStress.converged && cwStress.residual < 1e-10,
  `f=${cwStress.f.toFixed(5)}, iter=${cwStress.iterations}`);

// ── 5. 종합 계산 (computePipeFriction) ────────────────────────────
const sts = pfMaterial('sts304');
const baseInput: PipeFrictionInput = {
  fluid: 'water', tempC: 20,
  eps_mm: sts.eps_mm.new, hazenC: sts.hazenC.new,
  known: { V: 2, D: 0.15 }, L_m: 100,
};
const resBase = computePipeFriction(baseInput)!;
checkTrue('기본 케이스 (STS304 신관 ε=0.015) 산출', !!resBase && resBase.fMethod === 'colebrook' && resBase.fConverged,
  `f=${resBase.f.toFixed(6)}, S-J=${resBase.fSwameeJain!.toFixed(6)}, ΔP/L=${resBase.deltaP_per_m_Pa.toFixed(2)} Pa/m, ` +
  `hL/L=${(resBase.hL_per_m * 1000).toFixed(3)} mm/m, ΔP=${(resBase.deltaP_Pa / 1000).toFixed(3)} kPa`);
checkTrue('파생 필드 = Q', resBase.derived === 'Q', `Q=${(resBase.Q_m3s * 60000).toFixed(2)} LPM`);

// ε 수정 → f·손실 재계산 확인
const resEps = computePipeFriction({ ...baseInput, eps_mm: 0.045 })!;
checkTrue('ε 수정 재계산 (0.015→0.045)', Math.abs(resEps.f - resBase.f) / resBase.f > 0.02,
  `f ${resBase.f.toFixed(6)} → ${resEps.f.toFixed(6)}`);
// ε=0.045 주입 시 엑셀 S-J 캐시값 재현
check('ε=0.045 주입 S-J 패리티', resEps.fSwameeJain!, 0.01706748165649927, 1e-9);

// C 수정 → H-W 재계산 확인
const resC = computePipeFriction({ ...baseInput, hazenC: 100 })!;
checkTrue('C 수정 재계산 (150→100)', resC.hw!.hL_m > resBase.hw!.hL_m * 1.5,
  `hL ${resBase.hw!.hL_m.toFixed(4)} → ${resC.hw!.hL_m.toFixed(4)} m`);

// f 오버라이드
const resOv = computePipeFriction({ ...baseInput, fOverride: 0.02 })!;
checkTrue('f 오버라이드', resOv.fMethod === 'override' && resOv.f === 0.02 && resOv.fSwameeJain !== null);

// ── 6. Hazen-Williams 직접 대입 ───────────────────────────────────
const Q_x = triQ!.Q_m3s;
const hwDirect = 10.67 * 1 * Math.pow(Q_x, 1.852) / (Math.pow(150, 1.852) * Math.pow(0.15, 4.871));
check('H-W 공식 직접 대입 (C=150, L=1)', hazenWilliamsHL(Q_x, 0.15, 1, 150), hwDirect, hwDirect * 0.005,
  `hL=${hwDirect.toFixed(6)} m/m`);

// ── 7. 공기 (압력 포함) ───────────────────────────────────────────
const steel = pfMaterial('steel');
const resAir = computePipeFriction({
  fluid: 'air', tempC: 20, pressureMmHg: 760,
  eps_mm: steel.eps_mm.new, hazenC: steel.hazenC.new,
  known: { V: 2, D: 0.15 }, L_m: 100,
})!;
check('공기 Re', resAir.Re, 19854.4, 0.5);
checkTrue('공기 H-W 미적용', resAir.hw === null);
checkTrue('공기 ΔP/L', Math.abs(resAir.deltaP_per_m_Pa - 0.427) < 0.01,
  `f=${resAir.f.toFixed(6)}, ΔP/L=${resAir.deltaP_per_m_Pa.toFixed(4)} Pa/m`);

// ── 8. 고정값 유체 ────────────────────────────────────────────────
const resGly = computePipeFriction({
  fluid: 'glycerin', tempC: 20,
  eps_mm: steel.eps_mm.new, hazenC: steel.hazenC.new,
  known: { V: 2, D: 0.15 }, L_m: 10,
})!;
check('글리세린 Re (층류)', resGly.Re, 0.3 / 1.18e-3, 0.01);
checkTrue('글리세린 f=64/Re', resGly.fMethod === 'laminar' && Math.abs(resGly.f - 64 / resGly.Re) < 1e-15,
  `Re=${resGly.Re.toFixed(1)}, f=${resGly.f.toFixed(5)}`);
checkTrue('글리세린 H-W 미적용·S-J 범위외', resGly.hw === null && resGly.fSwameeJain === null);

const resHg = computePipeFriction({
  fluid: 'mercury', tempC: 20,
  eps_mm: steel.eps_mm.new, hazenC: steel.hazenC.new,
  known: { V: 2, D: 0.15 }, L_m: 10,
})!;
check('수은 Re (난류)', resHg.Re, 0.3 / 1.16e-7, 1);
checkTrue('수은 Colebrook', resHg.fMethod === 'colebrook' && resHg.fConverged, `f=${resHg.f.toFixed(6)}`);

// ── 9. 검증 실패 케이스 (null 반환) ──────────────────────────────
checkTrue('온도 범위 초과 → null',
  computePipeFriction({ ...baseInput, tempC: 150 }) === null);
checkTrue('삼각 입력 1개 → null',
  computePipeFriction({ ...baseInput, known: { V: 2 } }) === null);
checkTrue('압력 범위 초과 → null',
  computePipeFriction({ ...baseInput, fluid: 'air', pressureMmHg: 2000 }) === null);
checkTrue('음수 L → null',
  computePipeFriction({ ...baseInput, L_m: -1 }) === null);

// ── 출력 ──────────────────────────────────────────────────────────
console.log(rows.join('\n'));
console.log(`\n총 ${pass + fail}건 — PASS ${pass} / FAIL ${fail}`);
if (fail > 0) process.exitCode = 1;
