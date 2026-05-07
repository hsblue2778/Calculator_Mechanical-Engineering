// 단위 설정 패널 — 유량·압력 단위를 가로 버튼 라디오 2그룹으로 노출

import { SlidersHorizontal } from 'lucide-react';
import UnitRadios from './UnitRadios';

interface OptionItem { key: string; label: string }

interface Props {
  flowOptions: OptionItem[];
  flowValue: string;
  onFlowChange: (v: string) => void;
  flowLabel?: string;                  // 기본 "유량 단위" — 호출자가 모드에 따라 덮어쓸 수 있음
  pressureOptions: OptionItem[];
  pressureValue: string;
  onPressureChange: (v: string) => void;
}

export default function UnitPanel({
  flowOptions, flowValue, onFlowChange, flowLabel = '유량 단위',
  pressureOptions, pressureValue, onPressureChange,
}: Props) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface-2)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 8,
      padding: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <SlidersHorizontal size={14} color="var(--text-tertiary)" />
        <span style={{
          fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>단위 설정</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <UnitRadios
          label={flowLabel}
          options={flowOptions}
          value={flowValue}
          onChange={onFlowChange}
        />
        <UnitRadios
          label="압력 단위"
          options={pressureOptions}
          value={pressureValue}
          onChange={onPressureChange}
        />
      </div>
    </div>
  );
}
