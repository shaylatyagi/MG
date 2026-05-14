function ComingSoon({ page }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#FAF7F2',
    }}>
      <p style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</p>
      <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A', marginBottom: '8px' }}>{page || 'Coming Soon'}</h1>
      <p style={{ fontSize: '14px', color: '#6B6B6B' }}>This page is under construction. Check back soon.</p>
    </div>
  );
}

export default ComingSoon;