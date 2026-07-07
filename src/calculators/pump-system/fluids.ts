// HVAC 펌프 시스템 — 유체 ID → 표시 라벨 매핑
// SystemConditionSection(화면 셀렉트)·csvExport(CSV 행)가 공용

import type { FluidId } from './configs/types';

export const FLUID_LABELS: Record<FluidId, string> = {
  'water': '냉수',
  'cooling-water': '냉각수',
  'hot-water': '온수',
  'glycol-eg': 'EG 브라인 (Phase 1.5)',
  'glycol-pg': 'PG 브라인 (Phase 1.5)',
};
