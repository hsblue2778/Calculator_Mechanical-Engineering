// 마찰손실 계통 계산기 수치 검증 — 실제 엔진 코드를 import해 실행 (공식 중복 작성 없음)
//
// 실행: node scripts/verify-friction-network.ts
// (Node 22.18+ 타입 스트리핑 — tsconfig include 밖이므로 tsc -b 대상 아님)
//
// 기준값: 참조 엑셀 '마찰손실 계통 계산기' 캐시값(S01~S03 샘플) · 공식 직접 대입값

import {
  computeNetwork, validateSettings,
  type FNSettings, type FNSegmentInput,
} from '../src/calculators/friction-network/calc.ts';
import { fnFluidProps } from '../src/calculators/friction-network/fluids.ts';
import {
  FN_V_LIMIT_DEFAULTS, FN_PA_PER_MMAQ, FN_STD_ATM_BAR,
} from '../src/data/frictionNetworkRef.ts';
import { swameeJain, frictionFactor } from '../src/calculators/pipe-friction/engine.ts';
import { fnSuggestDe, fnSnapStandard } from '../src/calculators/friction-network/design.ts';

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

// 기본 설정: 물 20°C · LPM · 배관 (엑셀 샘플 조건)
function baseSettings(over: Partial<FNSettings> = {}): FNSettings {
  return {
    systemType: 'pipe', fluid: 'water', tempC: 20, pressAbs_bar: FN_STD_ATM_BAR,
    pAvail_Pa: 70000, alpha: 0.1,
    vLimits: structuredClone(FN_V_LIMIT_DEFAULTS.pipe),
    flowUnit: 'LPM',
    ...over,
  };
}

// 기본 행: 강관 신관 원형
function seg(over: Partial<FNSegmentInput>): FNSegmentInput {
  return {
    id: 'S01', parentId: 'ROOT', grade: 'main', shape: 'circle',
    D_mm: 52.9, a_mm: NaN, b_mm: NaN, L_m: 20, sumK: 5, equipLoss_Pa: 0,
    materialId: 'steel', condition: 'new', terminalFlow: NaN, pReq_Pa: 0,
    ...over,
  };
}

// 엑셀 샘플 S01~S03 (물 20°C, LPM, 강관 신관, 전 구간 D=52.9)
const SAMPLE: FNSegmentInput[] = [
  seg({ id: 'S01', parentId: 'ROOT', grade: 'main', L_m: 20, sumK: 5 }),
  seg({ id: 'S02', parentId: 'S01', grade: 'branch', L_m: 10, sumK: 3, terminalFlow: 150, pReq_Pa: 15000 }),
  seg({ id: 'S03', parentId: 'S01', grade: 'branch', L_m: 12, sumK: 3, terminalFlow: 150, pReq_Pa: 15000 }),
];

