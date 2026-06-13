// 관경 계산기 — 개요 탭
// 사용 공식 / 참고 자료 / 개선사항 / 기준값 / 제한사항

import InfoBlock from '../../../components/InfoBlock';
import { C } from '../styles';

export default function OverviewTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 14, color: C.textDark, lineHeight: 1.65 }}>
      <p>
        설계 유량과 허용 압력강하를 입력하면 적정 <b>관경(A호칭)</b>을 자동 선정합니다.
        유체(물·공기)를 선택할 수 있으며, 유속이 권장 범위(물 1.5~2.0 · 공기 5~10 m/s) 안에 들어오는지도 함께 확인합니다.
      </p>

      <InfoBlock title="사용 공식">
        <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
          <li>• <b>Darcy-Weisbach + 영역별 마찰계수</b>: ΔP/L = ρ(T) × g × f × (1/D) × V²/(2g)  [Pa/m] → mmAq/m = ΔP/L ÷ 9.80665</li>
          <li style={{ paddingLeft: 14, color: C.text }}>f: 층류(Re&lt;2,300) 64/Re · 천이(≤4,000) 3차 보간 · 난류 Colebrook-White 반복해 — 관마찰손실 계산기와 동일 엔진</li>
          <li>• <b>절대조도 ε</b>: 재질×신관/노후 기본값 (Moody 1944 · ASHRAE Ch.22 · NFPA 13 · KDS 57) — 화면에서 직접 수정 가능</li>
          <li>• <b>물성</b>: 물 ν(참조 엑셀 물성표)·ρ(NIST WebBook) — 입력 온도 기준 선형보간 / 공기 ν·ρ(이상기체식) — 온도·압력 반영</li>
          <li>• <b>유속</b>: v = Q / A (Q: m³/s, A: 원형관 단면적)</li>
          <li>• <b>선정 규칙</b>: 허용 압력강하 이하가 되는 가장 작은 관경을 자동 선정</li>
          <li>• 결과 단위 <b>mmAq/m</b> → 사용자 선택 단위로 자동 환산</li>
        </ul>
        <p style={{ fontSize: 12, color: C.text, marginTop: 8 }}>
          출처: Colebrook-White(1939) · Swamee-Jain(1976, 검산) · EPANET 천이 보간 · Moody(1944)/ASHRAE Ch.22/NFPA 13/KDS 57(ε) · NIST WebBook(ρ)
        </p>
      </InfoBlock>

      <InfoBlock title="개선사항">
        <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <li>
            <b>① 고정 f → 유동 영역별 마찰계수 엔진</b><br />
            <span style={{ color: C.text }}>→ 재질별 고정 f 대신, 관경별 Re와 상대조도 ε/D로 층류 64/Re·천이 보간·난류 Colebrook-White를 자동 적용. 물 온도(ν·ρ)와 신관/노후(ε)까지 반영하며 관마찰손실 계산기와 결과가 일치.</span>
          </li>
          <li>
            <b>② 셀 표시 자릿수에 의한 누적 오차</b><br />
            <span style={{ color: C.text }}>→ 엑셀은 셀별 표시 소수점 자릿수가 다르고, 표시값을 재참조하면 미세 오차 누적. 본 계산기는 모든 중간값을 IEEE 754 double 정밀도로 메모리에 유지하고 표시 단계에서만 단위별 자릿수로 반올림.</span>
          </li>
          <li>
            <b>③ 단일 단위 고정 → 유량·압력 단위 다중 선택</b><br />
            <span style={{ color: C.text }}>→ 엑셀은 LPM·mmAq로 고정. 본 계산기는 유량(m³/h, LPM) · 압력(kPa, bar, mmAq, kg/cm², MPa)을 자유 선택. 내부 계산은 항상 mmAq 기준, 표시만 변환.</span>
          </li>
          <li>
            <b>④ 수동 관경 비교 → 자동 최소 관경 선정 + 전체 비교표</b><br />
            <span style={{ color: C.text }}>→ 엑셀은 호칭별로 행을 직접 보고 사람이 판단. 본 계산기는 허용 압력강하 이하가 되는 최소 관경을 자동 선정하고, 전체 호칭의 V·ΔP/L를 한 표로 비교 제공.</span>
          </li>
          <li>
            <b>⑤ 결과 시각화 부재 → 권장 범위 게이지 · 유동 영역 바 추가</b><br />
            <span style={{ color: C.text }}>→ 엑셀은 숫자만 표시. 본 계산기는 선정 관경의 V·단위손실을 권장 범위 게이지로, Reynolds 영역(층류·천이·난류)을 로그 축 바로 시각화.</span>
          </li>
          <li>
            <b>⑥ 입력값 검증 부재 → 0·음수·범위초과 즉시 차단</b><br />
            <span style={{ color: C.text }}>→ 엑셀은 0 입력 시 #DIV/0! 등 오류만. 본 계산기는 입력 시점에 검증해 한국어 안내 메시지를 빨간 배너로 노출하고 계산 중단.</span>
          </li>
          <li>
            <b>⑦ 결과 내보내기 추가</b><br />
            <span style={{ color: C.text }}>→ CSV(엑셀 호환 BOM) · PDF 인쇄 지원. 선정 관경뿐 아니라 호칭별 비교표도 같이 출력.</span>
          </li>
          <li>
            <b>⑧ 엑셀 미제공 재질 추가 (동관 · PVC / C-PVC)</b><br />
            <span style={{ color: C.text }}>→ 참조 엑셀은 강관 · STS10S · 강관 Sch.40 3종만 제공. 본 계산기는 일반 냉온수 배관에 부적합한 강관 Sch.40을 제외하고, 동관(ASTM B88 Type L 기준) · PVC / C-PVC(ASTM D1785 Schedule 80 기준)을 새로 추가했습니다.</span>
          </li>
        </ul>
      </InfoBlock>

      <InfoBlock title="기준값 (소수점 자릿수)">
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: C.text, borderBottom: `1px solid ${C.border}` }}>
              <th style={{ padding: '6px 0', fontWeight: 500 }}>구분</th>
              <th style={{ padding: '6px 0', fontWeight: 500 }}>항목</th>
              <th style={{ padding: '6px 0', fontWeight: 500 }}>표시 자릿수</th>
            </tr>
          </thead>
          <tbody style={{ fontFamily: 'ui-monospace, monospace' }}>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 0' }} rowSpan={2}>입력</td>
              <td style={{ padding: '6px 0' }}>유량 Q · 허용 압력강하 ΔP/L</td>
              <td style={{ padding: '6px 0' }}>제한 없음 (step="any")</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 0' }}>※ 내부 계산</td>
              <td style={{ padding: '6px 0' }}>IEEE 754 double (약 15~17자리)</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 0' }} rowSpan={5}>출력</td>
              <td style={{ padding: '6px 0' }}>선정 관경 (호칭 A)</td>
              <td style={{ padding: '6px 0' }}>정수 + ID 소수 1자리 mm</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 0' }}>유속 V (m/s)</td>
              <td style={{ padding: '6px 0' }}>소수 2자리</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 0' }}>단위 마찰손실 ΔP/L</td>
              <td style={{ padding: '6px 0' }}>kPa 2 · bar 4 · mmAq 1 · kg/cm² 4 · MPa 5</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 0' }}>호칭별 비교표 ΔP/L</td>
              <td style={{ padding: '6px 0' }}>표시 단위와 동일 자릿수</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 0' }}>레이놀즈수 Re (선정 관경)</td>
              <td style={{ padding: '6px 0' }}>10000+ → 1.k · 1000+ → 1.2k · 그 외 정수</td>
            </tr>
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: C.text, marginTop: 8 }}>
          수치 정확도: 학술 표준 직접 계산값 대비 ±0.5% 이내
        </p>
      </InfoBlock>

      <InfoBlock title="제한 사항">
        <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <li>• 노후·스케일 영향은 배관 상태(신관/노후)의 ε 기본값 또는 ε 직접 수정으로 반영 — 심한 부식·퇴적은 실측 기반 ε 적용 권장</li>
          <li>• 원관 · 수평 직관 기준 (부속류 · 입상·수평 전환 손실 별도 계산 필요)</li>
          <li>• 선정된 관경의 유속이 권장 범위(물 1.5~2.0 · 공기 5~10 m/s)를 벗어나면 한 단계 위·아래 호칭으로 재검토</li>
          <li>• 치수표는 KS D 3507(강관) · KS D 3576(STS10S) · ASTM B88 Type L(동관) · ASTM D1785 Schedule 80(PVC / C-PVC) 기준. 외경 · 두께가 다른 비표준 관은 직접 입력 모드 미제공</li>
        </ul>
      </InfoBlock>
    </div>
  );
}
