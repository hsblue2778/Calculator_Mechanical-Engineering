// HVAC 펌프 시스템 — 개요 탭
// 사용 공식·참고 자료·기준값·제한사항 (폐회로 NPSHa 식 추가)

interface Props {
  fieldLabel: string;
}

export default function OverviewTab({ fieldLabel }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontSize: 14, color: 'var(--text-secondary)' }}>

      {/* 사용 공식 */}
      <section style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
          사용 공식
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>① 배관 마찰손실 (Darcy-Weisbach)</p>
            <pre style={{ fontFamily: 'monospace', fontSize: 13, backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)', padding: '8px 12px', borderRadius: 6, whiteSpace: 'pre-wrap', margin: 0 }}>
{`hf = f · (L/D) · V² / (2g)   [m]

  f : 마찰계수 — 유동 영역별 자동 산출
      층류(Re<2,300) 64/Re · 천이(≤4,000) 3차 보간 · 난류 Colebrook-White 반복해
  ε : 절대조도 — 재질×신관/노후 (Moody·ASHRAE Ch.22·NFPA 13·KDS 57)
  Re: V·D/ν — 실제 유체 ν(T) 적용
  L : 배관 길이 [m]   (다중 구간 시 구간별 적용)
  D : 관 내경 [m]
  g : 9.81 m/s²`}
            </pre>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              출처: 일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p
            </p>
          </div>

          <div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>② 부속류 손실 (K-Method)</p>
            <pre style={{ fontFamily: 'monospace', fontSize: 13, backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)', padding: '8px 12px', borderRadius: 6, whiteSpace: 'pre-wrap', margin: 0 }}>
{`h_K = K · V²  /  (2 · g)   [m]

  K : 국소저항계수 (Perry's 8th Ed 단일 K, 난류 기준)
  V : 부착된 배관(배관 참조)의 평균 유속 [m/s]
      — 다중 배관 시 배관 참조로 지정한 구간의 유속 사용`}
            </pre>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              출처: Perry's Chemical Engineers' Handbook 8th Ed (2008)<br />
              https://myengineeringtools.com/Piping/Pressure_Drop_Key_Piping_Elements_K_Coefficient.html
            </p>
          </div>

          <div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>③ 총양정 (TDH)</p>
            <pre style={{ fontFamily: 'monospace', fontSize: 13, backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)', padding: '8px 12px', borderRadius: 6, whiteSpace: 'pre-wrap', margin: 0 }}>
{`[개방계]
TDH = (Hd - Hs) + Σhf_suc + Σhf_dis + Σh_fit + Σh_equip + H_res   [m]

[폐회로]
TDH = Σhf_suc + Σhf_dis + Σh_fit + Σh_equip + H_res   [m]
  — 정수두 차 항 (Hd - Hs) 제외 (순환계: 폐루프)

  Σhf_suc : 흡입측 배관 마찰손실 합산 [m]
  Σhf_dis : 토출측 배관 마찰손실 합산 [m]
  H_res = P_res / (ρ·g)   잔류 토출 압력 수두 [m]`}
            </pre>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              출처: ASHRAE Handbook — HVAC Systems and Equipment (Pump Selection)
            </p>
          </div>

          <div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>④ NPSHa (유효 흡입수두)</p>
            <pre style={{ fontFamily: 'monospace', fontSize: 13, backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)', padding: '8px 12px', borderRadius: 6, whiteSpace: 'pre-wrap', margin: 0 }}>
{`[개방계]
NPSHa = (P_atm - P_vapor) / (ρ·g) + Hs - Σhf_suc - Σh_fit_suc   [m]

[폐회로]
NPSHa = (P_fill - P_vapor) / (ρ·g) + Hs - Σhf_suc - Σh_fit_suc   [m]
  — P_fill: 시스템 충진 절대압력 (Pa)
  — Hs: 펌프 위치 수두 차 (팽창탱크 대비)
  — 식 형태는 동일, P_atm 자리에 P_fill 대입

  P_vapor : 운전온도의 포화 수증기압 [Pa]  (Antoine 식)
  Σhf_suc : 흡입측 직관 마찰손실 합산 [m]
  Σh_fit_suc: 흡입측 부속 손실 합계 [m]`}
            </pre>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              개방계 출처: Hydraulic Institute Standards HI 9.6.1<br />
              폐회로 출처: ASHRAE Handbook — Closed-Loop Hydronic System 항목 / Hydraulic Institute HI 9.6.1<br />
              포화 수증기압: Engineering Toolbox (Antoine 식, 0~100°C)
            </p>
          </div>

          <div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>⑤ 펌프 동력</p>
            <pre style={{ fontFamily: 'monospace', fontSize: 13, backgroundColor: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)', padding: '8px 12px', borderRadius: 6, whiteSpace: 'pre-wrap', margin: 0 }}>
{`이론 동력  P = ρ · g · Q · TDH / η   [W]
설계 동력  P_d = P × 동력여유배율

  η : 펌프 효율 (Phase 1.0 고정값 0.65)`}
            </pre>
          </div>
        </div>
      </section>

      {/* 기준값 (소수점) */}
      <section style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
          안전율 기준값 ({fieldLabel})
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface-2)' }}>
              <th style={{ border: '1px solid var(--border-subtle)', padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>항목</th>
              <th style={{ border: '1px solid var(--border-subtle)', padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>값</th>
              <th style={{ border: '1px solid var(--border-subtle)', padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>비고</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['양정 여유', '10%', '설계 양정 = TDH × 1.10'],
              ['동력 여유', '1.15배', '설계 동력 = 이론 동력 × 1.15'],
              ['NPSH 여유', '+1 m', 'NPSHa ≥ NPSHr + 1m 확보 권장'],
              ['펌프 효율 η', '0.65 (고정)', 'Phase 1.0 — 단일 고정값 사용'],
            ].map(([item, val, note]) => (
              <tr key={item}>
                <td style={{ border: '1px solid var(--border-subtle)', padding: '8px 12px' }}>{item}</td>
                <td style={{ border: '1px solid var(--border-subtle)', padding: '8px 12px' }}>{val}</td>
                <td style={{ border: '1px solid var(--border-subtle)', padding: '8px 12px' }}>{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
          출처: SAREK 설비편람 / 건축기계설비공사 표준시방서 (HVAC 냉온수 계통)
        </p>
      </section>

      {/* 유체 물성 */}
      <section style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
          유체 물성 (청수 기준값)
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-surface-2)' }}>
              <th style={{ border: '1px solid var(--border-subtle)', padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>온도 (°C)</th>
              <th style={{ border: '1px solid var(--border-subtle)', padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>밀도 (kg/m³)</th>
              <th style={{ border: '1px solid var(--border-subtle)', padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>점도 (mPa·s)</th>
            </tr>
          </thead>
          <tbody>
            {[
              [4, 1000.0, '—'],
              [7, 999.9, 1.414],
              [20, 998.2, 1.002],
              [40, 992.2, 0.653],
              [60, 983.2, 0.467],
              [80, 971.8, 0.354],
            ].map(([t, rho, mu]) => (
              <tr key={String(t)}>
                <td style={{ border: '1px solid var(--border-subtle)', padding: '8px 12px' }}>{t}</td>
                <td style={{ border: '1px solid var(--border-subtle)', padding: '8px 12px' }}>{rho}</td>
                <td style={{ border: '1px solid var(--border-subtle)', padding: '8px 12px' }}>{mu}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
          출처: NIST Chemistry WebBook — Water (CAS 7732-18-5), 1 atm 기준<br />
          https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Mask=2
        </p>
        <p style={{ fontSize: 12, color: 'var(--state-warn)', marginTop: 6 }}>
          Phase 1.0 청수/온수 한정 — EG/PG 브라인은 Phase 1.5에서 추가 예정
        </p>
      </section>

      {/* 제한사항 */}
      <section style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
          제한사항
        </h3>
        <ul style={{ paddingLeft: 18, margin: 0, lineHeight: 1.8, fontSize: 13 }}>
          <li>운전 유체는 <strong>청수·온수만</strong> 계산 가능 (EG/PG: Phase 1.5)</li>
          <li>마찰계수 f는 유동 영역별 자동 산출 (Colebrook-White 기준) — 절대조도 ε는 재질×신관/노후 기본값 사용 (개별 수정은 관마찰손실 계산기에서 가능)</li>
          <li>펌프 효율 η = 0.65 고정 (실제 펌프 곡선 미적용)</li>
          <li>부속류 K값은 난류(Re &gt; 4,000) 기준 단일 상수 — 층류 구간 사용 금지</li>
          <li>NPSHr(필요 흡입수두)은 펌프 선정 단계에서 제조사 자료와 별도 비교 필요</li>
          <li>단일 펌프 직렬 계통 전제 — 병렬 운전·복잡한 분기 계통은 별도 계산 필요</li>
          <li><strong>시스템 모드는 입력 시점 사용자 책임</strong> — 개방계/폐회로 자동 판별 없음</li>
          <li><strong>다중 배관 시 각 구간은 균일 단면 가정</strong> — 테이퍼 구간은 평균치 입력 권장</li>
          <li><strong>부속류 K값은 부착된 배관(배관 참조)의 유속 사용</strong> — 배관 참조 선택에 주의</li>
          <li>폐회로 NPSHa의 P_fill은 절대압력 (게이지 압력 + 대기압 변환 필요)</li>
        </ul>
      </section>

      {/* 적용 표준 */}
      <section style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
          적용 표준 ({fieldLabel})
        </h3>
        <ul style={{ paddingLeft: 18, margin: 0, lineHeight: 1.8, fontSize: 13 }}>
          <li>ASHRAE Handbook — HVAC Systems and Equipment (Pumps Chapter)</li>
          <li>ASHRAE Handbook — Closed-Loop Hydronic Systems (폐회로 NPSHa)</li>
          <li>SAREK 설비편람 (한국설비기술협회)</li>
          <li>건축기계설비공사 표준시방서 (국토교통부)</li>
          <li>Hydraulic Institute Standards HI 9.6.1 (NPSH)</li>
        </ul>
      </section>

    </div>
  );
}
