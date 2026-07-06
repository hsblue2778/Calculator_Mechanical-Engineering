// 마찰손실 계통 계산기 — 개요 탭 (공식·출처·참고자료·제한사항)

import Frac from '../../../components/Frac';
import FormulaSection from '../../../components/FormulaSection';
import InfoBlock from '../../../components/InfoBlock';
import { FN_MATERIALS } from '../../../data/frictionNetworkRef.ts';
import { FITTING_K_VALUES } from '../../../data/fitting-k-values';
import { C } from '../styles';

export default function OverviewTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 14, color: C.textDark, lineHeight: 1.65 }}>
      <p>
        <b>분기(트리) 계통 전체</b>의 마찰손실을 한 표에서 계산합니다. 구간마다 부모 ID를 지정하면
        말단 유량이 상류로 자동 합산되고, 경로별 누적손실과 말단 요구압을 더해
        <b> 설계 가용정압(P_avail×(1−α))</b>과 비교해 여유/부족을 판정합니다.
        원형 배관과 <b>사각 덕트(상당지름 De)</b>를 함께 다룰 수 있습니다.
      </p>

      <FormulaSection title="구간 마찰손실 (Q형 Darcy-Weisbach)">
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <span>ΔP<sub>마찰</sub></span><span>=</span>
          <Frac n={<>8 · f · L · ρ · Q²</>} d={<>π² · De⁵</>} />
          <span style={{ marginLeft: 8, color: C.text, fontSize: 12 }}>[Pa] (De: m)</span>
        </div>
        <p style={{ fontSize: 11, color: C.text, margin: '6px 0 0 0' }}>
          f: Re&lt;2,300 층류 64/Re · Re≥2,300 전부 Swamee-Jain 0.25/[log₁₀(ε/(3.7·De)+5.74/Re^0.9)]² — 참조 엑셀 방식 그대로.
          관마찰손실 계산기의 Colebrook-White·천이 3차 보간과 다르므로 천이역(2,300~4,000)에서는 두 계산기의 f가 다릅니다.
        </p>
      </FormulaSection>

      <FormulaSection title="부차손실·기기손실·누적">
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <span>ΔP<sub>부차</sub> = ΣK ·</span>
          <Frac n={<>ρ · V²</>} d={<>2</>} />
          <span style={{ margin: '0 10px' }}>·</span>
          <span>ΔP<sub>구간</sub> = ΔP<sub>마찰</sub> + ΔP<sub>부차</sub> + 기기손실</span>
        </div>
        <p style={{ fontSize: 12, color: C.text, margin: '6px 0 0 0' }}>
          누적ΔP = ΔP<sub>구간</sub> + 부모 누적(ROOT→0) · 누적+요구압 = 누적 + (말단이면 P_req) · mmAq = Pa ÷ 9.80665
        </p>
      </FormulaSection>

      <FormulaSection title="사각 덕트 상당지름 · 유속 판정">
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
          <span>De = 1.3 ·</span>
          <Frac n={<>(a·b)<sup>0.625</sup></>} d={<>(a+b)<sup>0.25</sup></>} />
          <span style={{ marginLeft: 8, color: C.text, fontSize: 12 }}>[mm] · V = Q/A (실단면 기준)</span>
        </div>
        <p style={{ fontSize: 12, color: C.text, margin: '6px 0 0 0' }}>
          유속판정: V&gt;적용최대 ▲유속초과 / V&lt;적용최소 ▼과대관경 · 제안D = √(4Q/(π·V<sub>max</sub>))×1000 [mm]
          — 적용범위는 계통 종류(덕트/배관)×구간 등급(메인/서브/분기) 기본값, 설정에서 수정 가능
        </p>
      </FormulaSection>

      <InfoBlock title="사용 공식·데이터 출처">
        <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
          <li>• <b>공식·구조</b>: 참조 엑셀 '마찰손실 계통 계산기' (Settings·구간테이블) 이식 — 재유도 없음</li>
          <li>• <b>Swamee-Jain(1976)</b>: 관마찰손실 계산기 엔진의 <code>swameeJain()</code> 공유</li>
          <li>• <b>물성 참조표</b>: 물(11절점)·공기(6절점, 압력보정 ρ×P/1.01325·ν÷P/1.01325)·증기·유류·글리콜 + 직접입력 — 이 계산기 전용 표(선형보간·범위 밖 clamp)</li>
          <li>• <b>조도표 ε</b>: 재질 8종 × 신관/노후 — {FN_MATERIALS.map(m => m.label).join('·')}</li>
          <li>• <b>압축성 경고</b>: 공기·증기에서 누적ΔP &gt; 0.1×P_abs → ⚠구간분할 필요 (비압축성 가정 한계)</li>
        </ul>
      </InfoBlock>

      <InfoBlock title="참고 — 다른 계산기와의 관계">
        <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
          <li>• <b>Q·V·D 2입력→1산출 환산</b>은 <b>마찰 손실 계산기</b>(유량·유속·관경 삼각 기능)를 사용하세요 — 본 계산기에는 중복이라 넣지 않았습니다.</li>
          <li>• 직관 1구간 정밀 계산(Colebrook-White·Hazen-Williams 병기)은 마찰 손실 계산기, 허용 손실 기반 관경 역산은 관경 선정시스템, 펌프 양정·동력은 TDH 펌프 선정 시스템.</li>
          <li>• 이 계산기의 물성·조도 참조표는 참조 엑셀 전용값입니다 (예: 강관 ε 0.045 — 기존 계산기의 Moody 0.046과 다름).</li>
        </ul>
      </InfoBlock>

      <InfoBlock title="ΣK 산정 참고 — 부속류 K값 (Perry's 8th)">
        <p style={{ fontSize: 12, color: C.text, margin: '0 0 8px' }}>
          구간의 ΣK는 아래 대표 K값을 합산해 직접 입력합니다. (TDH 펌프 선정 시스템과 공용 데이터)
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: C.text, borderBottom: `1px solid ${C.border}` }}>
                <th style={{ padding: '5px 8px 5px 0', fontWeight: 500 }}>부속</th>
                <th style={{ padding: '5px 0', fontWeight: 500, textAlign: 'right' }}>K</th>
              </tr>
            </thead>
            <tbody>
              {FITTING_K_VALUES.map(k => (
                <tr key={k.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '5px 8px 5px 0' }}>{k.nameKo}</td>
                  <td style={{ padding: '5px 0', textAlign: 'right', fontFamily: 'ui-monospace, monospace' }}>{k.K}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InfoBlock>

      <InfoBlock title="제한 사항">
        <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <li>• 사각 덕트는 유속 V를 실단면(a×b) 기준, 마찰은 De 기준으로 계산 — 참조 엑셀 방식 그대로 (물리적으로 근사)</li>
          <li>• 구간 최대 30행 · 부모는 항상 위 행(순환 참조 불가) · 에러 행과 그에 의존하는 상·하류 행은 계산 제외</li>
          <li>• 공기·증기는 비압축성 근사 — 누적ΔP가 절대압의 10%를 넘으면 ⚠구간분할 필요 경고</li>
          <li>• 목표 마찰률 R(덕트 1.0 · 배관 300 Pa/m)은 참고 표시용 — 계산에 사용하지 않음</li>
        </ul>
      </InfoBlock>
    </div>
  );
}