// ── A. 엑셀 캐시값 일치 (≤1e-9) ──────────────────────────────────
{
  const res = computeNetwork(baseSettings(), SAMPLE)!;
  const [s01, s02, s03] = res.rows;
  check('A/S01 Q (자식합)', s01.Q_m3s, 0.005, 1e-9);
  check('A/S01 V', s01.V_ms, 2.274933881624142, 1e-9);
  check('A/S01 Re', s01.Re, 119864.544161272, 1e-9);
  check('A/S01 f (S-J)', s01.f, 0.021429908744578691, 1e-9);
  check('A/S01 ΔP마찰', s01.dpFriction_Pa, 20927.616728092416, 1e-9);
  check('A/S01 ΔP부차', s01.dpMinor_Pa, 12915.021455657788, 1e-9);
  check('A/S01 누적', s01.cum_Pa, 33842.638183750205, 1e-9);
  check('A/S01 mmAq', s01.cum_mmAq, 3450.9886845915994, 1e-9);
  check('A/S02 f', s02.f, 0.023153499317460934, 1e-9);
  check('A/S02 누적', s02.cum_Pa, 38606.242446130687, 1e-9);
  check('A/S02 누적+요구압', s02.cumPlusReq_Pa, 53606.242446130687, 1e-9);
  check('A/S03 ΔP마찰', s03.dpFriction_Pa, 3391.6212528381757, 1e-9);
  check('A/S03 누적', s03.cum_Pa, 39171.512654937047, 1e-9);
  check('A/S03 누적+요구압', s03.cumPlusReq_Pa, 54171.512654937047, 1e-9);
  checkTrue('A/말단여부 (S01 비말단·S02/S03 말단)', !s01.isLeaf && s02.isLeaf && s03.isLeaf);
  checkTrue('A/유속판정 전행 OK (배관 1~3)', s01.verdict === 'ok' && s02.verdict === 'ok' && s03.verdict === 'ok',
    `V=${s01.V_ms.toFixed(3)}/${s02.V_ms.toFixed(3)}/${s03.V_ms.toFixed(3)}`);
  checkTrue('A/최불리 = S03', res.worstId === 'S03');
  check('A/최불리 누적+요구압', res.worstDemand_Pa, 54171.512654937047, 1e-9);
  check('A/설계 가용정압 = P_avail×(1−α)', res.designAvail_Pa, 70000 * 0.9, 1e-9);
  check('A/여유', res.margin_Pa, 63000 - 54171.512654937047, 1e-9);
  checkTrue('A/에러 없음·압축성 경고 없음(물)', !res.hasErrors && res.rows.every(r => !r.compressWarn));
}

