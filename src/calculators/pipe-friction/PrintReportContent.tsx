// 관마찰손실 계산기 — 인쇄 전용 콘텐츠 (PrintReport의 children으로 삽입)
// @media print 시에만 표시됨 (index.css .print-report 규칙)
// 공식 출처: 일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p

import type { PipeMaterial } from '../../data/pipeMaterials';
import type { FrictionResult } from './calc';
import { NU, RHO_WATER, G } from './calc';
import {
  FLOW_UNITS, PRESSURE_UNITS,
  type FlowUnitKey, type PressureUnitKey,
} from './units';
import { flowRegime, rangeStatus, RANGES, formatRe } from './analysis';

type PressDef = typeof PRESSURE_UNITS[number];

interface Props {
  res: FrictionResult;
  mat: PipeMaterial;
  inputMode: 'Q' | 'v';
  Q: string;
  v: string;
  D: string;
  L: string;
  fOverride: string;
  flowUnit: FlowUnitKey;
  pressureUnit: PressureUnitKey;
}

const tdStyle: React.CSSProperties = {
  border: '1px solid #999',
  padding: '4px 8px',
  fontSize: '11pt',
  verticalAlign: 'middle',
};
const thStyle: React.CSSProperties = {
  border: '1px solid #999',
  padding: '4px 8px',
  fontSize: '11pt',
  fontWeight: 700,
  backgroundColor: '#F3F4F6',
  verticalAlign: 'middle',
};
const tableStyle: React.CSSProperties = {
  borderCollapse: 'collapse',
  width: '100%',
  fontSize: '11pt',
};
const sectionStyle: React.CSSProperties = {
  marginBottom: '10mm',
};
const h2Style: React.CSSProperties = {
  fontSize: '12pt',
  fontWeight: 700,
  margin: '0 0 6px 0',
  color: '#000',
};

