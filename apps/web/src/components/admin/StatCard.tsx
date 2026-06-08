interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: 'default' | 'green' | 'blue' | 'orange' | 'red' | 'indigo';
}

const colorMap: Record<string, { value: string; dot: string; bg: string }> = {
  default: { value: '#0f172a', dot: '#94a3b8', bg: '#f8fafc' },
  indigo:  { value: '#4f46e5', dot: '#4f46e5', bg: '#f5f3ff' },
  green:   { value: '#16a34a', dot: '#22c55e', bg: '#f0fdf4' },
  blue:    { value: '#4f46e5', dot: '#4f46e5', bg: '#f5f3ff' },
  orange:  { value: '#d97706', dot: '#f59e0b', bg: '#fffbeb' },
  red:     { value: '#dc2626', dot: '#ef4444', bg: '#fef2f2' },
};

export default function StatCard({ label, value, sub, color = 'default' }: StatCardProps) {
  const c = colorMap[color] || colorMap.default;
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      border: '1.5px solid #e2e8f0',
      padding: '18px 20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            {label}
          </p>
          <p style={{ fontSize: 26, fontWeight: 800, color: c.value, margin: '6px 0 0', letterSpacing: '-0.5px', lineHeight: 1 }}>
            {value}
          </p>
          {sub && <p style={{ fontSize: 11, color: '#94a3b8', margin: '6px 0 0' }}>{sub}</p>}
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.dot, marginTop: 4, opacity: 0.7 }} />
      </div>
    </div>
  );
}
