function StatCard({ label, value, sub, subColor }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px 24px',
      flex: 1,
      border: '1px solid #E8E0D5',
    }}>
      <p style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', marginBottom: '4px' }}>{value}</p>
      {sub && <p style={{ fontSize: '12px', color: subColor || '#9CA3AF' }}>{sub}</p>}
    </div>
  );
}

export default StatCard;