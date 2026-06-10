// 재질×상태별 절대조도 ε(mm)·Hazen-Williams 조도계수 C — 관마찰손실(pipe-friction) 전용 기본값
//
// 사용자 확정 조사표(2026-06-10) 기준. UI에서 기본값을 표기하되 사용자가 직접 수정 가능
// (수정값이 그대로 계산에 반영됨 — 보수 설계·수질 불량·소방 C값 등은 수정으로 대응).
//
// 주의: pipe-sizing·pump-hvac가 사용하는 pipeMaterials.ts(재질별 고정 f)와는 별개 데이터.
// 주의: 제조사 카탈로그의 Ra(산술평균 거칠기)는 ε(절대조도)와 다른 물리량 — ε로 직접 대입 금지.

export type PFMaterialId = 'steel' | 'sts304' | 'pvc' | 'copper' | 'pvdf';
export type PipeCondition = 'new' | 'old';

export const PIPE_CONDITIONS = [
  { key: 'new' as PipeCondition, label: '신관' },
  { key: 'old' as PipeCondition, label: '노후' },
];

export interface PFMaterial {
  id: PFMaterialId;
  nameKo: string;
  abbreviation: string | null;
  eps_mm: Record<PipeCondition, number>;
  hazenC: Record<PipeCondition, number>;
  sourceNote: string;
}

export const PF_MATERIALS: PFMaterial[] = [
  {
    id: 'steel',
    nameKo: '강관(탄소강)',
    abbreviation: 'SPPS, SPP',
    eps_mm: { new: 0.046, old: 0.20 },
    hazenC: { new: 140, old: 100 },
    sourceNote: 'Moody(1944) commercial steel 0.046; 노후 0.2(0.15~0.5 범위) · C: ASHRAE Fundamentals Ch.22 신관 140 → 부식 100 이하; KDS 57',
  },
  {
    id: 'sts304',
    nameKo: '스테인리스강관',
    abbreviation: 'STS 304, 316',
    eps_mm: { new: 0.015, old: 0.015 },
    hazenC: { new: 150, old: 150 },
    sourceNote: 'F.M. White, Fluid Mechanics ε 0.015 · C: NFPA 13 스테인리스 150; 내식 재질로 노후=신관 (KDS 57)',
  },
  {
    id: 'pvc',
    nameKo: 'PVC / C-PVC',
    abbreviation: null,
    eps_mm: { new: 0.0015, old: 0.0015 },
    hazenC: { new: 150, old: 150 },
    sourceNote: 'Moody 평활관 0.0015 · C: NFPA 13 plastic(listed) 150; PPI(1971) 30년 사용 후 통수능력 불변',
  },
  {
    id: 'copper',
    nameKo: '동관',
    abbreviation: 'Copper',
    eps_mm: { new: 0.0015, old: 0.0015 },
    hazenC: { new: 150, old: 135 },
    sourceNote: 'Moody drawn tubing 0.0015 · C: ASHRAE Ch.22 동관 150; 노후 135 = 수질 조건 보수값 (ASHRAE, Obrecht & Pourbaix 1967 인용)',
  },
  {
    id: 'pvdf',
    nameKo: 'PVDF',
    abbreviation: null,
    eps_mm: { new: 0.0015, old: 0.0015 },
    hazenC: { new: 150, old: 150 },
    sourceNote: 'Moody/PPI 평활 플라스틱 0.0015 (보수 상한 0.007) · C: GF SYGEF PVDF Engineering Handbook 실측 160~165, 설계값 150(보수)',
  },
];

export function pfMaterial(id: PFMaterialId): PFMaterial {
  return PF_MATERIALS.find(m => m.id === id) ?? PF_MATERIALS[0];
}