// ── B. 공식 직접 대입 ────────────────────────────────────────────
{
  // 물성 보간 + clamp
  const w25 = fnFluidProps({ fluid: 'water', tempC: 25, pressAbs_bar: FN_STD_ATM_BAR })!;
  check('B/물 25°C ρ 보간', w25.rho_kgm3, (998.2 + 995.7) / 2, 1e-9);
  check('B/물 25°C ν 보간', w25.nu_m2s, (1.004 + 0.801) / 2 * 1e-6, 1e-15);
  const wLo = fnFluidProps({ fluid: 'water', tempC: -10, pressAbs_bar: FN_STD_ATM_BAR })!;
  checkTrue('B/물 -10°C clamp → 0°C 절점', wLo.rho_kgm3 === 999.8 && wLo.tempClamped);
  const wHi = fnFluidProps({ fluid: 'water', tempC: 150, pressAbs_bar: FN_STD_ATM_BAR })!;
  checkTrue('B/물 150°C clamp → 100°C 절점', wHi.rho_kgm3 === 958.4 && wHi.tempClamped);

  // 공기 압력보정: P 2배 → ρ 2배 · ν ½
  const a1 = fnFluidProps({ fluid: 'air', tempC: 20, pressAbs_bar: FN_STD_ATM_BAR })!;
  const a2 = fnFluidProps({ fluid: 'air', tempC: 20, pressAbs_bar: 2 * FN_STD_ATM_BAR })!;
  check('B/공기 1atm ρ', a1.rho_kgm3, 1.205, 1e-12);
  check('B/공기 P 2배 → ρ 2배', a2.rho_kgm3, 2 * 1.205, 1e-12);
  check('B/공기 P 2배 → ν ½', a2.nu_m2s, 15.11e-6 / 2, 1e-18);

  // 직접입력 유체
  const cu = fnFluidProps({ fluid: 'custom', tempC: 0, pressAbs_bar: FN_STD_ATM_BAR, rhoCustom_kgm3: 900, nuCustom_m2s: 2e-6 })!;
  checkTrue('B/직접입력 ρ·ν 그대로', cu.rho_kgm3 === 900 && cu.nu_m2s === 2e-6);

  // 사각 덕트: A 실단면 · De = 1.3(ab)^0.625/(a+b)^0.25 직접 대입 (a400×b200)
  const rectRes = computeNetwork(
    baseSettings({ systemType: 'duct', fluid: 'air', vLimits: structuredClone(FN_V_LIMIT_DEFAULTS.duct), flowUnit: 'CMH' }),
    [seg({ id: 'D01', shape: 'rect', a_mm: 400, b_mm: 200, D_mm: NaN, sumK: 0, L_m: 10, materialId: 'galv-sheet', terminalFlow: 1800 })],
  )!;
  const d01 = rectRes.rows[0];
  const DeExpect = 1.3 * Math.pow(400 * 200, 0.625) / Math.pow(400 + 200, 0.25);
  check('B/사각 De 직접 대입', d01.De_mm, DeExpect, DeExpect * 1e-12, `De=${DeExpect.toFixed(4)} mm`);
  check('B/사각 A = ab (실단면)', d01.A_m2, 0.4 * 0.2, 1e-15);
  check('B/사각 V = Q/A (실단면 기준)', d01.V_ms, (1800 / 3600) / 0.08, 1e-12);
  check('B/사각 Re = V·De/ν', d01.Re, d01.V_ms * (DeExpect / 1000) / rectRes.nu_m2s, 1e-9);

  // LPM ↔ CMH 동일 Q → 동일 결과
  const resLpm = computeNetwork(baseSettings({ flowUnit: 'LPM' }), [seg({ id: 'X', terminalFlow: 150 })])!;
  const resCmh = computeNetwork(baseSettings({ flowUnit: 'CMH' }), [seg({ id: 'X', terminalFlow: 9 })])!;
  checkTrue('B/150 LPM = 9 CMH → Q·누적 동일',
    resLpm.rows[0].Q_m3s === resCmh.rows[0].Q_m3s && resLpm.rows[0].cum_Pa === resCmh.rows[0].cum_Pa,
    `Q=${resLpm.rows[0].Q_m3s}`);

  // 층류 f = 64/Re (물, 5 LPM → Re≈2000)
  const lam = computeNetwork(baseSettings(), [seg({ id: 'L', terminalFlow: 5 })])!.rows[0];
  checkTrue('B/층류 Re<2300', lam.Re < 2300 && lam.regime === 'laminar', `Re=${lam.Re.toFixed(1)}`);
  check('B/층류 f = 64/Re', lam.f, 64 / lam.Re, 1e-15);

  // 천이 Re≈3000 → f = Swamee-Jain (기존 frictionFactor 3차보간과 다름을 함께 단언)
  const tr = computeNetwork(baseSettings(), [seg({ id: 'T', terminalFlow: 7.5 })])!.rows[0];
  const rr = tr.eps_mm / tr.De_mm;
  checkTrue('B/천이 2300≤Re≤4000', tr.Re >= 2300 && tr.Re <= 4000 && tr.regime === 'transition', `Re=${tr.Re.toFixed(1)}`);
  check('B/천이 f = swameeJain', tr.f, swameeJain(tr.Re, rr), 1e-15);
  const fLegacy = frictionFactor(tr.Re, rr).f;
  checkTrue('B/천이 f ≠ 기존 frictionFactor(3차보간)', Math.abs(tr.f - fLegacy) / fLegacy > 0.01,
    `S-J=${tr.f.toFixed(6)} vs 보간=${fLegacy.toFixed(6)}`);

  // ΔP마찰 항등식: 원형에서 8fLρQ²/(π²D⁵) ≡ f(L/D)ρV²/2
  const s01 = computeNetwork(baseSettings(), SAMPLE)!.rows[0];
  const dpVform = s01.f * (20 / (s01.De_mm / 1000)) * 998.2 * s01.V_ms * s01.V_ms / 2;
  check('B/ΔP마찰 Q형≡V형', s01.dpFriction_Pa, dpVform, Math.abs(dpVform) * 1e-9);

  // 제안D = √(4Q/(π·V_max적용))·1000 (배관 main max=3)
  check('B/제안D 직접 대입', s01.suggestedD_mm, Math.sqrt(4 * 0.005 / (Math.PI * 3)) * 1000, 1e-9);

  // 판정 경계: V>max → ▲유속초과 · V<min → ▼과대관경
  const hi = computeNetwork(baseSettings(), [seg({ id: 'H', D_mm: 30, terminalFlow: 150 })])!.rows[0];
  checkTrue('B/유속판정 ▲유속초과', hi.verdict === 'high' && hi.V_ms > 3, `V=${hi.V_ms.toFixed(2)}`);
  const lo = computeNetwork(baseSettings(), [seg({ id: 'W', D_mm: 150, terminalFlow: 150 })])!.rows[0];
  checkTrue('B/유속판정 ▼과대관경', lo.verdict === 'low' && lo.V_ms < 1, `V=${lo.V_ms.toFixed(3)}`);

  // mmAq 상수
  check('B/mmAq 환산상수', FN_PA_PER_MMAQ, 9.80665, 0);
}

