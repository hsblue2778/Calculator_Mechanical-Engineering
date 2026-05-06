// HVAC 펌프 시스템 — 인쇄 전용 콘텐츠 (PrintReport의 children으로 삽입)
// @media print 시에만 표시됨 (index.css .print-report 규칙)
// §1~§9 완전 출처·중간값 포함 (발주처 제출용)

import type { PumpHvacResult, SystemMode, EquipKind, PumpCurveAtHz } from './calc';
import { getBepVerdict } from './tabs/OperatingPointChart';
import type { FluidId } from './configs/types';
import type { PressureUnitPumpKey } from './units';
import { PRESSURE_UNITS_PUMP, POWER_UNITS } from './units';

const tdStyle: React.CSSProperties = {
  border: '1px solid #999', padding: '4px 8px', fontSize: '11pt', verticalAlign: 'middle',
};
const thStyle: React.CSSProperties = {
  border: '1px solid #999', padding: '4px 8px', fontSize: '11pt',
  fontWeight: 700, backgroundColor: '#F3F4F6', verticalAlign: 'middle',
};
const tableStyle: React.CSSProperties = { borderCollapse: 'collapse', width: '100%', fontSize: '11pt' };
const sectionStyle: React.CSSProperties = { marginBottom: '10mm' };
const h2Style: React.CSSProperties = { fontSize: '12pt', fontWeight: 700, margin: '0 0 6px 0', color: '#000' };

interface Props {
  result: PumpHvacResult;
  systemMode: SystemMode;
  fluid: FluidId;
  tempC: number;
  Q_m3s: number;
  Q_display: string;
  flowUnitLabel: string;
  HsStr: string;
  HdStr: string;
  PresStr: string;
  presUnit: PressureUnitPumpKey;
  PatmStr: string;
  headMarginStr: string;
  powerMarginStr: string;
  npshMarginStr: string;
  presetApplied: { head: boolean; power: boolean; npsh: boolean };
  fieldLabel: string;
  npshrStr: string;
  // 운전점 차트 요약용 (선택)
  pumpCurve?: { Q_m3h: number; H_m: number }[];
  BEP_Q_m3h?: number | null;
  operatingPoint?: { Q_m3h: number; H_m: number } | null;
  // 인버터(VFD) 운전 시리즈
  pumpCurveFamily?: PumpCurveAtHz[];
  catalogHz?: number;
}

