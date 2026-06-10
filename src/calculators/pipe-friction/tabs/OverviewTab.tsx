// 관마찰손실 — 개요 탭
// 사용 공식 / 물성·데이터 출처 / 참고 자료 / 엑셀 대비 개선사항 / 제한사항

import { Download } from 'lucide-react';
import InfoBlock from '../../../components/InfoBlock';
import { PF_MATERIALS } from '../../../data/pipeRoughness.ts';
import { C } from '../styles';

export default function OverviewTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
      <p>
        배관 내 유체가 흐를 때 발생하는 마찰에 의한 <b>압력손실</b>을 계산합니다.
        유체 물성(온도·압력) → 레이놀즈수 → 유동 영역별 마찰계수 → Darcy-Weisbach / Hazen-Williams의
        전체 과정을 자동으로 수행하며, 공조·급수·급탕 배관 설계 시 펌프 양정 산출의 기초가 됩니다.
      </p>

      <InfoBlock title="사용 공식">
        <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <li>• <b>흐름 조건 (2-of-3)</b>: Q = (πD²/4)·V — 유량·유속·관경 중 2개 입력 시 나머지 자동 산출</li>
          <li>• <b>레이놀즈수</b>: Re = V·D/ν — ν는 유체·온도(·압력)별 물성표 선형보간으로 자동 산출</li>
          <li>• <b>마찰계수 f (유동 영역별)</b>:
            <ul style={{ paddingLeft: 16, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
              <li>– 층류 (Re &lt; 2,300): f = 64/Re</li>
              <li>– 천이 (2,300 ≤ Re ≤ 4,000): 층류 끝값(64/2300)과 난류 시작값(Colebrook(4000)) 사이 3차 보간 — 불확정 구간 경고 표시</li>
              <li>– 난류 (Re &gt; 4,000): <b>Colebrook-White</b> 1/√f = −2log₁₀(ε/(3.7D) + 2.51/(Re√f)) — Newton 반복해 (수렴 잔차 &lt; 10⁻¹⁰)</li>
              <li>– 검산 병기: Swamee-Jain f = 0.25/[log₁₀(ε/(3.7D)+5.74/Re⁰·⁹)]² (유효범위 5×10³ ≤ Re ≤ 10⁸)</li>
            </ul>
          </li>
          <li>• <b>Darcy-Weisbach</b>: hL = f·(L/D)·V²/(2g) — 기준 공식</li>
          <li>• <b>Hazen-Williams</b> (물 전용 비교): hL = 10.67·L·Q¹·⁸⁵²/(C¹·⁸⁵²·D⁴·⁸⁷¹)</li>
          <li>• <b>압력 환산</b>: ΔP = ρ유체(T)·g·hL — 유체 밀도를 반영한 물리적 환산</li>
        </ul>
      </InfoBlock>

      <InfoBlock title="물성·데이터 출처">
        <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <li>• <b>물 ν (0~100°C)</b>: 참조 엑셀 '마찰손실 계산기' 물성표 (1atm 포화액) · <b>물 ρ</b>: NIST WebBook</li>
          <li>• <b>공기 ν·ρ (-10~100°C, 400~1,000 mmHg)</b>: 엑셀 물성표(1atm) + 설비공학 문헌 표 2 — ν ∝ 1/P, ρ = 1.293×273.15/(273.15+T)×(P/760) (이상기체)</li>
          <li>• <b>수소·휘발유·에틸알코올·수은·SAE30 오일·글리세린</b>: 설비공학 문헌 표 5 (상온·1atm 단일값)</li>
          <li>• <b>절대조도 ε·H-W C값</b>: Moody(1944) · ASHRAE Fundamentals Ch.22 · NFPA 13 · KDS 57(상수도설계기준) · GF SYGEF Handbook · PPI(1971) — 아래 표</li>
        </ul>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginTop: 10 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: C.text, borderBottom: `1px solid ${C.border}` }}>
              <th style={{ padding: '6px 0', fontWeight: 500 }}>재질</th>
              <th style={{ padding: '6px 0', fontWeight: 500, textAlign: 'right' }}>ε 신관/노후 (mm)</th>
              <th style={{ padding: '6px 0', fontWeight: 500, textAlign: 'right' }}>C 신관/노후</th>
            </tr>
          </thead>
          <tbody style={{ fontFamily: 'ui-monospace, monospace' }}>
            {PF_MATERIALS.map(m => (
              <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '6px 0', fontFamily: 'inherit' }}>{m.nameKo}</td>
                <td style={{ padding: '6px 0', textAlign: 'right' }}>{m.eps_mm.new} / {m.eps_mm.old}</td>
                <td style={{ padding: '6px 0', textAlign: 'right' }}>{m.hazenC.new} / {m.hazenC.old}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 8, lineHeight: 1.6 }}>
          내식 재질(STS·PVC·동·PVDF)은 노후=신관이 표준 관행 (KDS 57·PPI). 동관 노후 C=135는 수질 조건 보수값.
          기본값은 화면에서 직접 수정 가능하며 수정값이 즉시 계산에 반영됩니다 (보수 설계·소방 C값 등).
        </p>
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

      <InfoBlock title="참조 엑셀 대비 개선사항">
        <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <li>
            <b>① 고정 근사식 → 유동 영역별 마찰계수 엔진</b><br />
            <span style={{ color: C.text }}>→ 엑셀은 Swamee-Jain(±1% 근사, 난류 전용) 단일식. 본 계산기는 층류 64/Re · 천이 보간 · 난류 Colebrook-White 반복해(근사 오차 없음)를 자동 적용하고 S-J를 검산으로 병기.</span>
          </li>
          <li>
            <b>② 가정 모드 3종 → 삼각 자동 입력</b><br />
            <span style={{ color: C.text }}>→ 엑셀은 유량·유속 / 유량·관경 / 관경·유속 모드를 따로 운용. 본 계산기는 세 칸 중 2개를 입력하면 나머지가 자동 산출되고, 자동 칸을 수정하면 입력으로 승격.</span>
          </li>
          <li>
            <b>③ 10°C 반올림 물성 → 선형보간 + 압력 차원 + 유체 8종</b><br />
            <span style={{ color: C.text }}>→ 엑셀은 온도를 10°C 단위로 반올림해 lookup. 본 계산기는 절점 사이를 선형보간(절점값은 엑셀과 동일)하고, 공기는 압력(mmHg)까지 반영하며 유체 6종(수소·휘발유 등)을 추가.</span>
          </li>
          <li>
            <b>④ 유체 밀도 기반 압력 환산</b><br />
            <span style={{ color: C.text }}>→ 엑셀은 공기에서도 수두(m)×1000을 mmAq로 표기(물 기준 단위라 물리적으로 부정확). 본 계산기는 ΔP = ρ유체(T)·g·hL로 환산해 표시 — 물 20°C 기준 엑셀 수두 표기와 약 0.2% 차이.</span>
          </li>
          <li>
            <b>⑤ Hazen-Williams 적용 범위 제어</b><br />
            <span style={{ color: C.text }}>→ H-W는 상온 물 전용 경험식이므로 물 이외 유체에서는 자동으로 숨기고 사유를 안내.</span>
          </li>
          <li>
            <b>⑥ 입력 검증·경고·다단위 동시 표시·산출서</b><br />
            <span style={{ color: C.text }}>→ 0·음수·범위 밖 입력 즉시 차단, 천이역·고조도·수렴 실패 경고, mmAq·kPa·kg/cm²·bar·Pa 동시 표시, CSV/HTML/PDF 산출서와 기록 저장.</span>
          </li>
        </ul>
      </InfoBlock>

      <InfoBlock title="제한 사항">
        <ul style={{ paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
          <li>• 원관(圓管) · 만관(滿管) · 직관 기준 — 부속류(엘보·티·밸브) 손실은 별도 계산 필요</li>
          <li>• 천이 영역(Re 2,300~4,000)은 물리적으로 확정 공식이 없는 불확정 구간 — 보간값이며 신뢰도 낮음</li>
          <li>• 공기는 비압축성 가정 (저속 덕트·배관 수준에서 유효) · 고정값 유체 6종은 상온·1atm 단일 물성</li>
          <li>• Hazen-Williams는 상온(약 7~24°C) 물·난류 조건 경험식 — 범위 밖 적용 시 최대 50% 오차</li>
          <li>• 제조사 카탈로그의 Ra(표면 거칠기)는 ε(절대조도)와 다른 물리량 — ε에 직접 대입 금지</li>
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
