# rule_worker.md — 종합 계산기 홈페이지 규칙


**트레이드오프:** 일관성과 검증 가능성을 우선한다. 신규 계산기 1개 추가에 체크리스트가 길게 느껴질 수 있다.

## 1. 기술 스택 (`package.json` 우선)

| 항목 | 값 |
|---|---|
| 언어·프레임워크 | TypeScript / React / Vite |
| 스타일 | 인라인 style + CSS-in-JS. Tailwind는 레이아웃 한정 |
| 아이콘 | lucide-react |

버전 충돌 시 `package.json`이 진실.

## 2. 디렉토리

```
src/
├─ App.tsx                루트 - 검색·그리드·모달
├─ config/calculators.ts  계산기 메타 + 태그 매핑
├─ config/tags.ts         태그 정의
├─ components/            공용 UI (Frac·FIn·FormulaSection·InfoBlock·UnitPanel·Modal·HistoryPanel·NextCalculatorsPanel)
├─ calculators/<id>/      index.tsx (3탭) + calc.ts (순수 함수) + tabs/OverviewTab.tsx
├─ state/historyStore.ts  localStorage 기록 저장소
├─ utils/tagMatcher.ts    태그 매칭
└─ data/                  치수표·물성값
```

## 3. 신규 계산기 추가

**전부 완료. 하나라도 빠지면 카드만 뜨고 모달은 빈다.**

- [ ] `calculators/<id>/calc.ts` — 순수 함수, UI import 금지
- [ ] `calculators/<id>/index.tsx` — 3탭 (계산·개요·예시)
- [ ] `calculators/<id>/tabs/OverviewTab.tsx`
- [ ] `data/<name>.ts` (치수표·물성 필요 시)
- [ ] `config/calculators.ts` — 메타 추가. `inputs`·`outputs`·`tabs`·`nextCalculators`·`inputTags`·`outputTags` 전부 작성 (빈 배열이라도 명시)
- [ ] `config/tags.ts` — 기존 태그 재사용. 새 태그 필요 시 사람 승인
- [ ] `App.tsx`의 `calculatorComponents` 맵에 등록. props (`initialState`·`linkedKeys`·`onContextChange`·`onSave`) 지원
- [ ] `npx tsc -b` 통과
- [ ] 브라우저 모달 실측

템플릿: `src/calculators/pipe-friction/`. 구조가 안 맞으면 다른 구조 자유.

## 4. UI·계산 규약

**카드 본문:** "입력 → ..." / "출력 → ..." 2줄. 한국어 현장 용어, 단위 생략.

**탭 키 고정:** `calculator` · `overview` · `examples`. 추가/제거는 §6 중단 사항.

**파일 크기:** `index.tsx` 500줄 · `calc.ts` 300줄 초과 시 분리 필요 → §6 보고.

**계산식:**
- `calc.ts`에 순수 함수. 원 출처 공식 그대로 이식, 임의 재유도 금지
- 변수명 단위 suffix 권장 (`flow_lpm`·`pressure_mmAq`·`id_mm`)
- 공식마다 출처 주석 1줄
- 0·음수·NaN은 검증 후 에러 표시·계산 중단

**공용 컴포넌트:** props 변경은 §6 중단 사항. 컴포넌트 동작 사양(기록 패널·단위 버튼 등)은 해당 파일 상단 JSDoc 참조.

## 5. 검증 기준

신규 계산기는 셋 다 통과해야 "완성".

1. **수치** — 참조 엑셀과 공식 직접 대입값 양쪽 모두 기준 오차 이내, 3케이스 이상. 두 값이 다르면 공식 우선, 사람 보고
2. **실행** — 브라우저 모달에서 입력·결과 확인
3. **정적** — `npx tsc -b` 0 오류, 콘솔 0 경고

| 계산기 | 출처 | 오차 기준 |
|---|---|---|
| pipe-friction | f: 층류 64/Re·천이 3차보간(EPANET 준용)·난류 Colebrook-White(1939), Swamee-Jain(1976) 검산 병기 · 물성: 참조 엑셀 '마찰손실 계산기' ν표 + NIST WebBook(물 ρ) + 설비공학 문헌 표2(공기 압력의존)/표5(수소·휘발유·에틸알코올·수은·SAE30·글리세린) · ε/C: 조사표(Moody 1944·ASHRAE Ch.22·NFPA 13·KDS 57·GF SYGEF·PPI) · D-W + Hazen-Williams(물 전용) | ν 절점 엑셀 일치 · S-J 재현 ±0.01% · Colebrook 잔차<10⁻¹⁰ · D-W/H-W 직접대입 ±0.5% (`scripts/verify-pipe-friction.ts`) |
| pipe-sizing | pipe-friction과 동일 마찰 엔진(영역별 f·ε 조사표·물 ν표·NIST ρ) — Darcy-Weisbach 기반 관경 탐색, ΔP=ρ(T)gh 환산 | 마찰 ±0.5% (공식 직접 대입, 엔진 검증 공유) |
| pump-hvac | Darcy-Weisbach(영역별 f — pipe-friction 엔진, Re=V·D/ν(T)) + K-method (Perry's 8th) + P=ρgQH/η. 청수·온수: NIST WebBook · ε: 조사표 | 마찰 ±1% 또는 ±0.05 mAq, 동력 ±1% |

신규 출처는 사람 승인 후 이 표에 추가. 기존 출처 변경 금지.

## 6. 작업 사이클과 중단

**계획 → 확인 → 실행 → 검증 → 보고.** 한 줄로 변경 범위를 먼저 요약한다.

**멈추고 확인:**
- 공용 컴포넌트 props 변경
- 새 npm 패키지 추가
- 탭 구조·라벨·키 변경
- 재질 등 범주형 매핑 변경

**절대 금지 (이유 불문):**
- 참조 엑셀 원본 수정
- 계산 공식 임의 재유도·리팩토링
- 백엔드·DB·상태관리 라이브러리·테스트 프레임워크 추가
- `rule_worker.md` 직접 수정 (필요 시 보고만)

그 외 구현 디테일(코드 순서·변수명·주석·내부 스타일)은 자유.

## 7. 네이밍

- 계산기 id: kebab-case. `config/calculators.ts`·폴더명·`calculatorComponents` 키 3곳 동일
- UI 텍스트: 한국어 현장 용어 (관경·유속·LPM·mmAq)
- 단위: SI 원칙. 엑셀 공식 이식 시 lpm·mmAq·kgf/cm² 허용
- 단일 컴포넌트가 여러 분야 카드 공유 시 (`pump-system`): 폴더명·카드ID 분리, 분야 차이는 `configs/<field>.ts`로 격리

## 8. 응답 원칙

- 모르면 파일 읽고 답한다. 추측·환각 금지
- 검증 수치 없으면 "코드 작성 완료, 검증 필요"로 보고
- 불필요한 칭찬·감탄 없음

## 9. 참조 자료

| 자료 | 경로 |
|---|---|
| 원본 엑셀 | `04. 자료실 > 05. 자동화 TOOLS > 배관 관경 계산기 > 냉온수배관관경결정프로그램7.1.xlsx` |
| 다운로드용 사본 | `public/excel/` |
| 디자인 레퍼런스 | `계산기 디자인 reference/` |
| 배포 URL | `LOCAL HOMPAGE LINK.txt` |

---

**이 규칙이 작동 중이라면:** 신규 계산기가 한 번에 통과된다, 검증 수치가 보고에 포함된다, "왜 이렇게 했지?" 싶은 임의 변경이 diff에 없다.
