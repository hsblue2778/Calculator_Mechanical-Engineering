import type { PumpFieldConfig, PumpFieldId } from './types';
import { HVAC_CONFIG } from './hvac';

const CONFIG_MAP: Record<PumpFieldId, PumpFieldConfig | undefined> = {
  'hvac': HVAC_CONFIG,
  'process': undefined,         // Phase 1.2
  'liquid-utility': undefined,  // Phase 1.3
  'fire': undefined,            // Phase 1.4
};

export function getPumpFieldConfig(field: PumpFieldId): PumpFieldConfig {
  const cfg = CONFIG_MAP[field];
  if (!cfg) throw new Error(`PumpFieldConfig not implemented for field: ${field}`);
  return cfg;
}