// ── C. 에지 케이스 ───────────────────────────────────────────────
{
  // 압축성 경고: 공기·증기 & 누적ΔP > 0.1·P_abs·1e5 → on / 물·고압 → off
  const airWarn = computeNetwork(
    baseSettings({ fluid: 'air', flowUnit: 'CMH' }),
    [seg({ id: 'A1', D_mm: 200, terminalFlow: 1000, equipLoss_Pa: 20000, materialId: 'galv-sheet' })],
  )!.rows[0];
  checkTrue('C/압축성 경고 on (공기, 누적>10132.5Pa)', airWarn.compressWarn, `누적=${airWarn.cum_Pa.toFixed(0)} Pa`);
  const airHiP = computeNetwork(
    baseSettings({ fluid: 'air', flowUnit: 'CMH', pressAbs_bar: 3 }),
    [seg({ id: 'A2', D_mm: 200, terminalFlow: 1000, equipLoss_Pa: 20000, materialId: 'galv-sheet' })],
  )!.rows[0];
  checkTrue('C/압축성 경고 off (P_abs 3bar → 한계 30000Pa)', !airHiP.compressWarn, `누적=${airHiP.cum_Pa.toFixed(0)} Pa`);
  const steamWarn = computeNetwork(
    baseSettings({ fluid: 'steam', tempC: 120, flowUnit: 'CMH' }),
    [seg({ id: 'ST', D_mm: 100, terminalFlow: 500, equipLoss_Pa: 20000 })],
  )!.rows[0];
  checkTrue('C/압축성 경고 on (증기)', steamWarn.compressWarn);
  const waterNoWarn = computeNetwork(
    baseSettings(),
    [seg({ id: 'W1', terminalFlow: 150, equipLoss_Pa: 200000 })],
  )!.rows[0];
  checkTrue('C/압축성 경고 off (물 — 비압축성)', !waterNoWarn.compressWarn);

  // 부모 검증 2종 — 메시지 그대로
  const badParent = computeNetwork(baseSettings(), [seg({ id: 'P1', parentId: 'X99', terminalFlow: 150 })])!;
  checkTrue('C/❌부모ID 없음', badParent.rows[0].error === '❌부모ID 없음');
  const belowParent = computeNetwork(baseSettings(), [
    seg({ id: 'P1', parentId: 'P2', terminalFlow: 150 }),
    seg({ id: 'P2', parentId: 'ROOT', terminalFlow: 150 }),
  ])!;
  checkTrue('C/❌부모가 같은/아래 행', belowParent.rows[0].error === '❌부모가 같은/아래 행');
  const selfParent = computeNetwork(baseSettings(), [seg({ id: 'P1', parentId: 'P1', terminalFlow: 150 })])!;
  checkTrue('C/자기참조 → ❌부모가 같은/아래 행', selfParent.rows[0].error === '❌부모가 같은/아래 행');

  // 중복 ID
  const dup = computeNetwork(baseSettings(), [
    seg({ id: 'S01', terminalFlow: 150 }),
    seg({ id: 'S01', terminalFlow: 150 }),
  ])!;
  checkTrue('C/❌중복 ID (뒤 행만 에러)', dup.rows[0].error === null && dup.rows[1].error === '❌중복 ID');

  // 자식 있는 행의 말단유량·요구압 입력 무시
  const ignoreTerm = computeNetwork(baseSettings(), [
    seg({ id: 'S01', terminalFlow: 99999, pReq_Pa: 88888 }),
    seg({ id: 'S02', parentId: 'S01', grade: 'branch', L_m: 10, sumK: 3, terminalFlow: 150, pReq_Pa: 15000 }),
    seg({ id: 'S03', parentId: 'S01', grade: 'branch', L_m: 12, sumK: 3, terminalFlow: 150, pReq_Pa: 15000 }),
  ])!;
  check('C/비말단 말단유량 무시 → Q=자식합', ignoreTerm.rows[0].Q_m3s, 0.005, 1e-15);
  check('C/비말단 요구압 미가산', ignoreTerm.rows[0].cumPlusReq_Pa, ignoreTerm.rows[0].cum_Pa, 0);

  // 0·음수·NaN → 행 에러 + 계산 제외 + 의존 행 연쇄 제외
  const cascade = computeNetwork(baseSettings(), [
    seg({ id: 'S01' }),
    seg({ id: 'S02', parentId: 'S01', grade: 'branch', L_m: -1, terminalFlow: 150 }),
    seg({ id: 'S03', parentId: 'S01', grade: 'branch', L_m: 12, sumK: 3, terminalFlow: 150 }),
  ])!;
  checkTrue('C/음수 L → 행 에러', cascade.rows[1].error === '❌길이 L 오류 (0·음수·빈값)');
  checkTrue('C/부모 연쇄 제외 (하위 에러)', cascade.rows[0].error === '❌하위 구간 에러 — 계산 제외');
  checkTrue('C/형제 연쇄 제외 (상위 에러)', cascade.rows[2].error === '❌상위 구간 에러 — 계산 제외');
  checkTrue('C/에러 플래그', cascade.hasErrors);

  const nanD = computeNetwork(baseSettings(), [seg({ id: 'N1', D_mm: NaN, terminalFlow: 150 })])!;
  checkTrue('C/NaN D → 행 에러', nanD.rows[0].error === '❌관경 D 오류 (0·음수·빈값)');
  const zeroFlow = computeNetwork(baseSettings(), [seg({ id: 'Z1', terminalFlow: 0 })])!;
  checkTrue('C/말단유량 0 → 행 에러', zeroFlow.rows[0].error === '❌말단유량 오류 (0·음수·빈값)');

  // 설정 검증
  checkTrue('C/직접입력 ρ 음수 → 설정 에러', validateSettings(
    baseSettings({ fluid: 'custom', rhoCustom_kgm3: -1, nuCustom_m2s: 1e-6 })) !== null);
  checkTrue('C/α=1 → 설정 에러', validateSettings(baseSettings({ alpha: 1 })) !== null);
  checkTrue('C/설정 에러 시 null', computeNetwork(baseSettings({ alpha: 1 }), SAMPLE) === null);
}

