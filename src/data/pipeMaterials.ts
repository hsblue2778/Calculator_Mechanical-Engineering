// 재질별 마찰계수 단일 출처 (Single Source of Truth).
//
// 한 곳에서만 정의하고 PIPE_MATERIALS·PIPE_MATERIALS_V2·PIPE_SIZE_MATERIALS
// 모두 이 상수를 참조한다. 마찰계수 변경 시 이 객체만 고치면 세 계산기
// (pipe-friction · pipe-sizing · pump-hvac) 결과가 동시에 일관 갱신된다.
//
// 출처: 일본 건축기술자협회 건축설비설계매뉴얼 공기조화설비(기문당) 213p —
// 재질별 고정 f 값 (정통 Darcy-Weisbach).
export const FRICTION_FACTORS = {
  carbonSteel:    0.03,
  stainlessSteel: 0.02,
  pvcCpvc:        0.02,
  copper:         0.02,
  pvdf:           0.02,
} as const;

export interface PipeMaterial {
  id: string;
  nameKo: string;
  nameEn: string;
  abbreviation: string | null;
  roughnessMin: number;
  roughnessMax: number;
  frictionFactor: number;
}

export const PIPE_MATERIALS: PipeMaterial[] = [
  {
    id: 'carbon-steel',
    nameKo: '탄소강관',
    nameEn: 'Carbon Steel',
    abbreviation: 'SPPS, SPP',
    roughnessMin: 0.045,
    roughnessMax: 0.05,
    frictionFactor: FRICTION_FACTORS.carbonSteel,
  },
  {
    id: 'stainless-steel',
    nameKo: '스테인리스강관',
    nameEn: 'Stainless Steel',
    abbreviation: 'STS 304, 316',
    roughnessMin: 0.015,
    roughnessMax: 0.015,
    frictionFactor: FRICTION_FACTORS.stainlessSteel,
  },
  {
    id: 'pvc-cpvc',
    nameKo: 'PVC / C-PVC',
    nameEn: 'PVC / C-PVC',
    abbreviation: null,
    roughnessMin: 0.0015,
    roughnessMax: 0.007,
    frictionFactor: FRICTION_FACTORS.pvcCpvc,
  },
  {
    id: 'copper',
    nameKo: '동관',
    nameEn: 'Copper',
    abbreviation: 'Copper',
    roughnessMin: 0.0015,
    roughnessMax: 0.003,
    frictionFactor: FRICTION_FACTORS.copper,
  },
  {
    id: 'pvdf',
    nameKo: 'PVDF',
    nameEn: 'PVDF',
    abbreviation: null,
    roughnessMin: 0.007,
    roughnessMax: 0.007,
    frictionFactor: FRICTION_FACTORS.pvdf,
  },
];

const formatRoughness = (value: number) => String(value);

function formatEpsilon(material: PipeMaterial): string {
  return material.roughnessMin === material.roughnessMax
    ? formatRoughness(material.roughnessMin)
    : `${formatRoughness(material.roughnessMin)}~${formatRoughness(material.roughnessMax)}`;
}

// select 옵션 라벨 — ε 범위 표현 유지 (예: "탄소강관 (SPPS, SPP) — f=0.030, ε=0.045~0.05 mm")
export function formatMaterialOptionLabel(material: PipeMaterial): string {
  const abbreviation = material.abbreviation ? ` (${material.abbreviation})` : '';
  return `${material.nameKo}${abbreviation} — f=${material.frictionFactor.toFixed(3)}, ε=${formatEpsilon(material)} mm`;
}

// select 밑의 보조 헬퍼 텍스트 — 영문명만 간결하게 (ε는 옵션 라벨에 이미 포함)
export function formatMaterialHelperText(material: PipeMaterial): string {
  return material.nameEn;
}
