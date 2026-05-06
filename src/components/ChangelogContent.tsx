import { useState } from 'react';
import { changelog, type ChangelogStatus } from '../data/changelog';

// 탭 라벨 매핑
const TAB_LABELS: Record<ChangelogStatus, string> = {
  'done':        '완료',
  'in-progress': '진행중',
  'planned':     '예정',
};

const TAB_ORDER: ChangelogStatus[] = ['done', 'in-progress', 'planned'];

// 상태 칩 스타일
const CHIP_STYLES: Record<ChangelogStatus, { background: string; color: string; label: string }> = {
  'done':        { background: 'var(--state-success-bg)', color: 'var(--state-success-text)', label: '완료' },
  'in-progress': { background: 'var(--state-warn-bg)',    color: 'var(--state-warn-text)',    label: '진행중' },
  'planned':     { background: 'var(--bg-active)',        color: 'var(--text-secondary)',     label: '예정' },
};

function StatusChip({ status }: { status: ChangelogStatus }) {
  const { background, color, label } = CHIP_STYLES[status];
  return (
    <span
      style={{
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        backgroundColor: background,
        color,
      }}
    >
      {label}
    </span>
  );
}

export default function ChangelogContent() {
  const [activeTab, setActiveTab] = useState<ChangelogStatus>('done');

  // 날짜 내림차순 정렬 (stable sort — 동일 날짜는 입력 순서 유지)
  const sorted = [...changelog].sort((a, b) => b.date.localeCompare(a.date));
  const filtered = sorted.filter(entry => entry.status === activeTab);

  return (
    <div>
      {/* 탭 헤더 */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 16,
        }}
      >
        {TAB_ORDER.map(tab => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                marginBottom: -1,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                transition: 'color 0.15s',
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </div>

      {/* 리스트 */}
      <div style={{ minHeight: 240 }}>
        {filtered.length === 0 ? (
          <p
            style={{
              color: 'var(--text-quaternary)',
              fontSize: 13,
              padding: '24px 0',
              textAlign: 'center',
              margin: 0,
            }}
          >
            표시할 항목이 없습니다.
          </p>
        ) : (
          filtered.map((entry, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: idx === filtered.length - 1 ? 'none' : '1px solid var(--bg-surface-3)',
              }}
            >
              <StatusChip status={entry.status} />
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{entry.date}</span>
              <span style={{ color: 'var(--border-default)', fontSize: 13 }}>·</span>
              <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{entry.title}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
