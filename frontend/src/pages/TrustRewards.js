import Sidebar from '../components/Sidebar';
const milestones = [
  { score: 100, label: 'Bronze Partner', reward: 'Priority listing', achieved: true },
  { score: 300, label: 'Silver Partner', reward: 'Reduced fine rates', achieved: true },
  { score: 600, label: 'Gold Partner', reward: 'Access to premium vehicles', achieved: true },
  { score: 900, label: 'Platinum Partner', reward: 'Interest-free financing eligibility', achieved: false },
  { score: 1200, label: 'Elite Partner', reward: 'Vehicle ownership pathway', achieved: false },
];
const history = [
  { label: 'On-time payment', points: '+12', date: 'May 17, 2026' },
  { label: 'On-time payment', points: '+12', date: 'May 16, 2026' },
  { label: 'Late payment penalty', points: '-5', date: 'May 14, 2026' },
  { label: 'On-time payment', points: '+12', date: 'May 13, 2026' },
  { label: '7-day streak bonus', points: '+20', date: 'May 12, 2026' },
];
export default function TrustRewards() {
  const currentScore = 842;
  const nextMilestone = milestones.find(m => !m.achieved);
  const progress = nextMilestone ? (currentScore / nextMilestone.score) * 100 : 100;
  return (
    <div style={{ display: 'flex', backgroundColor: '#FAF7F2', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '220px', flex: 1, padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1A1A1A' }}>Trust Rewards</h1>
          <p style={{ fontSize: '13px', color: '#6B6B6B', marginTop: '4px' }}>Build your trust score to unlock better benefits.</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1, backgroundColor: '#7D5235', borderRadius: '16px', padding: '28px', color: 'white' }}>
            <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '8px' }}>Your Trust Score</p>
            <p style={{ fontSize: '56px', fontWeight: '800', marginBottom: '8px' }}>{currentScore}</p>
            <p style={{ fontSize: '13px', opacity: 0.7 }}>Gold Partner — Top 15% of drivers</p>
            {nextMilestone && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <p style={{ fontSize: '12px', opacity: 0.8 }}>Next: {nextMilestone.label}</p>
                  <p style={{ fontSize: '12px', opacity: 0.8 }}>{nextMilestone.score - currentScore} pts away</p>
                </div>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px', height: '6px' }}>
                  <div style={{ backgroundColor: 'white', borderRadius: '4px', height: '6px', width: `${Math.min(progress, 100)}%` }} />
                </div>
              </div>
            )}
          </div>
          <div style={{ flex: 2, display: 'flex', gap: '16px' }}>
            {[
              { label: 'Points This Month', value: '+51', sub: 'Keep it up!', color: '#16A34A' },
              { label: 'On-time Payments', value: '94%', sub: 'Last 30 days', color: '#1A1A1A' },
              { label: 'Active Streak', value: '6 days', sub: '1 more for bonus', color: '#D97706' },
            ].map((card, i) => (
              <div key={i} style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #E8E0D5' }}>
                <p style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{card.label}</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: card.color, marginBottom: '4px' }}>{card.value}</p>
                <p style={{ fontSize: '12px', color: '#6B6B6B' }}>{card.sub}</p>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>Milestone Rewards</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {milestones.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', backgroundColor: m.achieved ? '#F3EDE5' : '#F9FAFB', border: `1px solid ${m.achieved ? '#C49A6C' : '#E8E0D5'}` }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: m.achieved ? '#8B5E3C' : '#E8E0D5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                    {m.achieved ? '✓' : '🔒'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: m.achieved ? '#8B5E3C' : '#9CA3AF' }}>{m.label}</p>
                    <p style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '2px' }}>{m.reward}</p>
                  </div>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: m.achieved ? '#8B5E3C' : '#9CA3AF' }}>{m.score} pts</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, backgroundColor: 'white', borderRadius: '12px', padding: '24px', border: '1px solid #E8E0D5' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1A1A1A', marginBottom: '16px' }}>Points History</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < history.length - 1 ? '1px solid #F3EDE5' : 'none' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '500', color: '#1A1A1A' }}>{item.label}</p>
                    <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{item.date}</p>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: '700', color: item.points.startsWith('+') ? '#16A34A' : '#DC2626' }}>{item.points}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}