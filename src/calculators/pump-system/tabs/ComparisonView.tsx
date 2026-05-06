// pump-hvac 전용 — 같은 환경 다른 펌프 가로 비교 테이블
// Props: entries (2~4개) + onBack
// 추천 로직·기준 컬럼 제거. 펌프 측 입력·결과 행 추가, 환경 불일치 경고 표시.

import { ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { HistoryEntry } from '../../../state/historyStore';
import { FLOW_UNITS_PUMP } from '../units';
import { findOperatingPoint } from '../calc';

export interface ComparisonViewProps {
  entries: HistoryEntry[];
  onBack?: () => void;
}

// ── 헬퍼 ──────────────────────────────────────────────────────────

function fmt2(v: number | undefined | null): string {
  if (v === undefined || v === null || !Number.isFinite(v)) return '—';
  return v.toFixed(2);
}

function fmt1(v: number | undefined | null): string {
  if (v === undefined || v === null || !Number.isFinite(v)) return '—';
  return v.toFixed(1);
}

function getQ_m3h(inputs: Record<string, any>): number | null {
  const Q = parseFloat(inputs?.Q);
  if (!Number.isFinite(Q) || Q <= 0) return null;
  const flowUnit: string = inputs?.flowUnit ?? 'm3h';
  const def = FLOW_UNITS_PUMP.find(u => u.key === flowUnit);
  const toM3s = def?.toM3s ?? (1 / 3600);
  return Q * toM3s * 3600;
}

function getFluidLabel(inputs: Record<string, any>): string {
  const fluid: string = inputs?.fluid ?? '';
  if (fluid === 'hot-water') return '온수';
  if (fluid === 'cooling-water') return '냉각수';
  return '냉수';
}

function getSystemModeLabel(inputs: Record<string, any>): string {
  return inputs?.systemMode === 'closed' ? '폐회로' : '개방계';
}

function materialShortLabel(id: string): string {
  const map: Record<string, string> = {
    sgp: 'SGP', stpg370: 'STPG', sus304: 'SUS304', sus316: 'SUS316',
    pvc: 'PVC', cpvc: 'CPVC', pe: 'PE', copper: 'Cu',
  };
  return map[id] ?? id.toUpperCase();
}

function pipesSummary(rows: Array<{ nominalA: number; materialId: string; lStr: string; lUnit: string }> | undefined): string {
  if (!rows || rows.length === 0) return '—';
  return rows.map(r => `${r.nominalA}A·${materialShortLabel(r.materialId)}·${r.lStr}${r.lUnit ?? 'm'}`).join(' + ');
}

// 환경 fingerprint — 동일성 비교용 (펌프 측 입력은 제외)
function envFingerprint(inputs: Record<string, any>): string {
  return JSON.stringify({
    Q: inputs?.Q, flowUnit: inputs?.flowUnit,
    fluid: inputs?.fluid, tempC: inputs?.tempC,
    systemMode: inputs?.systemMode,
    sucPipes: inputs?.sucPipeRows,
    disPipes: inputs?.disPipeRows,
    fittings: inputs?.fittingRows,
    equips: inputs?.equipRows,
    Hs: inputs?.HsStr, Hd: inputs?.HdStr,
    Pres: inputs?.PresStr, presUnit: inputs?.presUnit, Patm: inputs?.PatmStr,
    headMargin: inputs?.headMarginStr, powerMargin: inputs?.powerMarginStr, npshMargin: inputs?.npshMarginStr,
  });
}

// 펌프 곡선 점 파싱
function parsePumpCurve(rows: Array<{ qStr: string; hStr: string }> | undefined): { Q_m3h: number; H_m: number }[] {
  if (!rows) return [];
  return rows
    .map(r => ({ Q_m3h: parseFloat(r.qStr), H_m: parseFloat(r.hStr) }))
    .filter(p => Number.isFinite(p.Q_m3h) && Number.isFinite(p.H_m) && p.Q_m3h >= 0 && p.H_m >= 0);
}

// BEP 판정 (calc.ts generatePumpCurveFamily와 동일 로직)
type BepVerdict = 'optimal' | 'acceptable' | 'out-of-range' | 'na';
function classifyBep(Q_op: number, BEP_Q: number): BepVerdict {
  if (!Number.isFinite(Q_op) || !Number.isFinite(BEP_Q) || BEP_Q <= 0) return 'na';
  const ratio = Q_op / BEP_Q;
  if (ratio >= 0.80 && ratio <= 1.10) return 'optimal';
  if (ratio >= 0.70 && ratio <= 1.25) return 'acceptable';
  return 'out-of-range';
}

// 펌프 측 파생값 한 묶음
interface PumpDerived {
  NPSHr: number | null;
  NPSHmargin: number | null;       // NPSHa - NPSHr
  NPSHverdict: 'pass' | 'low-margin' | 'risk' | 'na';
  Q_op: number | null;             // m³/h
  H_op: number | null;             // m
  BEP_Q: number | null;            // m³/h
  BEP_verdict: BepVerdict;
  catalogHz: number | null;
  pumpCurveCount: number;
  recommendedMotor_kW: number | null;
}

function derivePump(entry: HistoryEntry): PumpDerived {
  const inp = entry.inputs ?? {};
  const out = entry.outputs ?? {};

  const NPSHr_raw = parseFloat(inp.npshrStr ?? '');
  const NPSHr = Number.isFinite(NPSHr_raw) && NPSHr_raw > 0 ? NPSHr_raw : null;

  const NPSHmargin = (out.NPSHmargin_actual_m ?? null) as number | null;
  const NPSHverdict = (out.NPSHverdict ?? 'na') as PumpDerived['NPSHverdict'];

  // 펌프 곡선 운전점 재계산 (저장된 inputs.pumpCurveRows + outputs.k_system)
  const curve = parsePumpCurve(inp.pumpCurveRows);
  const k_system = out.k_system as number | undefined;
  const H_static = out.H_static_now_m as number | undefined;
  let Q_op: number | null = null;
  let H_op: number | null = null;
  if (curve.length >= 2 && Number.isFinite(k_system) && Number.isFinite(H_static)) {
    const op = findOperatingPoint(curve, H_static!, k_system!);
    if (op) { Q_op = op.Q_m3h; H_op = op.H_m; }
  }

  const BEP_Q_raw = parseFloat(inp.bepQStr ?? '');
  const BEP_Q = Number.isFinite(BEP_Q_raw) && BEP_Q_raw > 0 ? BEP_Q_raw : null;
  const BEP_verdict: BepVerdict = (Q_op !== null && BEP_Q !== null) ? classifyBep(Q_op, BEP_Q) : 'na';

  const catalogHz_raw = parseFloat(inp.catalogHzStr ?? '');
  const catalogHz = Number.isFinite(catalogHz_raw) && catalogHz_raw > 0 ? catalogHz_raw : null;

  const recMotor = out.recommendedMotorRating_kW as number | undefined;
  const recommendedMotor_kW = Number.isFinite(recMotor) && recMotor! > 0 ? recMotor! : null;

  return {
    NPSHr, NPSHmargin, NPSHverdict,
    Q_op, H_op, BEP_Q, BEP_verdict,
    catalogHz, pumpCurveCount: curve.length, recommendedMotor_kW,
  };
}

// ── 셀 스타일 ────────────────────────────────────────────────────

const CELL_BASE: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 12,
  borderBottom: '1px solid var(--bg-surface-3)',
  verticalAlign: 'top',
  whiteSpace: 'nowrap',
  color: 'var(--text-primary)',
};