// ── D. 관경 자동 설계 (design.ts — 이원 기준 + 규격 스냅) ─────────
{
  const pipeVL = structuredClone(FN_V_LIMIT_DEFAULTS.pipe);
  const water = { rho_kgm3: 998.2, nu_m2s: 1.004e-6 };
  const base = {
    Q_m3s: 0.005, grade: 'main' as const, vLimits: pipeVL,
    ...water, eps_mm: 0.045, materialId: 'steel' as const,
  };

  // 유속 기준 dVel = calc.suggestedD_mm과 동일 공식 (R 미입력 → 유속 기준만)
  const velOnly = fnSuggestDe({ ...base, targetR_Pa_per_m: NaN })!;
  const s01 = computeNetwork(baseSettings(), SAMPLE)!.rows[0];
  check('D/dVel = calc 제안D (엑셀 공식)', velOnly.dVel_mm, s01.suggestedD_mm, 1e-12);
  checkTrue('D/R 미입력 → dR null·유속 채택', velOnly.dR_mm === null && velOnly.suggest_mm === velOnly.dVel_mm);

  // R 역산 잔차 (배관: R=300 Pa/m) — 산출 De 재대입 시 마찰률 = R
  const rPipe = fnSuggestDe({ ...base, targetR_Pa_per_m: 300 })!;
  {
    const De = rPipe.dR_mm! / 1000;
    const Re = 4 * base.Q_m3s / (Math.PI * De * water.nu_m2s);
    const f = Re < 2300 ? 64 / Re : swameeJain(Re, base.eps_mm / (De * 1000));
    const R = 8 * f * water.rho_kgm3 * base.Q_m3s ** 2 / (Math.PI ** 2 * De ** 5);
    check('D/R 역산 잔차 (배관 300 Pa/m)', R, 300, 300 * 1e-6, `De=${rPipe.dR_mm!.toFixed(2)} mm`);
  }
  checkTrue('D/R 지배 케이스 → max=dR', rPipe.dR_mm! > rPipe.dVel_mm && rPipe.suggest_mm === rPipe.dR_mm,
    `dVel=${rPipe.dVel_mm.toFixed(1)} < dR=${rPipe.dR_mm!.toFixed(1)}`);
  const rLoose = fnSuggestDe({ ...base, targetR_Pa_per_m: 100000 })!;
  checkTrue('D/유속 지배 케이스 → max=dVel', rLoose.dR_mm! < rLoose.dVel_mm && rLoose.suggest_mm === rLoose.dVel_mm,
    `dR=${rLoose.dR_mm!.toFixed(1)} < dVel=${rLoose.dVel_mm.toFixed(1)}`);

  // R 역산 잔차 (덕트: R=1.0 Pa/m, 공기 20°C)
  const rDuct = fnSuggestDe({
    Q_m3s: 0.5, grade: 'main', vLimits: structuredClone(FN_V_LIMIT_DEFAULTS.duct),
    targetR_Pa_per_m: 1.0, rho_kgm3: 1.205, nu_m2s: 15.11e-6, eps_mm: 0.15, materialId: 'galv-sheet',
  })!;
  {
    const De = rDuct.dR_mm! / 1000;
    const Re = 4 * 0.5 / (Math.PI * De * 15.11e-6);
    const f = swameeJain(Re, 0.15 / (De * 1000));
    const R = 8 * f * 1.205 * 0.5 ** 2 / (Math.PI ** 2 * De ** 5);
    check('D/R 역산 잔차 (덕트 1.0 Pa/m)', R, 1.0, 1e-6, `De=${rDuct.dR_mm!.toFixed(1)} mm`);
  }

  // KS 호칭경 스냅: 46.07mm → 강관 50A (ID 53.2) · 직전 40A(ID 42.1)는 미달
  checkTrue('D/KS 스냅 46.07 → 50A', fnSnapStandard(46.06588659617807, 'steel') === '50A (ID 53.2)',
    `실제=${fnSnapStandard(46.06588659617807, 'steel')}`);
  checkTrue('D/KS 스냅 42.1 이하 → 40A', fnSnapStandard(42.0, 'steel') === '40A (ID 42.1)',
    `실제=${fnSnapStandard(42.0, 'steel')}`);
  // 덕트 50mm 올림: 304.67→350 · 정확히 300→300 (경계)
  checkTrue('D/덕트 스냅 304.67 → 350', fnSnapStandard(304.67497318521936, 'galv-sheet') === '350 mm');
  checkTrue('D/덕트 스냅 경계 300 → 300', fnSnapStandard(300, 'galv-sheet') === '300 mm');
  // 주철관·표 범위 초과 → 스냅 없음
  checkTrue('D/주철관 스냅 제외', fnSnapStandard(46, 'cast-iron') === null);
  checkTrue('D/KS 표 범위 초과 → null', fnSnapStandard(10000, 'steel') === null);

  // Σ말단유량 (설계 총유량 대조용)
  const net = computeNetwork(baseSettings(), SAMPLE)!;
  check('D/Σ말단유량 = 0.005 m³/s', net.totalLeafFlow_m3s, 0.005, 1e-15,
    `= ${(net.totalLeafFlow_m3s * 60000).toFixed(1)} LPM`);
}

// ── 출력 ──────────────────────────────────────────────────────────
console.log(rows.join('\n'));
console.log(`\n총 ${pass + fail}건 — PASS ${pass} / FAIL ${fail}`);
if (fail > 0) process.exitCode = 1;
