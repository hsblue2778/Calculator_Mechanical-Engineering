# Calculator_Mechanical-Engineering

기계설비 설계용 종합 계산기 웹앱입니다. React + TypeScript + Vite 기반.

## 포함 계산기

- **펌프 시스템** — HVAC/Process 펌프 양정·동력 산정 (개방계/폐회로)
- **배관 마찰** — 직관 마찰 손실, 부속·장비 손실 합산
- **배관 사이즈** — 유속/마찰손실 기반 관경 선정

펌프 시스템에는 5가지 학습용 프리셋과 HTML 산출서(인쇄 가능) 기능이 포함됩니다.

## 사용 기술

- React 19, TypeScript
- Vite 8 (빌드/개발 서버)
- Tailwind CSS 4
- Recharts (차트)
- ESLint + typescript-eslint

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

## 빌드

```bash
npm run build
npm run preview
```

## 디렉토리 구조

```
src/
├── calculators/
│   ├── pipe-friction/    배관 마찰 계산기
│   ├── pipe-sizing/      배관 사이즈 계산기
│   └── pump-system/      펌프 시스템 계산기 (HTML 산출서 포함)
├── components/           공통 컴포넌트
├── data/                 공학 상수 (관경, 부속 K값, 글리콜 물성 등)
├── state/                Redux 상태 관리
├── styles/               글로벌 스타일
└── utils/                유틸 함수
```

## 라이선스

MIT License (자세한 내용은 [LICENSE](./LICENSE) 참조)

## 면책 조항

본 계산기는 학습·참고용입니다. 실제 설계·시공에는 관련 기준(KS, ASHRAE 등)을 반드시 직접 확인하시고, 자격을 갖춘 엔지니어의 검증을 거치시기 바랍니다.