const ROW_LABEL_CELL: React.CSSProperties = {
  ...CELL_BASE,
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  backgroundColor: 'var(--bg-surface-2)',
  fontSize: 11,
  minWidth: 150,
};

const HEADER_CELL: React.CSSProperties = {
  ...CELL_BASE,
  fontWeight: 700,
  backgroundColor: 'var(--bg-surface-2)',
  textAlign: 'left',
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border-subtle)',
};

const GROUP_HEADER_CELL: React.CSSProperties = {
  ...CELL_BASE,
  fontWeight: 700,
  fontSize: 11,
  color: 'var(--text-primary)',
  backgroundColor: 'var(--bg-surface-3)',
  textTransform: 'uppercase' as const,
  letterSpacing: 0.3,
  borderBottom: '1px solid var(--border-subtle)',
};

// NPSH·BEP 판정 칩
function VerdictChip({ verdict, type }: {
  verdict: 'pass' | 'low-margin' | 'risk' | 'na' | BepVerdict;
  type: 'npsh' | 'bep';
}) {
  if (verdict === 'na') return <span style={{ color: 'var(--text-quaternary)' }}>—</span>;
  let bg = 'var(--bg-surface-3)';
  let fg = 'var(--text-tertiary)';
  let label = String(verdict);
  if (type === 'npsh') {
    if (verdict === 'pass')        { bg = 'var(--state-success-bg)'; fg = 'var(--state-success-text)'; label = '✓ 통과'; }
    else if (verdict === 'low-margin') { bg = 'var(--state-warn-bg)'; fg = 'var(--state-warn-text)'; label = '⚠ 마진 부족'; }
    else if (verdict === 'risk')   { bg = 'var(--state-error-bg)'; fg = 'var(--state-error-text)'; label = '✕ 위험'; }
  } else {
    if (verdict === 'optimal')      { bg = 'var(--state-success-bg)'; fg = 'var(--state-success-text)'; label = '✓ 최적'; }
    else if (verdict === 'acceptable') { bg = 'var(--state-warn-bg)'; fg = 'var(--state-warn-text)'; label = '△ 허용'; }
    else if (verdict === 'out-of-range') { bg = 'var(--state-error-bg)'; fg = 'var(--state-error-text)'; label = '✕ 범위 밖'; }
  }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', fontSize: 11, fontWeight: 600,
      borderRadius: 4, backgroundColor: bg, color: fg,
    }}>
      {label}
    </span>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────

