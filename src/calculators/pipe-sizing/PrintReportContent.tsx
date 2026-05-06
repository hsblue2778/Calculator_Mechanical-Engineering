// 관경 선정 계산기 — 인쇄 전용 콘텐츠 (PrintReport의 children으로 삽입)
// @media print 시에만 표시됨 (index.css .print-report 규칙)
// 공식 출처: 일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p
//   정통 Darcy-Weisbach (재질별 고정 f)

import type { SizingRow } from './calc';
import type { PipeMaterialSize } from '../../data/pipeSizes';
import {
  FLOW_UNITS, PRESSURE_UNITS,
  type FlowUnitKey, type PressureUnitKey,
} from '../pipe-friction/units';
import { mmAqToDisplay } from './units';
import { convertFlowToLpm } from './units';
import { flowRegime, rangeStatus, RANGES, formatRe } from '../pipe-friction/analysis';

type PressDef = typeof PRESSURE_UNITS[number];

interface Props {
  selected: SizingRow;
  rows: SizingRow[];
  analysis: { V: number; Re: number; unitLoss_Pa: number } | null;
  mat: PipeMaterialSize;
  Q: string;
  dP: string;
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

// 중력가속도 [m/s²]
const G = 9.81;

export default function PrintReportContent({
  selected, rows, analysis,
  mat,
  Q, dP,
  flowUnit, pressureUnit,
}: Props) {
  const pressDef: PressDef = PRESSURE_UNITS.find(u => u.key === pressureUnit)!;
  const flowUnitLabel = FLOW_UNITS.find(u => u.key === flowUnit)?.label ?? '';

  // 내부 계산용 값
  const Q_lpm = convertFlowToLpm(Q, flowUnit);
  const ID_mm = selected.size.id_mm;
  const ID_m = ID_mm / 1000;

  // 선정 관경 결과 (화면과 동일)
  const drop_display = mmAqToDisplay(selected.dropPerM_mmAqPerM, pressureUnit);
  const dP_num = parseFloat(dP);

  // 분석 (유동 영역 등)
  const regime = analysis ? flowRegime(analysis.Re) : null;
  const rangeV = analysis ? rangeStatus(analysis.V, RANGES.velocity) : null;
  const rangeU = analysis ? rangeStatus(analysis.unitLoss_Pa, RANGES.unitLossPa) : null;

  // Q 단위 변환 표기
  function qConvStr(): string {
    switch (flowUnit) {
      case 'lpm':  return `Q = ${Q} LPM (변환 불필요, calc 내부 단위 = LPM)`;
      case 'm3h':  return `Q = ${Q} m³/h × 1,000 / 60 = ${Q_lpm.toFixed(3)} LPM`;
      default:     return `Q = ${Q} ${flowUnitLabel} → ${Q_lpm.toFixed(3)} LPM`;
    }
  }

  // 정통 D-W 대입 계산 (선정 관경)
  // hf/L = 8 × f × Q_m3s² / (π² × g × D_m⁵) × 1000  [mmAq/m]
  const Q_m3s = Q_lpm / 60000;
  const f = mat.frictionFactor;
  const dwCalcStr = `8 × ${f} × (${Q_m3s.toExponential(4)})² / (π² × ${G} × (${ID_m.toFixed(5)})⁵) × 1,000 = ${selected.dropPerM_mmAqPerM.toFixed(3)} mmAq/m`;

  // 허용값 비교 표기
  const allowCompar = `허용 ΔP/L = ${dP} ${pressDef.label}/m, 계산값 = ${drop_display.toFixed(pressDef.dp)} ${pressDef.label}/m ≤ 허용 → 적합`;

  // 최소/최대 관경 표기
  const firstSize = mat.sizes[0]?.nominalA ?? '';
  const lastSize = mat.sizes[mat.sizes.length - 1]?.nominalA ?? '';

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
              <td style={tdStyle}>Darcy-Weisbach (정통)</td>
              <td style={tdStyle}>—</td>
              <td style={tdStyle}>재질별 고정 f</td>
            </tr>
            <tr>
              <td style={tdStyle}>배관 재질</td>
              <td style={tdStyle}>{mat.nameKo}{mat.abbreviation ? ` (${mat.abbreviation})` : ''}</td>
              <td style={tdStyle}>—</td>
              <td style={tdStyle}>f = {mat.frictionFactor}</td>
            </tr>
            <tr>
              <td style={tdStyle}>유량 Q</td>
              <td style={tdStyle}>{Q}</td>
              <td style={tdStyle}>{flowUnitLabel}</td>
              <td style={tdStyle}>—</td>
            </tr>
            <tr>
              <td style={tdStyle}>허용 압력강하 ΔP/L</td>
              <td style={tdStyle}>{dP}</td>
              <td style={tdStyle}>{pressDef.label}/m</td>
              <td style={tdStyle}>—</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* §2 사용 공식 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>2. 사용 공식 — Darcy-Weisbach (정통)</h2>

        <pre style={{
          fontFamily: 'ui-monospace, Consolas, monospace',
          fontSize: '11pt',
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          padding: '6px 10px',
          margin: '0 0 8px 0',
          whiteSpace: 'pre-wrap',
        }}>
          {'hf/L = 8 × f × Q² / (π² × g × D⁵) × 1,000    [mmAq/m]\n  Q [m³/s] = Q[LPM] / 60,000,  D [m] = ID[mm] / 1,000,  g = 9.81 m/s²,  f: 재질별 고정값'}
        </pre>

        <p style={{ fontSize: '11pt', fontWeight: 700, margin: '6px 0 4px 0' }}>■ 기호 정리</p>
        <table style={{ ...tableStyle, marginBottom: '8px' }}>
          <tbody>
            <tr>
              <td style={{ ...tdStyle, width: '80px', fontWeight: 600 }}>Q</td>
              <td style={tdStyle}>유량 [m³/s] — 입력 LPM을 m³/s로 변환 (÷ 60,000)</td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 600 }}>D</td>
              <td style={tdStyle}>관 내경 [m] — 입력 mm를 m로 변환 (÷ 1,000)</td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 600 }}>g</td>
              <td style={tdStyle}>중력가속도 9.81 m/s²</td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 600 }}>f</td>
              <td style={tdStyle}>Darcy 마찰계수 — 재질별 고정값 (탄소강관 0.030, 스테인리스·동관·PVC 0.020)</td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: '10pt', color: '#444', margin: '4px 0 0 0' }}>
          출처: 일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p
        </p>
      </section>

      {/* §3 대입 과정 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>3. 대입 과정 (선정 관경: {selected.size.nominalA}A)</h2>
        <ol style={{ fontSize: '11pt', paddingLeft: '20px', margin: 0, lineHeight: 1.9 }}>

          <li>
            <strong>단위 변환</strong>
            <ul style={{ listStyle: 'disc', paddingLeft: '18px', margin: '2px 0' }}>
              <li>{qConvStr()}</li>
              <li>
                D = {selected.size.nominalA}A → 내경 {ID_mm.toFixed(1)} mm = {ID_m.toFixed(5)} m
              </li>
              <li>
                f = {f} (재질: {mat.nameKo})
              </li>
            </ul>
          </li>

          <li>
            <strong>공식 대입</strong>
            <ul style={{ listStyle: 'disc', paddingLeft: '18px', margin: '2px 0' }}>
              <li>
                hf/L = {dwCalcStr}
              </li>
            </ul>
          </li>

          <li>
            <strong>사용자 압력 단위 환산</strong>
            {': '}
            {selected.dropPerM_mmAqPerM.toFixed(3)} mmAq/m × (9.80665 Pa/mmAq) → {drop_display.toFixed(pressDef.dp)} {pressDef.label}/m
          </li>

          <li>
            <strong>허용값 비교</strong>
            {': '}
            {allowCompar}
          </li>

          <li>
            <strong>선정 요약</strong>
            {': '}관경 목록 ({firstSize}A ~ {lastSize}A)을 작은 호칭부터 스캔 → 허용 ΔP/L 이하가 되는 최소 관경 = <strong>{selected.size.nominalA}A</strong> 선정
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
              <td style={tdStyle}>선정 관경</td>
              <td style={tdStyle}>{selected.size.nominalA}A</td>
              <td style={tdStyle}>—</td>
              <td style={tdStyle}>ID {ID_mm.toFixed(1)} mm</td>
            </tr>
            <tr>
              <td style={tdStyle}>재질 마찰계수 f</td>
              <td style={tdStyle}>{f}</td>
              <td style={tdStyle}>—</td>
              <td style={tdStyle}>{mat.nameKo}</td>
            </tr>
            <tr>
              <td style={tdStyle}>유속 V</td>
              <td style={tdStyle}>{selected.v_ms.toFixed(3)}</td>
              <td style={tdStyle}>m/s</td>
              <td style={tdStyle}>{rangeV ? rangeV.label : '—'}</td>
            </tr>
            <tr>
              <td style={tdStyle}>단위 마찰손실</td>
              <td style={tdStyle}>{drop_display.toFixed(pressDef.dp)}</td>
              <td style={tdStyle}>{pressDef.label}/m</td>
              <td style={tdStyle}>—</td>
            </tr>
            {analysis && (
              <tr>
                <td style={tdStyle}>레이놀즈수 Re</td>
                <td style={tdStyle}>{analysis.Re.toFixed(0)}</td>
                <td style={tdStyle}>—</td>
                <td style={tdStyle}>{regime ? regime.label : '—'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* §5 해석 / 판정 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>5. 해석 / 판정</h2>
        {analysis && regime && rangeV && rangeU ? (
          <>
            <p style={{ fontSize: '11pt', margin: '0 0 6px 0', lineHeight: 1.7 }}>
              선정 관경 <strong>{selected.size.nominalA}A</strong> (내경 {ID_mm.toFixed(1)} mm)에서의 유속은 <strong>{analysis.V.toFixed(3)} m/s</strong>로,
              한국 실무 관행 권장 범위 ({RANGES.velocity.optMin}~{RANGES.velocity.optMax} m/s) 대비 <strong>{rangeV.label}</strong> 수준입니다.
            </p>
            <p style={{ fontSize: '11pt', margin: '0 0 6px 0', lineHeight: 1.7 }}>
              레이놀즈수 Re = {formatRe(analysis.Re)} 으로, <strong>{regime.label}</strong> 영역 ({regime.desc})에 해당합니다.
            </p>
            <p style={{ fontSize: '11pt', margin: '0 0 6px 0', lineHeight: 1.7 }}>
              단위 마찰손실 {drop_display.toFixed(pressDef.dp)} {pressDef.label}/m 은 허용값 {dP} {pressDef.label}/m 대비{' '}
              {drop_display <= dP_num
                ? `${(dP_num - drop_display).toFixed(pressDef.dp)} ${pressDef.label}/m 여유가 있습니다.`
                : '허용값을 초과하였습니다. (관경 상향 검토 권장)'}
            </p>
          </>
        ) : (
          <p style={{ fontSize: '11pt', margin: '0 0 6px 0', lineHeight: 1.7 }}>
            선정 관경 <strong>{selected.size.nominalA}A</strong> (내경 {ID_mm.toFixed(1)} mm),
            유속 {selected.v_ms.toFixed(3)} m/s,
            단위 마찰손실 {drop_display.toFixed(pressDef.dp)} {pressDef.label}/m.
          </p>
        )}
      </section>

      {/* §6 관경별 비교표 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>6. 관경별 비교표</h2>
        <table style={{ ...tableStyle, pageBreakInside: 'auto' }}>
          <thead style={{ display: 'table-header-group' }}>
            <tr>
              <th style={thStyle}>호칭</th>
              <th style={thStyle}>내경 (mm)</th>
              <th style={thStyle}>유속 (m/s)</th>
              <th style={thStyle}>단위손실 ({pressDef.label}/m)</th>
              <th style={thStyle}>비고</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const isSelected = selected.size.nominalA === r.size.nominalA;
              const rowDrop = mmAqToDisplay(r.dropPerM_mmAqPerM, pressureUnit);
              return (
                <tr
                  key={r.size.nominalA}
                  style={{
                    backgroundColor: isSelected ? '#E5E7EB' : 'transparent',
                    fontWeight: isSelected ? 600 : 400,
                    pageBreakInside: 'avoid',
                  }}
                >
                  <td style={tdStyle}>{r.size.nominalA}A</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{r.size.id_mm.toFixed(1)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{r.v_ms.toFixed(3)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{rowDrop.toFixed(pressDef.dp)}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{isSelected ? '★ 선정' : r.ok ? 'OK' : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
