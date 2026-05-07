// HVAC 펌프 시스템 — 폼 소형 컴포넌트들

import { useState } from 'react';
import { Save, Check } from 'lucide-react';
import { C, inputStyle, labelStyle, sectionStyle, sectionTitleStyle } from '../styles';
import { PIPE_SIZE_MATERIALS } from '../../../data/pipeSizes';
import { LENGTH_UNITS, type LengthUnitKey } from '../units';

export function FieldNum({
  label, hint, value, onChange, allowNegative = false,
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; allowNegative?: boolean;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type="number" value={value} step="any"
        min={allowNegative ? undefined : 0}
        onChange={e => onChange(e.target.value)}
        style={inputStyle}
        onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
        onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }} />
      {hint && <p style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

export function PresetField({
  label, value, onChange, isPreset,
}: {
  label: string; value: string; onChange: (v: string) => void; isPreset: boolean;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>{label}</label>
        {isPreset && (
          <span style={{
            fontSize: 10, color: 'var(--accent-primary-hover)', backgroundColor: 'var(--accent-primary-bg-soft)',
            border: '1px solid var(--accent-primary-bg)', borderRadius: 4, padding: '1px 6px',
          }}>프리셋 적용 중</span>
        )}
      </div>
      <input type="number" value={value} step="any" min={0}
        onChange={e => onChange(e.target.value)}
        style={inputStyle}
        onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
        onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }} />
    </div>
  );
}

export function UnitBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 10px', fontSize: 12, borderRadius: 4,
      border: `1px solid ${active ? C.blue : C.borderInput}`,
      backgroundColor: active ? 'var(--accent-primary-bg-soft)' : C.surface,
      color: active ? C.blue : C.textDark,
      cursor: 'pointer', fontFamily: 'inherit',
    }}>{label}</button>
  );
}

export function SaveBtn({ onClick, enabled }: { onClick: () => void; enabled: boolean }) {
  const [saved, setSaved] = useState(false);
  function handle() { onClick(); setSaved(true); setTimeout(() => setSaved(false), 1600); }
  return (
    <button onClick={handle} disabled={!enabled}
      title={enabled ? '현재 계산을 기록에 저장' : '계산 결과가 유효할 때 저장할 수 있습니다'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '10px 16px', fontSize: 13, fontWeight: 500,
        color: enabled ? 'var(--text-inverse)' : 'var(--border-subtle)',
        backgroundColor: enabled ? (saved ? 'var(--state-success)' : C.blue) : 'var(--border-default)',
        border: 'none', borderRadius: 8,
        cursor: enabled ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
        transition: 'background-color 0.15s',
      }}
    >
      {saved ? <Check size={14} /> : <Save size={14} />}
      {saved ? '저장됨' : '기록 저장'}
    </button>
  );
}

export function PipeSectionBlock({
  title, nominalA, setNominalA, lStr, setLStr, lUnit, setLUnit, matId, setMatId,
}: {
  title: string;
  nominalA: number; setNominalA: (v: number) => void;
  lStr: string; setLStr: (v: string) => void;
  lUnit: LengthUnitKey; setLUnit: (v: LengthUnitKey) => void;
  matId: string; setMatId: (v: string) => void;
}) {
  const sizes = PIPE_SIZE_MATERIALS.find(m => m.id === matId)?.sizes ?? [];
  return (
    <div className="pump-section" style={sectionStyle}>
      <p style={sectionTitleStyle}>{title}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div>
          <label style={labelStyle}>재질</label>
          <select value={matId} onChange={e => setMatId(e.target.value)} style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
            onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}>
            {PIPE_SIZE_MATERIALS.map(m => <option key={m.id} value={m.id}>{m.nameKo}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>호칭경</label>
          <select value={nominalA} onChange={e => setNominalA(Number(e.target.value))} style={inputStyle}
            onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
            onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }}>
            {sizes.map(s => (
              <option key={s.nominalA} value={s.nominalA}>{s.nominalA}A (ID: {s.id_mm.toFixed(1)} mm)</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>길이</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="number" value={lStr} min={0} step="any"
              onChange={e => setLStr(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
              onFocus={e => { e.currentTarget.style.borderColor = C.blue; }}
              onBlur={e => { e.currentTarget.style.borderColor = C.borderInput; }} />
            <div style={{ display: 'flex', gap: 2 }}>
              {LENGTH_UNITS.map(u => (
                <UnitBtn key={u.key} label={u.label} active={lUnit === u.key}
                  onClick={() => setLUnit(u.key)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