export default function ComparisonView({ entries, onBack }: ComparisonViewProps) {
  const n = entries.length;

  // 환경 동일성 판정
  const fingerprints = entries.map(e => envFingerprint(e.inputs ?? {}));
  const allSameEnv = fingerprints.every(f => f === fingerprints[0]);

  // 환경 요약 (첫 항목 기준)
  const baseInp = entries[0]?.inputs ?? {};
  const baseOut = entries[0]?.outputs ?? {};
  const Q_m3h = getQ_m3h(baseInp);

  // 펌프 측 파생값
  const pump = entries.map(derivePump);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
          펌프 비교 ({n}개)
        </span>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 500, color: 'var(--accent-primary)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '4px 8px', borderRadius: 6,
            }}
          >
            <ArrowLeft size={13} /> 기록 보기로
          </button>
        )}
      </div>

      {/* 환경 동일성 배너 */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 14px', borderRadius: 8,
        background: allSameEnv ? 'var(--state-success-bg)' : 'var(--state-warn-bg)',
        border: `1px solid ${allSameEnv ? 'var(--state-success)' : 'var(--state-warn)'}`,
      }}>
        {allSameEnv
          ? <CheckCircle2 size={16} color="var(--state-success-text)" style={{ flexShrink: 0, marginTop: 1 }} />
          : <AlertTriangle size={16} color="var(--state-warn-text)" style={{ flexShrink: 0, marginTop: 1 }} />
        }
        <div style={{ fontSize: 12, lineHeight: 1.6, flex: 1 }}>
          <div style={{
            fontWeight: 700,
            color: allSameEnv ? 'var(--state-success-text)' : 'var(--state-warn-text)',
            marginBottom: 4,
          }}>
            {allSameEnv ? '✓ 동일 환경 — 펌프 성능 비교 가능' : '⚠ 환경 불일치 — 동일 환경 비교가 아닙니다'}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            {allSameEnv ? (
              <>
                Q = {Q_m3h !== null ? Q_m3h.toFixed(1) : '—'} m³/h · {getFluidLabel(baseInp)} {parseFloat(baseInp.tempC ?? '20')}°C · {getSystemModeLabel(baseInp)}
                {' · '}흡입 {pipesSummary(baseInp.sucPipeRows)}
                {' · '}토출 {pipesSummary(baseInp.disPipeRows)}
                {' · '}TDH {fmt2(baseOut.TDH_m)} m · NPSHa {fmt2(baseOut.NPSHa_m)} m
              </>
            ) : (
              '시스템 입력(Q·배관·부속·장비·정수두 등)이 다릅니다. 펌프 단독 성능 비교가 아닌 시나리오 비교가 됩니다.'
            )}
          </div>
        </div>
      </div>

      {/* 비교 테이블 */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', minWidth: n * 200 + 160 }}>
          <colgroup>
            <col style={{ width: 160 }} />
            {entries.map(e => <col key={e.id} style={{ width: 200 }} />)}
          </colgroup>

          <thead>
            <tr>
              <th style={{ ...HEADER_CELL, borderRight: '1px solid var(--border-subtle)' }}></th>
              {entries.map(entry => (
                <th key={entry.id} style={{
                  ...HEADER_CELL,
                  textAlign: 'left',
                  borderLeft: '1px solid var(--border-subtle)',
                }}>
                  <span style={{
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                    fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
                  }} title={entry.title}>
                    {entry.title}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* ① 펌프 측 입력 */}
            <tr><td colSpan={n + 1} style={GROUP_HEADER_CELL}>① 펌프 측 입력 (카탈로그)</td></tr>
            <DataRow label="NPSHr (m)" entries={entries}
              render={(_, i) => pump[i].NPSHr !== null ? `${fmt2(pump[i].NPSHr)} m` : '—'} />
            <DataRow label="BEP 유량 Q_BEP (m³/h)" entries={entries}
              render={(_, i) => pump[i].BEP_Q !== null ? `${fmt1(pump[i].BEP_Q)} m³/h` : '—'} />
            <DataRow label="카탈로그 주파수 (Hz)" entries={entries}
              render={(_, i) => pump[i].catalogHz !== null ? `${pump[i].catalogHz} Hz` : '—'} />
            <DataRow label="펌프 곡선 점 수" entries={entries}
              render={(_, i) => `${pump[i].pumpCurveCount}개${pump[i].pumpCurveCount < 2 ? ' (운전점 미산출)' : ''}`} />

            {/* ② 펌프 측 결과 */}
            <tr>
              <td colSpan={n + 1} style={{ ...GROUP_HEADER_CELL, backgroundColor: 'var(--accent-primary-bg-soft)', color: 'var(--accent-primary-hover)' }}>
                ② 펌프 측 결과 (NPSH·운전점·BEP)
              </td>
            </tr>
            <DataRow label="NPSH 여유 = NPSHa − NPSHr (m)" entries={entries}
              render={(_, i) => pump[i].NPSHmargin !== null ? `${fmt2(pump[i].NPSHmargin)} m` : '—'} />
            <tr>
              <td style={ROW_LABEL_CELL}>NPSH 판정</td>
              {entries.map((entry, i) => (
                <td key={entry.id} style={CELL_BASE}>
                  <VerdictChip verdict={pump[i].NPSHverdict} type="npsh" />
                </td>
              ))}
            </tr>
            <DataRow label="펌프 곡선 운전점 Q (m³/h)" entries={entries}
              render={(_, i) => pump[i].Q_op !== null ? `${fmt1(pump[i].Q_op)} m³/h` : '—'} />
            <DataRow label="펌프 곡선 운전점 H (m)" entries={entries}
              render={(_, i) => pump[i].H_op !== null ? `${fmt2(pump[i].H_op)} m` : '—'} />
            <tr>
              <td style={ROW_LABEL_CELL}>BEP 판정 (Q_op / Q_BEP)</td>
              {entries.map((entry, i) => (
                <td key={entry.id} style={CELL_BASE}>
                  <VerdictChip verdict={pump[i].BEP_verdict} type="bep" />
                </td>
              ))}
            </tr>
            <DataRow label="권장 모터 정격 (IEC, kW)" entries={entries}
              render={(_, i) => pump[i].recommendedMotor_kW !== null ? `${pump[i].recommendedMotor_kW} kW` : '—'} />

            {/* ③ 시스템 결과 (참고용 — 동일 환경이면 모두 같음) */}
            <tr><td colSpan={n + 1} style={GROUP_HEADER_CELL}>③ 시스템 결과 (참고)</td></tr>
            <DataRow label="TDH (총양정, m)" entries={entries}
              render={e => `${fmt2(e.outputs?.TDH_m)} m`} />
            <DataRow label="설계 양정 (m)" entries={entries}
              render={e => `${fmt2(e.outputs?.designHead_m)} m`} />
            <DataRow label="NPSHa (m)" entries={entries}
              render={e => `${fmt2(e.outputs?.NPSHa_m)} m`} />
            <DataRow label="설계 동력 (kW)" entries={entries}
              render={e => {
                const w = e.outputs?.designPower_W;
                return Number.isFinite(w) ? `${(w / 1000).toFixed(1)} kW` : '—';
              }} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── 공통 데이터 행 ─────────────────────────────────────────────────

function DataRow({
  label, entries, render,
}: {
  label: string;
  entries: HistoryEntry[];
  render: (entry: HistoryEntry, idx: number) => string;
}) {
  return (
    <tr>
      <td style={ROW_LABEL_CELL}>{label}</td>
      {entries.map((entry, i) => (
        <td key={entry.id} style={CELL_BASE}>
          {render(entry, i)}
        </td>
      ))}
    </tr>
  );
}
