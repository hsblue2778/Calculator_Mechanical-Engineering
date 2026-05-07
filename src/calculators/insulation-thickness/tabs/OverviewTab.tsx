// 냉수배관 보온 두께 계산기 — 개요 탭

import InfoBlock from '../../../components/InfoBlock';
import { C } from '../styles';

export default function OverviewTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 14, color: C.textDark, lineHeight: 1.65 }}>
      <p>
        냉수가 흐르는 배관 외부에 보온재를 둘렀을 때, <b>외기 중 수증기가 보온재 외표면에 응결(결로)</b>하지 않도록 하는
        <b> 최소 보온재 두께</b>를 산정하고 결과의 안전 여유를 검산합니다.
      </p>

      <InfoBlock title="핵심 원리">
        <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <li>• <b>노점 Tᴅ</b>: 외기가 머금은 수증기가 응결하기 시작하는 온도. 외기 온도와 상대습도로 결정됩니다.</li>
          <li>• <b>표면 온도 Tˢ</b>: 보온재 외표면 온도. 두께가 두꺼울수록 외기 쪽으로 가까워집니다.</li>
          <li>• <b>결로 방지 조건</b>: Tˢ {'>'} Tᴅ 가 항상 성립하도록 두께를 정합니다.</li>
        </ul>
        <p style={{ fontSize: 12, color: C.text, marginTop: 8 }}>
          정상상태 부등호 관계: <code>Tᵢ {'<'} Tᴅ {'<'} Tˢ {'<'} Tₐ</code>
        </p>
      </InfoBlock>

      <InfoBlock title="사용 공식">
        <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <li>
            <b>① 노점 (Magnus 식)</b><br />
            <code style={{ fontSize: 12 }}>γ = (a·Tₐ)/(b+Tₐ) + ln(RH/100)</code><br />
            <code style={{ fontSize: 12 }}>Tᴅ = (b·γ)/(a−γ)</code>
            <span style={{ color: C.text, fontSize: 12 }}> · a = 17.625, b = 243.04</span>
          </li>
          <li>
            <b>② 한계 두께 (정상상태 직렬 열저항)</b><br />
            <code style={{ fontSize: 12 }}>P = 2k/(hₒ·D), Q = (Tₐ−Tᵢ)/(Tₐ−Tᴅ)</code><br />
            <code style={{ fontSize: 12 }}>d = (D/2)·(eᴾ·ᵠ − 1)</code>
          </li>
          <li>
            <b>③ 시공 후 검산</b><br />
            <code style={{ fontSize: 12 }}>R_ins = ln(D_outer/D)/(2π·k)</code><br />
            <code style={{ fontSize: 12 }}>R_conv = 1/(hₒ·π·D_outer)</code><br />
            <code style={{ fontSize: 12 }}>Tˢ = Tₐ − (Tₐ−Tᵢ)·R_conv/(R_ins+R_conv)</code>
          </li>
        </ul>
      </InfoBlock>

      <InfoBlock title="결로 위험 등급">
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: C.text, borderBottom: `1px solid ${C.border}` }}>
              <th style={{ padding: '6px 0', fontWeight: 500 }}>여유 폭 (Tˢ − Tᴅ)</th>
              <th style={{ padding: '6px 0', fontWeight: 500 }}>등급</th>
            </tr>
          </thead>
          <tbody style={{ fontFamily: 'ui-monospace, monospace' }}>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 0' }}>≥ 3 °C</td>
              <td style={{ padding: '6px 0', color: 'var(--state-success-text)', fontWeight: 600 }}>안전</td>
            </tr>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 0' }}>1 ~ 3 °C</td>
              <td style={{ padding: '6px 0', color: 'var(--state-warn-text)', fontWeight: 600 }}>주의</td>
            </tr>
            <tr>
              <td style={{ padding: '6px 0' }}>{'<'} 1 °C</td>
              <td style={{ padding: '6px 0', color: 'var(--state-error-text)', fontWeight: 600 }}>위험</td>
            </tr>
          </tbody>
        </table>
      </InfoBlock>

      <InfoBlock title="제한 사항">
        <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <li>• 자연대류만 고려 (복사 열전달 미포함)</li>
          <li>• 단층 보온재 기준 (다층 시공 별도 계산)</li>
          <li>• 실내 환경 가정 (야외 설치는 풍속·일사량 영향으로 hₒ 보정 필요)</li>
          <li>• 글라스울은 시간 경과 시 흡습으로 k 증가 — 냉수배관 비권장</li>
          <li>• 시판 두께 라인업: 13 · 19 · 25 · 32 · 38 · 50 mm (단층 시공)</li>
        </ul>
      </InfoBlock>
    </div>
  );
}
