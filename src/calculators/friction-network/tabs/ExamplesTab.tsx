// 마찰손실 계통 계산기 — 예시 탭 (참조 엑셀 S01~S03 샘플 + 덕트 데모)

import type { FNSystemType } from '../../../data/frictionNetworkRef.ts';
import type { FNSettingsState, FNSegmentState } from '../index';
import { C } from '../styles';

export interface FNPreset {
  label: string;
  hint: string;
  settings: Partial<FNSettingsState> & { systemType: FNSystemType };
  segments: FNSegmentState[];
}

const seg = (over: Partial<FNSegmentState>): FNSegmentState => ({
  id: '', parentId: 'ROOT', grade: 'main', shape: 'circle',
  D: '', a: '', b: '', L: '', sumK: '0', equip: '0',
  materialId: 'steel', condition: 'new', terminalFlow: '', pReq: '0',
  ...over,
});

export const FN_PRESETS: FNPreset[] = [
  {
    label: '엑셀 샘플 — 배관 1분기 계통 (S01~S03)',
    hint: '물 20°C · LPM · 강관 신관 · 검증 기준 케이스',
    settings: { systemType: 'pipe', fluid: 'water', tempC: '20', pAvail: '70000', alphaPct: '10', flowUnit: 'LPM' },
    segments: [
      seg({ id: 'S01', parentId: 'ROOT', grade: 'main', D: '52.9', L: '20', sumK: '5' }),
      seg({ id: 'S02', parentId: 'S01', grade: 'branch', D: '52.9', L: '10', sumK: '3', terminalFlow: '150', pReq: '15000' }),
      seg({ id: 'S03', parentId: 'S01', grade: 'branch', D: '52.9', L: '12', sumK: '3', terminalFlow: '150', pReq: '15000' }),
    ],
  },
  {
    label: '덕트 데모 — 사각 메인 + 원형 분기 2개',
    hint: '공기 20°C · CMH · 아연도금강판 · 사각 De 확인용',
    settings: { systemType: 'duct', fluid: 'air', tempC: '20', pAvail: '500', alphaPct: '10', flowUnit: 'CMH' },
    segments: [
      seg({ id: 'D01', parentId: 'ROOT', grade: 'main', shape: 'rect', a: '400', b: '200', L: '15', sumK: '1.5', materialId: 'galv-sheet' }),
      seg({ id: 'D02', parentId: 'D01', grade: 'branch', D: '250', L: '8', sumK: '2', materialId: 'galv-sheet', terminalFlow: '900', pReq: '50' }),
      seg({ id: 'D03', parentId: 'D01', grade: 'branch', D: '250', L: '10', sumK: '2', materialId: 'galv-sheet', terminalFlow: '900', pReq: '50' }),
    ],
  },
];

interface Props {
  onLoad: (p: FNPreset) => void;
}

export default function ExamplesTab({ onLoad }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
        아래 예시를 클릭하면 계산 탭에 값이 자동 적용됩니다. 첫 번째 예시는 참조 엑셀의 샘플 계통으로,
        수치 검증(scripts/verify-friction-network.ts)의 기준 케이스와 동일합니다.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FN_PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => onLoad(p)}
            style={{
              width: '100%', textAlign: 'left',
              backgroundColor: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: 14,
              cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = C.blue;
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.backgroundColor = C.surface;
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: C.heading }}>{p.label}</span>
              <span style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>{p.hint}</span>
            </div>
            <div style={{ fontSize: 12, color: C.text, fontFamily: 'ui-monospace, monospace' }}>
              {p.segments.map(s => s.id).join(' · ')} — 말단 유량 합산 → 누적손실 → 가용정압 판정
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
