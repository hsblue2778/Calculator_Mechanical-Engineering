// 계산기 목록 및 메타정보 - 새 계산기 추가 시 여기에 1줄 추가

// onStateChange(자동기록) 콜백 시그니처용 컨텍스트 타입
export interface FieldContext {
  inputs: Record<string, any>;
  outputs: Record<string, any> | null;
}

export interface CalculatorMeta {
  id: string;
  title: string;
  description: string;
  inputs: string;
  outputs: string;
  category: string;
  inputTags?: string[];
  outputTags?: string[];
  nextCalculators?: string[];
}

export const calculators: CalculatorMeta[] = [
  {
    id: 'pipe-friction',
    title: '마찰손실 계산기',
    description: '직관 한 구간의 마찰손실을 정밀 계산',
    inputs: '유체·온도, 재질·상태, 유량·유속·관경 중 2개, 길이',
    outputs: '나머지 1개 자동, 레이놀즈수, 마찰계수, D-W·H-W 손실',
    category: '검증 및 계산용',
    inputTags: [],
    outputTags: [],
    nextCalculators: [],
  },
  {
    id: 'insulation-thickness',
    title: '보온재 선정 계산기',
    description: '결로 없는 최소 두께의 냉수배관 보온재 설계',
    inputs: '관경, 외기 조건, 보온재',
    outputs: '한계 두께, 추천 시판 두께, 결로 위험 등급',
    category: '검증 및 계산용',
  },
  {
    id: 'pump-hvac',
    title: '펌프 선정 시스템 (TDH)',
    description: '시스템 전체 손실을 합산해 펌프 양정·동력 산정',
    inputs: '시스템 조건, 배관, 부속, 장비',
    outputs: '총양정, NPSHa, 동력',
    category: '설계용',
    inputTags: [],
    outputTags: [],
    nextCalculators: [],
  },
  {
    id: 'friction-network',
    title: '계통 압력손실 설계 시스템',
    description: '분기 계통 전체의 마찰손실을 합산해 가용정압과 비교',
    inputs: '계통 종류, 유체·온도, 가용정압, 구간 트리(관경·덕트·길이·ΣK)',
    outputs: '구간별 유속·손실, 최불리 경로 누적손실, 정압 여유/부족',
    category: '설계용',
    inputTags: [],
    outputTags: [],
    nextCalculators: [],
  },
  {
    id: 'pipe-sizing',
    title: '관경 계산기',
    description: '허용 마찰손실에 맞는 표준 관경을 역산',
    inputs: '유량, 허용 압력강하, 배관 재질',
    outputs: '적정 관경, 유속, 실제 마찰손실',
    category: '검증 및 계산용',
  },
];