export default function PrintReportContent({
  res, mat, inputMode,
  Q, v, D, L, fOverride,
  flowUnit, pressureUnit,
}: Props) {
  const pressDef: PressDef = PRESSURE_UNITS.find(u => u.key === pressureUnit)!;
  const flowUnitLabel = FLOW_UNITS.find(u => u.key === flowUnit)?.label ?? '';
  const flowUnitDivisor = FLOW_UNITS.find(u => u.key === flowUnit)?.divisor ?? 3600;

  // 입력값에서 파생
  const hasOverride = !!fOverride.trim();

  // 단위 변환 표기용
  const D_num = parseFloat(D);
  const L_num = parseFloat(L);
  const D_m = D_num / 1000;

  // res에서 꺼낸 값 그대로
  const { Q_m3s, V_ms, Re, hf_m, deltaP_Pa, unitLoss_Pa, f } = res;

  // 사용자 단위로 환산
  const deltaP_display = deltaP_Pa * pressDef.factor;
  const unitLoss_display = unitLoss_Pa * pressDef.factor;

  // 유동 영역 / 범위 판정
  const regime = flowRegime(Re);
  const rangeV = rangeStatus(V_ms, RANGES.velocity);
  const rangeU = rangeStatus(unitLoss_Pa, RANGES.unitLossPa);

  // 압력 단위 환산 표기용
  // pressDef.factor: Pa → unit (Pa * factor = 사용자 단위 값)
  // 표기: Pa ÷ divisor 형식 (분모가 정수에 가까운 값인 경우에만)
  function pressConvStr(): string {
    switch (pressureUnit) {
      case 'kPa':     return `${deltaP_Pa.toFixed(1)} Pa ÷ 1,000`;
      case 'bar':     return `${deltaP_Pa.toFixed(1)} Pa ÷ 100,000`;
      case 'mmAq':    return `${deltaP_Pa.toFixed(1)} Pa ÷ 9.80665`;
      case 'kgfcm2': return `${deltaP_Pa.toFixed(1)} Pa ÷ 98,066.5`;
      case 'MPa':     return `${deltaP_Pa.toFixed(1)} Pa ÷ 1,000,000`;
      default:        return `${deltaP_Pa.toFixed(1)} Pa × ${pressDef.factor}`;
    }
  }

  return (
    <>
      {/* §1 입력값 요약 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>1. 입력값 요약</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>항목</th>
              <th style={thStyle}>값</th>
              <th style={thStyle}>단위</th>
              <th style={thStyle}>비고</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>계산 방법</td>
              <td style={tdStyle}>Darcy-Weisbach</td>
              <td style={tdStyle}>—</td>
              <td style={tdStyle}>—</td>
            </tr>
            <tr>
              <td style={tdStyle}>입력 방식</td>
              <td style={tdStyle}>{inputMode === 'Q' ? '유량 Q 기준' : '유속 v 기준'}</td>
              <td style={tdStyle}>—</td>
              <td style={tdStyle}>—</td>
            </tr>
            <tr>
              <td style={tdStyle}>배관 재질</td>
              <td style={tdStyle}>{mat.nameKo}{mat.abbreviation ? ` (${mat.abbreviation})` : ''}</td>
              <td style={tdStyle}>—</td>
              <td style={tdStyle}>—</td>
            </tr>
            <tr>
              <td style={tdStyle}>마찰계수 f</td>
              <td style={tdStyle}>{hasOverride ? fOverride : mat.frictionFactor}</td>
              <td style={tdStyle}>—</td>
              <td style={tdStyle}>{hasOverride ? `기본 ${mat.frictionFactor} → 사용자 입력` : '재질 기본값'}</td>
            </tr>
            {inputMode === 'Q' ? (
              <tr>
                <td style={tdStyle}>유량 Q</td>
                <td style={tdStyle}>{Q}</td>
                <td style={tdStyle}>{flowUnitLabel}</td>
                <td style={tdStyle}>—</td>
              </tr>
            ) : (
              <tr>
                <td style={tdStyle}>유속 v</td>
                <td style={tdStyle}>{v}</td>
                <td style={tdStyle}>m/s</td>
                <td style={tdStyle}>—</td>
              </tr>
            )}
            <tr>
              <td style={tdStyle}>관 내경 D</td>
              <td style={tdStyle}>{D}</td>
              <td style={tdStyle}>mm</td>
              <td style={tdStyle}>—</td>
            </tr>
            <tr>
              <td style={tdStyle}>배관 길이 L</td>
              <td style={tdStyle}>{L}</td>
              <td style={tdStyle}>m</td>
              <td style={tdStyle}>—</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* §2 사용 공식 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>2. 사용 공식 — Darcy-Weisbach</h2>

        <p style={{ fontSize: '11pt', fontWeight: 700, margin: '6px 0 4px 0' }}>■ 마찰손실 수두 (주 공식)</p>
        <pre style={{
          fontFamily: 'ui-monospace, Consolas, monospace',
          fontSize: '11pt',
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          padding: '6px 10px',
          margin: '0 0 8px 0',
          whiteSpace: 'pre-wrap',
        }}>
          {inputMode === 'Q'
            ? 'hf = 8 · f · L · Q²  /  (π² · g · D⁵)    [m]'
            : 'hf = f · (L / D) · v²  /  (2 · g)    [m]'}
        </pre>

        <p style={{ fontSize: '11pt', fontWeight: 700, margin: '6px 0 4px 0' }}>■ 파생 공식</p>
        <pre style={{
          fontFamily: 'ui-monospace, Consolas, monospace',
          fontSize: '10pt',
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          padding: '6px 10px',
          margin: '0 0 8px 0',
          whiteSpace: 'pre-wrap',
        }}>
          A  = π · D² / 4    [m²]{'\n'}
          {inputMode === 'Q'
            ? 'V  = Q / A           [m/s]'
            : 'Q  = V · A           [m³/s]'}{'\n'}
          Re = V · D / ν{'\n'}
          ΔP = ρ · g · hf      [Pa]
        </pre>

        <p style={{ fontSize: '11pt', fontWeight: 700, margin: '6px 0 4px 0' }}>■ 기호 정리</p>
        <table style={{ ...tableStyle, marginBottom: '8px' }}>
          <tbody>
            <tr>
              <td style={{ ...tdStyle, width: '80px', fontWeight: 600 }}>f</td>
              <td style={tdStyle}>마찰계수 (무차원)</td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 600 }}>L</td>
              <td style={tdStyle}>배관 길이 [m]</td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 600 }}>Q</td>
              <td style={tdStyle}>유량 [m³/s]</td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 600 }}>v, V</td>
              <td style={tdStyle}>유속 [m/s]</td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 600 }}>D</td>
              <td style={tdStyle}>관 내경 [m]</td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 600 }}>g</td>
              <td style={tdStyle}>중력가속도 = {G} m/s²</td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 600 }}>ρ</td>
              <td style={tdStyle}>물 밀도 = {RHO_WATER} kg/m³ (상온 20℃)</td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 600 }}>ν</td>
              <td style={tdStyle}>물 동점성계수 = {NU} m²/s (상온 20℃)</td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: '10pt', color: '#444', margin: '4px 0 0 0' }}>
          출처: 일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p
        </p>
      </section>

      {/* §3 대입 과정 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>3. 단위 변환 및 대입 과정</h2>
        <ol style={{ fontSize: '11pt', paddingLeft: '20px', margin: 0, lineHeight: 1.9 }}>

          <li>
            <strong>단위 변환</strong>
            <ul style={{ listStyle: 'disc', paddingLeft: '18px', margin: '2px 0' }}>
              {inputMode === 'Q' && flowUnit !== 'lpm' && (
                <li>
                  Q = {Q} {flowUnitLabel} ÷ {flowUnitDivisor.toLocaleString()} = {Q_m3s.toFixed(6)} m³/s
                </li>
              )}
              {inputMode === 'Q' && flowUnit === 'lpm' && (
                <li>
                  Q = {Q} LPM ÷ 60,000 = {Q_m3s.toFixed(6)} m³/s
                </li>
              )}
              <li>
                D = {D} mm ÷ 1,000 = {D_m.toFixed(5)} m
              </li>
            </ul>
          </li>

          <li>
            <strong>단면적</strong>
            {': '}A = π × ({D_m.toFixed(5)})² / 4 = {res.D_m !== undefined
              ? (Math.PI * res.D_m * res.D_m / 4).toFixed(6)
              : (Math.PI * D_m * D_m / 4).toFixed(6)} m²
          </li>

          <li>
            <strong>유속</strong>
            {': '}
            {inputMode === 'Q'
              ? `V = Q / A = ${Q_m3s.toFixed(6)} / ${(Math.PI * D_m * D_m / 4).toFixed(6)} = ${V_ms.toFixed(3)} m/s`
              : `V = ${v} m/s (입력값)`}
          </li>

          <li>
            <strong>레이놀즈수</strong>
            {': '}Re = V × D / ν = {V_ms.toFixed(3)} × {D_m.toFixed(5)} / {NU} = {formatRe(Re)}
          </li>

          <li>
            <strong>마찰손실 수두</strong>
            {': '}
            {inputMode === 'Q'
              ? `hf = 8 × ${f.toFixed(4)} × ${L_num} × (${Q_m3s.toFixed(6)})² / (π² × ${G} × (${D_m.toFixed(5)})⁵) = ${hf_m.toFixed(3)} m`
              : `hf = ${f.toFixed(4)} × (${L_num} / ${D_m.toFixed(5)}) × (${v})² / (2 × ${G}) = ${hf_m.toFixed(3)} m`}
          </li>

          <li>
            <strong>압력강하</strong>
            {': '}ΔP = ρ × g × hf = {RHO_WATER} × {G} × {hf_m.toFixed(3)} = {Math.round(deltaP_Pa)} Pa
          </li>

          <li>
            <strong>사용자 단위 환산</strong>
            {': '}{pressConvStr()} = {deltaP_display.toFixed(pressDef.dp)} {pressDef.label}
          </li>
        </ol>
      </section>

      {/* §4 최종 결과 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>4. 최종 결과</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>항목</th>
              <th style={thStyle}>값</th>
              <th style={thStyle}>단위</th>
              <th style={thStyle}>비고</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>유속 V</td>
              <td style={tdStyle}>{V_ms.toFixed(3)}</td>
              <td style={tdStyle}>m/s</td>
              <td style={tdStyle}>{rangeV.label}</td>
            </tr>
            <tr>
              <td style={tdStyle}>레이놀즈수 Re</td>
              <td style={tdStyle}>{formatRe(Re)}</td>
              <td style={tdStyle}>—</td>
              <td style={tdStyle}>{regime.label}</td>
            </tr>
            <tr>
              <td style={tdStyle}>수두 hf</td>
              <td style={tdStyle}>{hf_m.toFixed(3)}</td>
              <td style={tdStyle}>m</td>
              <td style={tdStyle}>—</td>
            </tr>
            <tr>
              <td style={tdStyle}>총 마찰손실 ΔP</td>
              <td style={tdStyle}>{deltaP_display.toFixed(pressDef.dp)}</td>
              <td style={tdStyle}>{pressDef.label}</td>
              <td style={tdStyle}>—</td>
            </tr>
            <tr>
              <td style={tdStyle}>단위 마찰손실</td>
              <td style={tdStyle}>{unitLoss_display.toFixed(pressDef.dpM)}</td>
              <td style={tdStyle}>{pressDef.label}/m</td>
              <td style={tdStyle}>{rangeU.label}</td>
            </tr>
            <tr>
              <td style={tdStyle}>적용 마찰계수 f</td>
              <td style={tdStyle}>{f.toFixed(4)}</td>
              <td style={tdStyle}>—</td>
              <td style={tdStyle}>{hasOverride ? '사용자 입력' : '재질 기본값'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* §5 해석 / 판정 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>5. 해석 / 판정</h2>
        <p style={{ fontSize: '11pt', margin: '0 0 6px 0', lineHeight: 1.7 }}>
          레이놀즈수 Re = {formatRe(Re)} 로, 이는 <strong>{regime.label}</strong> 영역에 해당합니다. ({regime.desc})
        </p>
        <p style={{ fontSize: '11pt', margin: '0 0 6px 0', lineHeight: 1.7 }}>
          계산된 유속은 {V_ms.toFixed(3)} m/s 로, 한국 실무 관행 권장 범위 ({RANGES.velocity.optMin}~{RANGES.velocity.optMax} m/s) 대비 <strong>{rangeV.label}</strong> 수준입니다.
        </p>
        <p style={{ fontSize: '11pt', margin: '0 0 6px 0', lineHeight: 1.7 }}>
          단위 마찰손실은 {unitLoss_Pa.toFixed(0)} Pa/m ({unitLoss_display.toFixed(pressDef.dpM)} {pressDef.label}/m) 로,
          권장 범위 ({RANGES.unitLossPa.optMin}~{RANGES.unitLossPa.optMax} Pa/m) 대비 <strong>{rangeU.label}</strong> 수준입니다.
        </p>
        {(regime.key === 'transition') && (
          <p style={{ fontSize: '11pt', margin: '0 0 6px 0', lineHeight: 1.7, color: '#B45309' }}>
            ※ 천이 유동 영역(2,300 ≤ Re {'<'} 4,000)으로, 유동이 불안정할 수 있습니다. 설계 검토를 권장합니다.
          </p>
        )}
        {(rangeV.key === 'low' || rangeV.key === 'high') && (
          <p style={{ fontSize: '11pt', margin: '0 0 6px 0', lineHeight: 1.7, color: '#B45309' }}>
            ※ 유속이 권장 범위를 벗어났습니다. 관경 또는 유량 재검토를 권장합니다.
          </p>
        )}
        <p style={{ fontSize: '10pt', margin: '8px 0 0 0', color: '#666' }}>
          입력: {inputMode === 'Q' ? `Q = ${Q} ${flowUnitLabel}` : `v = ${v} m/s`}, D = {D} mm, L = {L} m, f = {f.toFixed(4)}
        </p>
      </section>
    </>
  );
}
