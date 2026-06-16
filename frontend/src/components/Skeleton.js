// frontend/src/components/Skeleton.js
// Shimmer skeleton loaders for cards, lists, stats
import React from 'react';

const shimmer = `
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
`;

const base = {
  background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
  backgroundSize: '800px 100%',
  animation: 'shimmer 1.4s infinite linear',
  borderRadius: 8,
};

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('sk-shimmer')) {
  const s = document.createElement('style');
  s.id = 'sk-shimmer';
  s.textContent = shimmer;
  document.head.appendChild(s);
}

export function SkeletonBox({ width = '100%', height = 16, radius = 8, style = {} }) {
  return <div style={{ ...base, width, height, borderRadius: radius, ...style }} />;
}

// ── Stat card skeleton (used in Owner/Driver dashboards) ──────────────────────
export function SkeletonStatCard() {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #f1f5f9' }}>
      <SkeletonBox width={60} height={10} style={{ marginBottom: 10 }} />
      <SkeletonBox width={100} height={24} style={{ marginBottom: 6 }} />
      <SkeletonBox width={80} height={10} />
    </div>
  );
}

// ── Transaction / list row skeleton ──────────────────────────────────────────
export function SkeletonListRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f8fafc' }}>
      <SkeletonBox width={40} height={40} radius={12} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <SkeletonBox width="60%" height={12} style={{ marginBottom: 6 }} />
        <SkeletonBox width="40%" height={10} />
      </div>
      <SkeletonBox width={60} height={14} radius={6} />
    </div>
  );
}

// ── Driver card skeleton ──────────────────────────────────────────────────────
export function SkeletonDriverCard() {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: '1px solid #f1f5f9', display: 'flex', gap: 12 }}>
      <SkeletonBox width={48} height={48} radius={24} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <SkeletonBox width="50%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonBox width="35%" height={10} style={{ marginBottom: 6 }} />
        <SkeletonBox width="45%" height={10} />
      </div>
    </div>
  );
}

// ── Full page loader (replaces spinner on initial load) ───────────────────────
export function SkeletonDashboard() {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div>
          <SkeletonBox width={120} height={18} style={{ marginBottom: 6 }} />
          <SkeletonBox width={80} height={12} />
        </div>
        <SkeletonBox width={40} height={40} radius={20} />
      </div>
      {/* Wallet card */}
      <div style={{ background: 'linear-gradient(135deg,#e0e7ff,#ede9fe)', borderRadius: 20, padding: 20 }}>
        <SkeletonBox width={80} height={10} style={{ marginBottom: 12, background: 'rgba(255,255,255,0.5)' }} />
        <SkeletonBox width={140} height={32} style={{ marginBottom: 16, background: 'rgba(255,255,255,0.5)' }} />
        <SkeletonBox width="100%" height={42} radius={14} style={{ background: 'rgba(255,255,255,0.4)' }} />
      </div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      {/* List rows */}
      <div style={{ background: '#fff', borderRadius: 16, padding: '0 16px', border: '1px solid #f1f5f9' }}>
        {[1,2,3].map(i => <SkeletonListRow key={i} />)}
      </div>
    </div>
  );
}
