// 계산기 목록 및 메타정보 - 새 계산기 추가 시 여기에 1줄 추가

export type CardTabKey = 'calculator' | 'overview' | 'intro' | 'examples' | 'validation';

export interface CardTabSpec {
  key: CardTabKey;
  label: string;
}

// onSave 콜백 시그니처용 컨텍스트 타입
export interface FieldContext {
  inputs: Record<string, any>;
  outputs: Record<string, any> | null;
}

export interface CalculatorMeta {
  id: string;
  title: string;
  inputs: string;
  outputs: string;
  category: string;
  tabs: CardTabSpec[];
  inputTags?: string[];
  outputTags?: string[];
  nextCalculators?: string[];
}

export const calculators: CalculatorMeta[] = [
  {
    id: 'pipe-friction',
    title: '마찰 손실 계산기',
    inputs: '유체·온도, 재질·상태, 유량·유속·관경 중 2개, 길이',
    outputs: '나머지 1개 자동, 레이놀즈수, 마찰계수, D-W·H-W 손실',
    category: '검증 및 계산용',
    tabs: [
      { key: 'calculator', label: '계산' },
      { key: 'overview',   label: '개요' },
      { key: 'examples',   label: '예시' },
    ],
    inputTags: [],
    outputTags: [],
    nextCalculators: [],
  },
  {
    id: 'insulation-thickness',
    title: '냉수배관 보온재 선정',
    inputs: '관경, 외기 조건, 보온재',
    outputs: '한계 두께, 추천 시판 두께, 결로 위험 등급',
    category: '검증 및 계산용',
    tabs: [
      { key: 'calculator', label: '계산' },
      { key: 'overview',   label: '개요' },
      { key: 'examples',   label: '예시' },
    ],
  },
  {
    id: 'pump-hvac',
    title: '마찰손실(양정) 기반 펌프 선정 시스템',
    inputs: '시스템 조건, 배관, 부속, 장비',
    outputs: '총양정, NPSHa, 동력',
    category: '설계용',
    tabs: [
      { key: 'calculator', label: '계산' },
      { key: 'overview',   label: '개요' },
      { key: 'examples',   label: '내 프로젝트' },
    ],
    inputTags: [],
    outputTags: [],
    nextCalculators: [],
  },
  {
    id: 'pipe-sizing',
    title: '마찰손실(압력강하) 기반 배관 설계 시스템',
    inputs: '유량, 허용 압력강하, 배관 재질',
    outputs: '적정 관경, 유속, 실제 마찰손실',
    category: '설계용',
    tabs: [
      { key: 'calculator', label: '계산' },
      { key: 'overview',   label: '개요' },
      { key: 'examples',   label: '예시' },
    ],
  },
];