export default function PrintReportContent({
  result, systemMode, fluid, tempC, Q_m3s, Q_display, flowUnitLabel,
  HsStr, HdStr, PresStr, presUnit, PatmStr,
  headMarginStr, powerMarginStr, npshMarginStr, presetApplied,
  fieldLabel, npshrStr,
  pumpCurve, BEP_Q_m3h, operatingPoint,
  pumpCurveFamily, catalogHz,
}: Props) {
  const r = result;
  const isClosed = systemMode === 'closed';
  const FLUID_LABELS: Record<FluidId, string> = {
    'water': '냉수',
    'cooling-water': '냉각수',
    'hot-water': '온수',
    'glycol-eg': 'EG 브라인',
    'glycol-pg': 'PG 브라인',
  };
  const fluidLabel = FLUID_LABELS[fluid] ?? fluid;
  const presLabel = PRESSURE_UNITS_PUMP.find(u => u.key === presUnit)?.label ?? 'kPa';
  const Q_lpm = (Q_m3s * 60000).toFixed(1);
  const Q_m3h = (Q_m3s * 3600).toFixed(3);
  const patmLabel = isClosed ? '시스템 충진 절대압력 P_fill' : '흡입측 표면 절대압력 P_atm';

  return (
    <>
      {/* §1 입력 요약 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>1. 입력 요약</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>항목</th>
              <th style={thStyle}>값</th>
              <th style={thStyle}>단위</th>
              <th style={thStyle}>비고 / 출처</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style={tdStyle}>분야</td><td style={tdStyle}>{fieldLabel}</td><td style={tdStyle}>—</td><td style={tdStyle}>—</td></tr>
            <tr>
              <td style={tdStyle}>시스템 모드</td>
              <td style={tdStyle}>{isClosed ? '폐회로 (Closed)' : '개방계 (Open)'}</td>
              <td style={tdStyle}>—</td>
              <td style={tdStyle}>사용자 선택</td>
            </tr>
            <tr><td style={tdStyle}>운전 유체</td><td style={tdStyle}>{fluidLabel}</td><td style={tdStyle}>—</td><td style={tdStyle}>Phase 1.0 청수/온수 한정</td></tr>
            <tr><td style={tdStyle}>운전 온도</td><td style={tdStyle}>{tempC}</td><td style={tdStyle}>°C</td><td style={tdStyle}>—</td></tr>
            <tr>
              <td style={tdStyle}>정격 유량 Q</td>
              <td style={tdStyle}>{Q_display}</td>
              <td style={tdStyle}>{flowUnitLabel}</td>
              <td style={tdStyle}>{Q_lpm} LPM / {Q_m3h} m³/h</td>
            </tr>
            <tr>
              <td style={tdStyle}>유체 밀도 ρ</td>
              <td style={tdStyle}>{r.rho.toFixed(2)}</td>
              <td style={tdStyle}>kg/m³</td>
              <td style={tdStyle}>출처: NIST WebBook (https://webbook.nist.gov)</td>
            </tr>
            <tr>
              <td style={tdStyle}>유체 동점성계수 ν</td>
              <td style={tdStyle}>{(r.nu * 1e6).toFixed(4)}</td>
              <td style={tdStyle}>mm²/s (×10⁻⁶ m²/s)</td>
              <td style={tdStyle}>출처: NIST WebBook</td>
            </tr>
            <tr>
              <td style={tdStyle}>포화수증기압 P_vapor</td>
              <td style={tdStyle}>{r.P_vapor_Pa.toFixed(1)}</td>
              <td style={tdStyle}>Pa</td>
              <td style={tdStyle}>출처: Antoine 식, Engineering Toolbox (https://www.engineeringtoolbox.com)</td>
            </tr>
            <tr>
              <td style={tdStyle}>중력가속도 g</td>
              <td style={tdStyle}>9.81</td>
              <td style={tdStyle}>m/s²</td>
              <td style={tdStyle}>표준값</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* §2 배관 마찰손실 (다중 행) */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>2. 배관 마찰손실</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>번호</th>
              <th style={thStyle}>측</th>
              <th style={thStyle}>재질</th>
              <th style={thStyle}>두께규격</th>
              <th style={thStyle}>호칭경</th>
              <th style={thStyle}>내경 (mm)</th>
              <th style={thStyle}>길이 (m)</th>
              <th style={thStyle}>f</th>
              <th style={thStyle}>유속 (m/s)</th>
              <th style={thStyle}>Re</th>
              <th style={thStyle}>마찰손실 (m)</th>
            </tr>
          </thead>
          <tbody>
            {r.sucPipes.map(p => (
              <tr key={p.pipeLabel}>
                <td style={tdStyle}>{p.pipeLabel}</td>
                <td style={tdStyle}>흡입</td>
                <td style={tdStyle}>{p.materialNameKo}</td>
                <td style={tdStyle}>{p.scheduleLabel}</td>
                <td style={tdStyle}>{p.nominalA}A</td>
                <td style={tdStyle}>{p.id_mm.toFixed(1)}</td>
                <td style={tdStyle}>{p.L_m.toFixed(2)}</td>
                <td style={tdStyle}>{p.f.toFixed(3)}</td>
                <td style={tdStyle}>{p.V_ms.toFixed(4)}</td>
                <td style={tdStyle}>{Math.round(p.Re).toLocaleString()}</td>
                <td style={tdStyle}>{p.hf_m.toFixed(5)}</td>
              </tr>
            ))}
            <tr style={{ backgroundColor: '#F3F4F6', fontWeight: 700 }}>
              <td style={tdStyle} colSpan={10}>흡입측 합계</td>
              <td style={tdStyle}>{r.sucPipeLoss_total_m.toFixed(5)}</td>
            </tr>
            {r.disPipes.map(p => (
              <tr key={p.pipeLabel}>
                <td style={tdStyle}>{p.pipeLabel}</td>
                <td style={tdStyle}>토출</td>
                <td style={tdStyle}>{p.materialNameKo}</td>
                <td style={tdStyle}>{p.scheduleLabel}</td>
                <td style={tdStyle}>{p.nominalA}A</td>
                <td style={tdStyle}>{p.id_mm.toFixed(1)}</td>
                <td style={tdStyle}>{p.L_m.toFixed(2)}</td>
                <td style={tdStyle}>{p.f.toFixed(3)}</td>
                <td style={tdStyle}>{p.V_ms.toFixed(4)}</td>
                <td style={tdStyle}>{Math.round(p.Re).toLocaleString()}</td>
                <td style={tdStyle}>{p.hf_m.toFixed(5)}</td>
              </tr>
            ))}
            <tr style={{ backgroundColor: '#F3F4F6', fontWeight: 700 }}>
              <td style={tdStyle} colSpan={10}>토출측 합계</td>
              <td style={tdStyle}>{r.disPipeLoss_total_m.toFixed(5)}</td>
            </tr>
          </tbody>
        </table>
        <p style={{ fontSize: '10pt', margin: '4px 0 0 0', color: '#444' }}>
          공식: hf = 8·f·L·Q²/(π²·g·D⁵) — Darcy-Weisbach (일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p)
        </p>
        <p style={{ fontSize: '10pt', margin: '2px 0 0 0', color: '#444' }}>
          마찰계수 f: 재질별 고정값 (탄소강관 0.030, 스테인리스 0.020, 동관 0.020, PVC/C-PVC 0.020) — pipeMaterials.ts
        </p>
      </section>

      {/* §3 부속류 손실 */}
      {r.fittingDetails.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={h2Style}>3. 부속류 손실 (K-Method)</h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>번호</th>
                <th style={thStyle}>배관참조</th>
                <th style={thStyle}>부속명</th>
                <th style={thStyle}>K</th>
                <th style={thStyle}>유속 (m/s)</th>
                <th style={thStyle}>수량</th>
                <th style={thStyle}>손실합계 (m)</th>
              </tr>
            </thead>
            <tbody>
              {r.fittingDetails.map(d => (
                <tr key={d.fittingLabel}>
                  <td style={tdStyle}>{d.fittingLabel}</td>
                  <td style={tdStyle}>{d.pipeLabel}</td>
                  <td style={tdStyle}>{d.nameKo}</td>
                  <td style={tdStyle}>{d.K.toFixed(2)}</td>
                  <td style={tdStyle}>{d.V_ms.toFixed(4)}</td>
                  <td style={tdStyle}>{d.qty}</td>
                  <td style={tdStyle}>{d.h_total_m.toFixed(5)}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700 }}>
                <td style={tdStyle} colSpan={6}>합계</td>
                <td style={tdStyle}>{r.totalFittingLoss_m.toFixed(5)}</td>
              </tr>
            </tbody>
          </table>
          <p style={{ fontSize: '10pt', margin: '4px 0 0 0', color: '#444' }}>
            h_K = K × V² / (2·g) — Perry's Chemical Engineers' Handbook 8th Ed (2008)
          </p>
          <p style={{ fontSize: '10pt', margin: '2px 0 0 0', color: '#444' }}>
            K값 범위: 난류 (Re &gt; 4,000) 기준 단일 K
          </p>
        </section>
      )}

      {/* §4 장비류 손실 */}
      {r.equipDetails.length > 0 && (
        <section style={sectionStyle}>
          <h2 style={h2Style}>4. 장비류 손실</h2>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>번호</th>
                <th style={thStyle}>배관참조</th>
                <th style={thStyle}>종류</th>
                <th style={thStyle}>장비명</th>
                <th style={thStyle}>입력 ΔP (Pa)</th>
                <th style={thStyle}>Dirty</th>
                <th style={thStyle}>손실수두 (m)</th>
              </tr>
            </thead>
            <tbody>
              {r.equipDetails.map(e => {
                const KIND_KO: Record<EquipKind, string> = {
                  'control-valve': '컨트롤 밸브',
                  'heat-exchanger': '열교환기',
                  'filter': '필터',
                  'pump': '펌프',
                  'other': '기타',
                };
                return (
                  <tr key={e.equipLabel}>
                    <td style={tdStyle}>{e.equipLabel}</td>
                    <td style={tdStyle}>{e.pipeLabel}</td>
                    <td style={tdStyle}>{KIND_KO[e.kind] ?? '기타'}</td>
                    <td style={tdStyle}>{e.name}</td>
                    <td style={tdStyle}>{e.dP_Pa.toFixed(1)}</td>
                    <td style={tdStyle}>{e.dirtyApplied ? 'Dirty ×2.5' : '—'}</td>
                    <td style={tdStyle}>{e.h_m.toFixed(5)}</td>
                  </tr>
                );
              })}
              <tr style={{ fontWeight: 700 }}>
                <td style={tdStyle} colSpan={6}>합계</td>
                <td style={tdStyle}>{r.equipLoss_m.toFixed(5)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {/* §4a 양정 구성 분석 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>4a. 양정 구성 분석</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>항목</th>
              <th style={thStyle}>값 (m)</th>
              <th style={thStyle}>TDH 대비 (%)</th>
              <th style={thStyle}>비고</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const bd = r.headBreakdown_m;
              const TDH = r.TDH_m;
              const pct = (v: number) => TDH > 0 ? ((v / TDH) * 100).toFixed(1) + '%' : '—';
              const rows: { label: string; value: number; note?: string }[] = [
                { label: '컨트롤 밸브', value: bd.controlValve, note: r.cvVerdict !== 'na' ? `β = ${r.cvAuthority.toFixed(2)} (${({ 'ok': '권장 범위', 'low-margin': '권위 부족', 'too-low': '제어성 위험', 'high-margin': '다소 과도', 'too-high': '동력 낭비', 'na': '' } as Record<string, string>)[r.cvVerdict]})` : undefined },
                { label: '열교환기',    value: bd.heatExchanger },
                { label: '필터',        value: bd.filter },
                { label: '펌프 부속',   value: bd.pumpEquip },
                { label: '기타 장비',   value: bd.otherEquip },
                { label: '배관 마찰',   value: bd.pipeFriction, note: '직관 + 부속' },
                { label: '정수두+잔류', value: bd.staticAndResidual },
              ];
              return rows.map(row => (
                <tr key={row.label}>
                  <td style={tdStyle}>{row.label}</td>
                  <td style={tdStyle}>{row.value.toFixed(4)}</td>
                  <td style={tdStyle}>{pct(row.value)}</td>
                  <td style={tdStyle}>{row.note ?? '—'}</td>
                </tr>
              ));
            })()}
            <tr style={{ fontWeight: 700, backgroundColor: '#EFF6FF' }}>
              <td style={tdStyle}>TDH 합계</td>
              <td style={tdStyle}>{r.TDH_m.toFixed(4)}</td>
              <td style={tdStyle}>100%</td>
              <td style={tdStyle}>—</td>
            </tr>
          </tbody>
        </table>
        <p style={{ fontSize: '10pt', margin: '4px 0 0 0', color: '#444' }}>
          출처: ASHRAE Pumping Authority guideline — 컨트롤 밸브 권위 β = ΔP_CV / TDH (권장 0.25~0.50)
        </p>
      </section>

      {/* §5 정수두·잔류압력 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>5. 정수두 · 잔류압력</h2>
        <table style={tableStyle}>
          <tbody>
            <tr>
              <td style={thStyle}>{isClosed ? '펌프 위치 수두 차 Hs' : '흡입측 정수두 Hs'}</td>
              <td style={tdStyle}>{HsStr} m</td>
              <td style={tdStyle}>{isClosed ? '팽창탱크(충진 기준점) 대비 펌프 위치' : '음수 = 흡입 양정'}</td>
            </tr>
            <tr>
              <td style={thStyle}>{isClosed ? '토출측 정수두 Hd (폐회로 — 사용 안 함)' : '토출측 정수두 Hd'}</td>
              <td style={tdStyle}>{isClosed ? '0 (폐회로 모드)' : `${HdStr} m`}</td>
              <td style={tdStyle}>—</td>
            </tr>
            <tr>
              <td style={thStyle}>정수두 차 (Hd-Hs)</td>
              <td style={tdStyle}>{isClosed ? '0 (폐회로 모드)' : `${r.staticHead_m.toFixed(3)} m`}</td>
              <td style={tdStyle}>—</td>
            </tr>
            <tr>
              <td style={thStyle}>잔류 토출 압력 P_res</td>
              <td style={tdStyle}>{PresStr} {presLabel}</td>
              <td style={tdStyle}>수두 환산: {r.Hres_m.toFixed(3)} m</td>
            </tr>
            <tr>
              <td style={thStyle}>{patmLabel}</td>
              <td style={tdStyle}>{PatmStr} kPa</td>
              <td style={tdStyle}>NPSHa 계산 기준 ({isClosed ? 'P_fill' : 'P_atm'})</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* §6 안전율 프리셋 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>6. 안전율 프리셋</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>항목</th>
              <th style={thStyle}>적용값</th>
              <th style={thStyle}>비고</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>양정 여유</td>
              <td style={tdStyle}>{headMarginStr} %</td>
              <td style={tdStyle}>{presetApplied.head ? `${fieldLabel} 기본값` : '사용자 수정'}</td>
            </tr>
            <tr>
              <td style={tdStyle}>동력 여유</td>
              <td style={tdStyle}>{powerMarginStr} 배</td>
              <td style={tdStyle}>{presetApplied.power ? `${fieldLabel} 기본값` : '사용자 수정'}</td>
            </tr>
            <tr>
              <td style={tdStyle}>NPSH 여유</td>
              <td style={tdStyle}>{npshMarginStr} m</td>
              <td style={tdStyle}>{presetApplied.npsh ? `${fieldLabel} 기본값` : '사용자 수정'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* §7 NPSHa 변수 추적표 (신규 — 발주처 제출용) */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>7. NPSHa 변수 추적표</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>변수</th>
              <th style={thStyle}>값</th>
              <th style={thStyle}>단위</th>
              <th style={thStyle}>출처 / 공식</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>{isClosed ? 'P_fill' : 'P_atm'}</td>
              <td style={tdStyle}>{((parseFloat(PatmStr) || 101.325) * 1000).toFixed(0)}</td>
              <td style={tdStyle}>Pa</td>
              <td style={tdStyle}>사용자 입력 / {isClosed ? '폐회로 충진압력' : '대기압 기준'}</td>
            </tr>
            <tr>
              <td style={tdStyle}>P_vapor</td>
              <td style={tdStyle}>{r.P_vapor_Pa.toFixed(2)}</td>
              <td style={tdStyle}>Pa</td>
              <td style={tdStyle}>Antoine 식 (Engineering Toolbox, 0~100°C 물)</td>
            </tr>
            <tr>
              <td style={tdStyle}>ρ (밀도)</td>
              <td style={tdStyle}>{r.rho.toFixed(2)}</td>
              <td style={tdStyle}>kg/m³</td>
              <td style={tdStyle}>NIST WebBook</td>
            </tr>
            <tr>
              <td style={tdStyle}>g</td>
              <td style={tdStyle}>9.81</td>
              <td style={tdStyle}>m/s²</td>
              <td style={tdStyle}>표준값</td>
            </tr>
            <tr>
              <td style={tdStyle}>Hs {isClosed ? '(펌프 위치 수두 차)' : ''}</td>
              <td style={tdStyle}>{HsStr}</td>
              <td style={tdStyle}>m</td>
              <td style={tdStyle}>사용자 입력</td>
            </tr>
            <tr>
              <td style={tdStyle}>Σhf_suc (흡입 배관 합산)</td>
              <td style={tdStyle}>{r.sucPipeLoss_total_m.toFixed(5)}</td>
              <td style={tdStyle}>m</td>
              <td style={tdStyle}>Darcy-Weisbach (배관별 합산)</td>
            </tr>
            <tr>
              <td style={tdStyle}>Σh_fit_suc (흡입 부속 합산)</td>
              <td style={tdStyle}>{r.sucFittingLoss_m.toFixed(5)}</td>
              <td style={tdStyle}>m</td>
              <td style={tdStyle}>K-method (흡입측 부속 합산)</td>
            </tr>
            <tr style={{ fontWeight: 700, backgroundColor: '#EFF6FF' }}>
              <td style={tdStyle}>NPSHa</td>
              <td style={tdStyle}>{r.NPSHa_m.toFixed(4)}</td>
              <td style={tdStyle}>m</td>
              <td style={tdStyle}>
                ({isClosed ? 'P_fill' : 'P_atm'} - P_vapor) / (ρ·g) + Hs - Σhf_suc - Σh_fit_suc
              </td>
            </tr>
            {r.NPSHr_m > 0 && (
              <>
                <tr>
                  <td style={tdStyle}>NPSHr (카탈로그)</td>
                  <td style={tdStyle}>{r.NPSHr_m.toFixed(4)}</td>
                  <td style={tdStyle}>m</td>
                  <td style={tdStyle}>펌프 카탈로그 입력값</td>
                </tr>
                <tr>
                  <td style={tdStyle}>NPSHa - NPSHr (실제 여유)</td>
                  <td style={tdStyle}>{r.NPSHmargin_actual_m !== null ? r.NPSHmargin_actual_m.toFixed(4) : '—'}</td>
                  <td style={tdStyle}>m</td>
                  <td style={tdStyle}>
                    {r.NPSHverdict === 'pass' && `여유 통과 (>= ${npshrStr} m + 여유)`}
                    {r.NPSHverdict === 'low-margin' && '여유 부족 (0 이상이나 권장 여유 미달)'}
                    {r.NPSHverdict === 'risk' && '캐비테이션 위험 (NPSHa < NPSHr)'}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
        <p style={{ fontSize: '10pt', margin: '4px 0 0 0', color: '#444' }}>
          {isClosed
            ? '폐회로 출처: ASHRAE Handbook — Closed-Loop Hydronic System 항목 / Hydraulic Institute HI 9.6.1'
            : '출처: Hydraulic Institute Standards HI 9.6.1'}
        </p>
      </section>

      {/* §8 최종 결과 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>8. 최종 결과</h2>
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
              <td style={tdStyle}>총양정 TDH</td>
              <td style={tdStyle}>{r.TDH_m.toFixed(4)}</td>
              <td style={tdStyle}>m</td>
              <td style={tdStyle}>{isClosed ? '폐회로: 정수두 차 0 포함' : '—'}</td>
            </tr>
            <tr>
              <td style={tdStyle}>설계 양정</td>
              <td style={tdStyle}>{r.designHead_m.toFixed(4)}</td>
              <td style={tdStyle}>m</td>
              <td style={tdStyle}>TDH × (1 + {headMarginStr}%)</td>
            </tr>
            <tr>
              <td style={tdStyle}>NPSHa</td>
              <td style={tdStyle}>{r.NPSHa_m.toFixed(4)}</td>
              <td style={tdStyle}>m</td>
              <td style={tdStyle}>
                {r.NPSHverdict === 'na' && 'NPSHr 미입력 — 펌프 선정 단계에서 비교'}
                {r.NPSHverdict === 'pass' && `여유 통과 (NPSHa - NPSHr = ${r.NPSHmargin_actual_m?.toFixed(2)} m)`}
                {r.NPSHverdict === 'low-margin' && `여유 부족 (NPSHa - NPSHr = ${r.NPSHmargin_actual_m?.toFixed(2)} m)`}
                {r.NPSHverdict === 'risk' && `캐비테이션 위험 (NPSHa - NPSHr = ${r.NPSHmargin_actual_m?.toFixed(2)} m)`}
              </td>
            </tr>
            <tr>
              <td style={tdStyle}>이론 동력</td>
              <td style={tdStyle}>{(r.theoPower_W / 1000).toFixed(4)}</td>
              <td style={tdStyle}>kW</td>
              <td style={tdStyle}>η = 0.65, P = ρ·g·Q·H/η</td>
            </tr>
            <tr>
              <td style={tdStyle}>이론 동력 (HP)</td>
              <td style={tdStyle}>{(r.theoPower_W / 745.7).toFixed(4)}</td>
              <td style={tdStyle}>HP</td>
              <td style={tdStyle}>1 HP = 745.7 W</td>
            </tr>
            <tr>
              <td style={tdStyle}>설계 동력</td>
              <td style={tdStyle}>{(r.designPower_W / 1000).toFixed(4)}</td>
              <td style={tdStyle}>kW</td>
              <td style={tdStyle}>이론 동력 × {powerMarginStr}배</td>
            </tr>
            <tr>
              <td style={tdStyle}>권장 모터 정격 (IEC 60034-1)</td>
              <td style={tdStyle}>{r.recommendedMotorRating_kW > 0 ? r.recommendedMotorRating_kW : '—'}</td>
              <td style={tdStyle}>kW</td>
              <td style={tdStyle}>설계 동력 이상 최소 IEC 표준 정격 / IE3 효율등급 이상 권장</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* §9 운전점 요약 + 인버터(VFD) 운전 시리즈 */}
      {(() => {
        const r = result;
        const hasPumpCurve = pumpCurve && pumpCurve.length >= 2;
        const opPoint = operatingPoint ?? null;
        const bepVerdict = opPoint && BEP_Q_m3h != null && BEP_Q_m3h > 0
          ? getBepVerdict(opPoint.Q_m3h, BEP_Q_m3h)
          : 'na';
        const bepRatioStr = opPoint && BEP_Q_m3h != null && BEP_Q_m3h > 0
          ? `${((opPoint.Q_m3h / BEP_Q_m3h) * 100).toFixed(0)}%`
          : '—';
        const verdictLabel: Record<string, string> = {
          optimal: '최적 영역 (80~110%)',
          acceptable: '허용 영역 (70~80% 또는 110~125%)',
          'out-of-range': '범위 이탈',
          na: '—',
        };
        const hasFamily = pumpCurveFamily && pumpCurveFamily.length > 0;
        const hasBep = BEP_Q_m3h != null && BEP_Q_m3h > 0;
        const effectiveCatalogHz = catalogHz ?? 60;
        return (
          <section style={sectionStyle}>
            <h2 style={h2Style}>9. 운전점 요약</h2>
            <table style={tableStyle}>
              <tbody>
                <tr>
                  <td style={thStyle}>시스템 H_static</td>
                  <td style={tdStyle}>{r.H_static_now_m.toFixed(3)} m</td>
                  <td style={tdStyle}>정수두 (폐회로: 0)</td>
                </tr>
                <tr>
                  <td style={thStyle}>시스템 저항 계수 k</td>
                  <td style={tdStyle}>{r.k_system.toFixed(6)} m/(m³/h)²</td>
                  <td style={tdStyle}>H(Q) = H_static + k·Q²</td>
                </tr>
                <tr>
                  <td style={thStyle}>설계 유량 Q_design</td>
                  <td style={tdStyle}>{(Q_m3s * 3600).toFixed(3)} m³/h</td>
                  <td style={tdStyle}>—</td>
                </tr>
                <tr>
                  <td style={thStyle}>총양정 TDH</td>
                  <td style={tdStyle}>{r.TDH_m.toFixed(3)} m</td>
                  <td style={tdStyle}>—</td>
                </tr>
                <tr>
                  <td style={thStyle}>카탈로그 기준 Hz</td>
                  <td style={tdStyle}>{effectiveCatalogHz} Hz</td>
                  <td style={tdStyle}>H-Q 곡선 측정 주파수</td>
                </tr>
                {opPoint && (
                  <tr>
                    <td style={thStyle}>운전점 (펌프·시스템 교점)</td>
                    <td style={tdStyle}>Q = {opPoint.Q_m3h.toFixed(2)} m³/h, H = {opPoint.H_m.toFixed(2)} m</td>
                    <td style={tdStyle}>펌프 곡선과 시스템 곡선의 교점 (선형 보간)</td>
                  </tr>
                )}
                {hasBep && (
                  <tr>
                    <td style={thStyle}>BEP 유량 Q_BEP (카탈로그 {effectiveCatalogHz}Hz)</td>
                    <td style={tdStyle}>{BEP_Q_m3h!.toFixed(2)} m³/h</td>
                    <td style={tdStyle}>펌프 카탈로그 최고효율점</td>
                  </tr>
                )}
                {opPoint && hasBep && (
                  <tr>
                    <td style={thStyle}>BEP 대비 운전점</td>
                    <td style={tdStyle}>{bepRatioStr}</td>
                    <td style={tdStyle}>{verdictLabel[bepVerdict]}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* 인버터(VFD) 운전 시리즈 표 */}
            {hasFamily && (
              <>
                <p style={{ fontSize: '11pt', fontWeight: 700, margin: '10px 0 4px 0' }}>
                  인버터(VFD) 운전 시리즈 — 상사칙(Affinity Laws) 적용
                </p>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Hz</th>
                      <th style={thStyle}>Q [m³/h]</th>
                      <th style={thStyle}>H [m]</th>
                      <th style={thStyle}>P [kW]</th>
                      {hasBep && <th style={thStyle}>BEP %</th>}
                      {hasBep && <th style={thStyle}>적정성</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pumpCurveFamily!.map(curve => {
                      const isCatalog = curve.hz === effectiveCatalogHz;
                      const op = curve.operatingPoint;
                      const bepQAtHz = hasBep && effectiveCatalogHz > 0
                        ? (BEP_Q_m3h! * curve.hz / effectiveCatalogHz)
                        : null;
                      const bepPct = op && bepQAtHz
                        ? (op.Q_m3h / bepQAtHz) * 100
                        : null;
                      const vLabel: Record<string, string> = {
                        optimal: '최적', acceptable: '허용', 'out-of-range': '권장 외', na: '—',
                      };
                      return (
                        <tr key={curve.hz} style={isCatalog ? { backgroundColor: '#EFF6FF' } : undefined}>
                          <td style={{ ...tdStyle, fontWeight: isCatalog ? 700 : 400 }}>
                            {curve.hz} Hz{isCatalog ? ' (카탈로그)' : ''}
                          </td>
                          <td style={tdStyle}>{op ? op.Q_m3h.toFixed(2) : '—'}</td>
                          <td style={tdStyle}>{op ? op.H_m.toFixed(2) : '—'}</td>
                          <td style={tdStyle}>{op ? (op.P_W / 1000).toFixed(3) : '—'}</td>
                          {hasBep && <td style={tdStyle}>{bepPct != null && op ? `${bepPct.toFixed(0)}%` : '—'}</td>}
                          {hasBep && <td style={tdStyle}>{vLabel[curve.bepVerdict] ?? '—'}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p style={{ fontSize: '10pt', color: '#444', margin: '4px 0 0 0' }}>
                  상사칙(Affinity Laws): Q∝N, H∝N², P∝N³ (N∝Hz)
                </p>
                <p style={{ fontSize: '10pt', color: '#444', margin: '2px 0 0 0' }}>
                  출처: Hydraulic Institute Standards (Affinity Laws), ISO 9906, ASHRAE Pump Handbook
                </p>
              </>
            )}

            {hasPumpCurve && (
              <>
                <p style={{ fontSize: '11pt', fontWeight: 700, margin: '8px 0 4px 0' }}>펌프 H-Q 곡선 입력 점 ({effectiveCatalogHz}Hz 기준)</p>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>점</th>
                      <th style={thStyle}>Q [m³/h]</th>
                      <th style={thStyle}>H [m]</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pumpCurve!.map((p, i) => (
                      <tr key={i}>
                        <td style={tdStyle}>{i + 1}</td>
                        <td style={tdStyle}>{p.Q_m3h.toFixed(2)}</td>
                        <td style={tdStyle}>{p.H_m.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            {!hasPumpCurve && (
              <p style={{ fontSize: '10pt', color: '#666', margin: '4px 0 0 0' }}>
                펌프 H-Q 곡선 미입력 — 시스템 곡선만 계산됨
              </p>
            )}
          </section>
        );
      })()}

      {/* §10 적용 표준 */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>10. 적용 표준 ({fieldLabel})</h2>
        <ul style={{ fontSize: '11pt', paddingLeft: '18px', margin: 0, lineHeight: 1.8 }}>
          <li>ASHRAE Handbook — HVAC Systems and Equipment (Pumps Chapter)</li>
          {isClosed && (
            <li>ASHRAE Handbook — Closed-Loop Hydronic Systems 항목 (폐회로 NPSHa 식)</li>
          )}
          <li>SAREK 설비편람 (한국설비기술협회)</li>
          <li>건축기계설비공사 표준시방서 (국토교통부)</li>
          <li>Hydraulic Institute Standards HI 9.6.1 (NPSH)</li>
          <li>Perry's Chemical Engineers' Handbook 8th Ed (2008) — K값 출처</li>
          <li>NIST Chemistry WebBook — 청수/온수 물성 (https://webbook.nist.gov)</li>
          <li>Engineering Toolbox — 포화수증기압 Antoine 식 (https://www.engineeringtoolbox.com)</li>
          <li>일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p — Darcy-Weisbach</li>
          <li>IEC 60034-1 Rotating electrical machines — Rating and performance (모터 표준 정격)</li>
          <li>ASHRAE Filtration &amp; Air Cleaning — 필터 Dirty 마진 ×2.5 (clean ΔP 기준 일반 운전 마진)</li>
          <li>ASHRAE Pumping Authority guideline — 컨트롤 밸브 권위 β = ΔP_CV / TDH (권장 0.25~0.50)</li>
          <li>Hydraulic Institute Standards (Affinity Laws) / ISO 9906 / ASHRAE Pump Handbook — 인버터(VFD) 상사칙 Q∝N, H∝N², P∝N³</li>
        </ul>
        <p style={{ fontSize: '10pt', color: '#666', marginTop: 8 }}>
          Phase 1.0 청수/온수 한정 — EG/PG 브라인은 Phase 1.5에서 추가 예정
        </p>
        <p style={{ fontSize: '10pt', color: '#666', marginTop: 4 }}>
          {POWER_UNITS.map(u => u.label).join(' / ')} 단위 선택 가능
        </p>
      </section>
    </>
  );
}
