// HTML 산출서 빌더 Props 타입
import type { PumpHvacResult, SystemMode, PumpCurveAtHz } from '../calc';
import type { FluidId, PumpFieldConfig } from '../configs/types';
import type { PressureUnitPumpKey } from '../units';

export interface PumpHvacReportProps {
  result: PumpHvacResult;
  systemMode: SystemMode;
  fluid: FluidId;
  tempC: number;
  Q_m3s: number;
  Q_display: string;
  flowUnitLabel: string;
  HsStr: string;
  HdStr: string;
  PresStr: string;
  presUnit: PressureUnitPumpKey;
  PatmStr: string;
  headMarginStr: string;
  powerMarginStr: string;
  npshMarginStr: string;
  presetApplied: { head: boolean; power: boolean; npsh: boolean };
  fieldLabel: string;
  fieldConfig: PumpFieldConfig;
  npshrStr: string;
  // 운전점 (선택)
  pumpCurve?: { Q_m3h: number; H_m: number }[];
  BEP_Q_m3h?: number | null;
  operatingPoint?: { Q_m3h: number; H_m: number } | null;
  pumpCurveFamily?: PumpCurveAtHz[];
  catalogHz?: number;
}
