export type ChangelogStatus = 'done' | 'in-progress' | 'planned';

export interface ChangelogEntry {
  date: string;       // 'YYYY-MM-DD'
  status: ChangelogStatus;
  title: string;
}

export const changelog: ChangelogEntry[] = [
  { date: '2026-04-26', status: 'done',     title: '관마찰손실계산기 추가' },
  { date: '2026-04-26', status: 'done',     title: '관경 계산기 추가' },
  { date: '2026-04-29', status: 'in-progress', title: '펌프 시스템 제작 중' },
  { date: '2026-04-26', status: 'planned',  title: '체이닝 기능 추가 필요' },
  { date: '2026-04-29', status: 'planned',  title: '응축수량 계산기 추가 예정' },
  { date: '2026-04-29', status: 'planned',  title: '보온재 선정 계산기 추가 예정' },
  { date: '2026-04-29', status: 'planned',  title: '하수도 급수량에 따른 메인관경 계산기 추가 예정' },
  { date: '2026-05-07', status: 'planned',  title: '미국식 단위계 활성화 시 단위 토글 동작 점검 (현재 한국식만 적용)' },
  { date: '2026-07-06', status: 'done',     title: '마찰손실 계통 계산기 추가 (분기 트리 · 사각 덕트 · 가용정압 판정)' },
  { date: '2026-07-06', status: 'done',     title: '마찰손실 계통 계산기 — 관경 자동 설계(유속·마찰률 이원 기준 + KS/덕트 규격 스냅) · 설계 총유량 대조 추가' },
  { date: '2026-07-21', status: 'done',     title: '전역 사이드바 추가 — 새로 생성 · 프로젝트 · 고정됨 · 최근 항목(전 계산기 통합), 입력 자동기록(세션 단위) 지원' },
  { date: '2026-07-21', status: 'done',     title: '기록 보관 정책 변경 — 최근 50개 유지(초과 시 오래된 것부터 정리), 고정·프로젝트 소속 기록은 무제한 보존' },
  { date: '2026-07-21', status: 'done',     title: "'기록 저장'·'새로 생성' 버튼 제거 — 자동기록·홈 카드가 역할을 대체" },
];
