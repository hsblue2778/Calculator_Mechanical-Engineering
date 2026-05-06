// 관마찰손실 — 개요 탭
// 사용 공식 / 참고 자료 / 개선사항 / 기준값 / 제한사항

import { Download } from 'lucide-react';
import InfoBlock from '../../../components/InfoBlock';
import { C } from '../styles';

export default function OverviewTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
      <p>
        배관 내 유체가 흐를 때 발생하는 마찰에 의한 <b>압력손실</b>을 계산합니다.
        공조·급수·급탕 배관 설계 시 펌프 양정 산출의 기초가 됩니다.
      </p>

      <InfoBlock title="사용 공식">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
          <div>
            <div style={{ fontWeight: 600, color: C.heading, marginBottom: 4 }}>
              유량 입력형 (Q 기반)
            </div>
            <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>• <b>Darcy-Weisbach 응용</b>: hf = 8 × f × L × Q² / (π² × g × D⁵)</li>
              <li>• <b>hf</b>(수두, m) → ΔP = ρ × g × hf</li>
              <li>• <b>유체 밀도</b>: 998.2 kg/m³ (상온 기준)</li>
              <li>• <b>g</b> = 9.81 m/s² (고정)</li>
            </ul>
          </div>
          <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: 10 }}>
            <div style={{ fontWeight: 600, color: C.heading, marginBottom: 4 }}>
              유속 입력형 (v 기반)
            </div>
            <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>• <b>Darcy-Weisbach</b>: hf = f × (L / D) × v² / (2g)</li>
              <li>• Q형(hf = 8fLQ² / π²gD⁵)과 수학적으로 동일 (Q = v·A 대입 시 일치)</li>
              <li>• <b>출처</b>: 동일 (일본 건축기술자협회 매뉴얼 213p)</li>
            </ul>
          </div>
        </div>
      </InfoBlock>

      <InfoBlock title="참고 자료">
        <p style={{ fontSize: 13, marginBottom: 10 }}>
          참고 엑셀 파일 — 클릭하면 다운로드됩니다.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ExcelLink
            href="/excel/DUCT_MEASURE_1204.xlsx"
            label="DUCT_MEASURE_1204(직관&곡관 마찰손실).xlsx"
            note='시트 "배관관경결정" — 일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p 명시'
          />
          <ExcelLink
            href="/excel/pipe_sizing_program_7.1.xlsx"
            label="냉온수배관관경결정프로그램7.1.xlsx"
            note="관경 선정 시 보조 참고용"
          />
        </div>
      </InfoBlock>

      <InfoBlock title="개선사항">
        <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <li>
            <b>① 셀 표시 자릿수에 의한 누적 오차</b><br />
            <span style={{ color: C.text }}>→ 엑셀은 셀별 표시 소수점 자릿수가 다르고, 중간 결과를 표시값으로 재참조하면 미세 오차가 누적. 본 계산기는 모든 중간값을 IEEE 754 double 정밀도로 메모리에 유지하고, 표시 단계에서만 단위별 자릿수로 반올림.</span>
          </li>
          <li>
            <b>② 단일 단위 고정 → 유량·압력 단위 다중 선택</b><br />
            <span style={{ color: C.text }}>→ 엑셀은 LPM·mmAq로 고정. 본 계산기는 유량(m³/h, LPM) · 압력(kPa, bar, mmAq, kg/cm², MPa)을 자유 선택. 내부 계산은 항상 SI(m³/s, Pa), 표시만 단위 변환.</span>
          </li>
          <li>
            <b>③ 결과 시각화 부재 → 권장 범위 게이지·유동 영역 바 추가</b><br />
            <span style={{ color: C.text }}>→ 엑셀은 숫자 표만 제공. 본 계산기는 유속·단위손실의 권장 범위를 가로 게이지로, Reynolds 영역(층류·천이·난류)을 로그 축 바로 시각화.</span>
          </li>
          <li>
            <b>④ 입력값 검증 부재 → 0·음수·비현실값 즉시 차단</b><br />
            <span style={{ color: C.text }}>→ 엑셀은 0이나 음수 입력 시 #DIV/0!·#NUM! 오류만 표시. 본 계산기는 입력 시점에 검증해 한국어 안내 메시지를 빨간 배너로 노출하고 계산을 중단.</span>
          </li>
          <li>
            <b>⑤ 결과 내보내기 추가</b><br />
            <span style={{ color: C.text }}>→ 엑셀 외부에서는 결과를 옮기기 어려움. CSV(엑셀 호환 BOM) 다운로드와 PDF 인쇄(브라우저 인쇄 다이얼로그) 지원.</span>
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
              <td style={{ padding: '6px 0' }} rowSpan={3}>입력</td>
              <td style={{ padding: '6px 0' }}>유량 Q · 관 내경 D · 배관 길이 L</td>
              <td style={{ padding: '6px 0' }}>제한 없음 (step="any")</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 0' }}>마찰계수 f</td>
              <td style={{ padding: '6px 0' }}>제한 없음 (재질 기본 0.020 ~ 0.030)</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 0' }}>※ 내부 계산</td>
              <td style={{ padding: '6px 0' }}>IEEE 754 double (약 15~17자리)</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 0' }} rowSpan={6}>출력</td>
              <td style={{ padding: '6px 0' }}>유속 V (m/s)</td>
              <td style={{ padding: '6px 0' }}>소수 2자리</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 0' }}>수두 hf (m)</td>
              <td style={{ padding: '6px 0' }}>소수 3자리</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 0' }}>적용 마찰계수 f</td>
              <td style={{ padding: '6px 0' }}>소수 4자리</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 0' }}>총 마찰손실 ΔP</td>
              <td style={{ padding: '6px 0' }}>kPa 2 · bar 4 · mmAq 1 · kg/cm² 4 · MPa 5</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 0' }}>단위 마찰손실 ΔP/L</td>
              <td style={{ padding: '6px 0' }}>kPa 3 · bar 5 · mmAq 2 · kg/cm² 5 · MPa 6</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 0' }}>레이놀즈수 Re</td>
              <td style={{ padding: '6px 0' }}>10000+ → 1.k · 1000+ → 1.2k · 그 외 정수</td>
            </tr>
          </tbody>
        </table>
      </InfoBlock>

      <InfoBlock title="제한 사항">
        <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <li>• <b>마찰계수 f의 한계</b> — 레이놀즈 수를 알지 못하면 정확한 마찰계수 파악 불가. Colebrook-White로 동적 계산하지 않고 재질별 대표 f값을 지정하여 수식에 대입함 (수동 오버라이드 가능).</li>
          <li>• 원관(圓管) · 수평 배관 · 직관 기준</li>
          <li>• 부속류(엘보 · 티 · 밸브 등) 손실은 별도 계산 필요</li>
          <li>• 층류(Re &lt; 2300) 영역에서는 f = 64/Re 적용이 더 정확하나 본 계산기는 적용하지 않음</li>
        </ul>
      </InfoBlock>
    </div>
  );
}

function ExcelLink({ href, label, note }: { href: string; label: string; note: string }) {
  return (
    <a
      href={href}
      download
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 12px',
        backgroundColor: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 6, textDecoration: 'none', color: 'inherit',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = C.blue;
        e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.backgroundColor = C.surface;
      }}
    >
      <Download size={16} color={C.blue} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.heading, wordBreak: 'break-all' }}>{label}</div>
        <div style={{ fontSize: 11, color: C.text, marginTop: 2, lineHeight: 1.5 }}>{note}</div>
      </div>
    </a>
  );
}
