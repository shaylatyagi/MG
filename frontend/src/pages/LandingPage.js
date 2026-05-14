import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: '#FAF7F2', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 60px', backgroundColor: 'white', borderBottom: '1px solid #E8E0D5', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontSize: '18px', fontWeight: '800', color: '#8B5E3C', letterSpacing: '1px' }}>MOBILITY GRID</div>
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#6B6B6B', cursor: 'pointer' }} onClick={() => document.getElementById('vision').scrollIntoView({ behavior: 'smooth' })}>Vision</span>
          <span style={{ fontSize: '14px', color: '#6B6B6B', cursor: 'pointer' }} onClick={() => document.getElementById('solutions').scrollIntoView({ behavior: 'smooth' })}>Solutions</span>
          <span style={{ fontSize: '14px', color: '#6B6B6B', cursor: 'pointer' }} onClick={() => document.getElementById('the-grid').scrollIntoView({ behavior: 'smooth' })}>The Grid</span>
          <button onClick={() => navigate('/login')} style={{ backgroundColor: '#8B5E3C', color: 'white', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: '600' }}>Launch Platform</button>
        </div>
      </nav>

      {/* Hero */}
      <div id="vision" style={{ textAlign: 'center', padding: '0 60px', minHeight: 'calc(100vh - 65px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundImage: 'radial-gradient(circle, #E8E0D5 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        <div style={{ display: 'inline-block', backgroundColor: '#F3EDE5', color: '#8B5E3C', fontSize: '12px', fontWeight: '600', padding: '6px 16px', borderRadius: '20px', marginBottom: '24px', letterSpacing: '0.5px' }}>
          THE FUTURE OF FLEET OPS
        </div>
        <h1 style={{ fontSize: '52px', fontWeight: '800', color: '#1A1A1A', lineHeight: '1.2', maxWidth: '700px', margin: '0 auto 16px' }}>
          Building the Trust Layer for{' '}
          <span style={{ color: '#8B5E3C' }}>Commercial EV Mobility</span>
        </h1>
        <p style={{ fontSize: '16px', color: '#6B6B6B', maxWidth: '500px', margin: '20px auto 40px', lineHeight: '1.6' }}>
          Mobility Grid is a digital operating system transforming fragmented rentals into a governance-ready, credit-worthy ecosystem.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button onClick={() => navigate('/login')} style={{ backgroundColor: '#8B5E3C', color: 'white', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600' }}>Launch Dashboard</button>
          <button onClick={() => alert('Whitepaper coming soon')} style={{ backgroundColor: 'white', color: '#1A1A1A', padding: '14px 28px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', border: '1px solid #E8E0D5' }}>Read Whitepaper</button>
        </div>
      </div>

      {/* Dual Sided Ecosystem */}
      <div id="solutions" style={{ padding: '80px 60px', backgroundColor: 'white' }}>
        <p style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>A Dual-Sided Ecosystem</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
          <p style={{ fontSize: '20px', fontWeight: '600', color: '#1A1A1A', maxWidth: '400px' }}>
            We optimize the Grid for the best owners of EV mobility, the asset owner and the driver partner.
          </p>
          <div style={{ display: 'flex', gap: '32px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#8B5E3C' }}>94%</p>
              <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Collection Rate</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '28px', fontWeight: '700', color: '#8B5E3C' }}>₹4.2k</p>
              <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Avg Monthly Earning</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ flex: 1, backgroundColor: '#2C1810', borderRadius: '16px', padding: '32px' }}>
            <p style={{ fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '16px' }}>For Vehicle Owners</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '20px', lineHeight: '1.6' }}>
              Monetize your fleet with zero operational overhead. Get daily collections, compliance tracking, and driver intelligence automatically.
            </p>
            {['Compliance Vault (RC/Insurance)', 'Earnings Intelligence Dashboard', 'Automated Daily Collections'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ color: '#C49A6C', fontSize: '14px' }}>✓</span>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{item}</p>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, backgroundColor: '#2C1810', borderRadius: '16px', padding: '32px' }}>
            <p style={{ fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '16px' }}>For Driver Partners</p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '20px', lineHeight: '1.6' }}>
              Access premium EV assets with zero upfront debt. Build a digital credit profile to unlock future ownership.
            </p>
            {['Flexible Daily Rental Plans', 'Driver Trust Score Financing', '24/7 Digital SOS Support'].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ color: '#C49A6C', fontSize: '14px' }}>✓</span>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Intelligence */}
      <div id="the-grid" style={{ padding: '80px 60px', backgroundColor: '#FAF7F2' }}>
        <div style={{ backgroundColor: '#7D5235', borderRadius: '24px', padding: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ maxWidth: '500px' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>The Grid Intelligence: Our Operational Moat</p>
            <h2 style={{ fontSize: '28px', fontWeight: '700', color: 'white', marginBottom: '16px', lineHeight: '1.3' }}>
              While others rent vehicles, we rent managed uptime.
            </h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', marginBottom: '24px' }}>
              Our Grid engine processes thousands of telemetry data points to ensure the Grid remains stable and profitable.
            </p>
            <div style={{ display: 'flex', gap: '32px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '4px' }}>Predictive</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Risk scoring before problems surface</p>
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '4px' }}>Responsive</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Automated escalation and priorities</p>
              </div>
            </div>
          </div>
          <div style={{ width: '200px', height: '200px' }}>
            <svg viewBox="0 0 200 200" width="200" height="200">
              <polygon points="100,20 180,70 180,130 100,180 20,130 20,70" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
              <polygon points="100,40 160,80 160,120 100,160 40,120 40,80" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
              <polygon points="100,60 140,85 140,115 100,140 60,115 60,85" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
              <polygon points="100,30 170,72 165,128 100,168 35,128 30,72" fill="rgba(196,154,108,0.3)" stroke="#C49A6C" strokeWidth="1.5"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ backgroundColor: 'white', borderTop: '1px solid #E8E0D5', padding: '24px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '14px', fontWeight: '700', color: '#8B5E3C' }}>MOBILITY GRID</p>
        <p style={{ fontSize: '12px', color: '#9CA3AF' }}>© 2025 Mobility Grid. All rights reserved.</p>
      </div>

    </div>
  );
}

export default LandingPage;