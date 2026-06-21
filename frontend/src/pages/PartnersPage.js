import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight, Phone, FileText, MapPin, Truck, Users,
  CheckCircle, Mail, Building2, Calendar, Globe, Loader2, ArrowLeft,
} from 'lucide-react';
import { BrandLogo } from '../hooks/useBranding';

const API = process.env.REACT_APP_API_URL || 'https://mg-qw5s.onrender.com';

const initials = (name = '') =>
  name.split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';

// ── Shared Nav ────────────────────────────────────────────────────────────────
function Nav({ onBack, backLabel = 'All Partners' }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    fn();
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav style={{
      position: 'fixed', top: 0, width: '100%', zIndex: 100,
      background: scrolled ? 'rgba(10,10,26,0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
      transition: 'all 0.3s',
    }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="https://mobilitygrid.in" style={{ textDecoration: 'none' }}>
          <BrandLogo variant="cyan" height={36} alt="MobilityGrid" />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {onBack && (
            <button onClick={onBack} style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', padding: '8px 18px', borderRadius: 40, fontSize: 13,
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <ArrowLeft size={14} /> {backLabel}
            </button>
          )}
          <a href="https://mobilitygrid.in#signup" style={{
            background: '#4f46e5', color: '#fff', padding: '9px 20px',
            borderRadius: 40, fontSize: 13, fontWeight: 700, textDecoration: 'none',
          }}>
            Get Early Access
          </a>
        </div>
      </div>
    </nav>
  );
}

// ── Partner Detail ────────────────────────────────────────────────────────────
function PartnerDetail({ slug }) {
  const navigate = useNavigate();
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/api/config/partner/${encodeURIComponent(slug.toLowerCase())}`)
      .then(r => r.json())
      .then(d => { if (d.success) setPartner(d.partner); else setError(d.error || 'Partner not found'); })
      .catch(() => setError('Could not load partner'))
      .finally(() => setLoading(false));
  }, [slug]);

  const PAGE_BG = '#040712';
  const CARD_BG = 'rgba(255,255,255,0.04)';
  const BORDER  = 'rgba(255,255,255,0.08)';

  if (loading) return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (!partner) return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 12 }}>
      <p style={{ fontSize: 20, fontWeight: 800 }}>Partner not found</p>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>{error}</p>
      <button onClick={() => navigate('/')} style={{ marginTop: 8, background: '#4f46e5', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 40, fontWeight: 700, cursor: 'pointer' }}>
        ← All Partners
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Nav onBack={() => navigate('/')} />

      {/* Hero */}
      <div style={{ paddingTop: 120, paddingBottom: 60, maxWidth: 800, margin: '0 auto', padding: '120px 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20,
            background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 900, color: '#fff', flexShrink: 0,
            boxShadow: '0 12px 32px rgba(79,70,229,0.4)',
          }}>
            {initials(partner.brand || partner.name)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              {partner.status === 'ACTIVE' && (
                <span style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 40, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={10} /> Active Partner
                </span>
              )}
              {partner.since && (
                <span style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 40 }}>
                  Since {partner.since}
                </span>
              )}
              {partner.category && (
                <span style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 40 }}>
                  {partner.category}
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>{partner.name}</h1>
            {partner.brand && partner.brand !== partner.name && (
              <p style={{ color: '#a5b4fc', fontSize: 14, margin: '4px 0 0', fontWeight: 600 }}>Brand: {partner.brand}</p>
            )}
            {partner.tagline && (
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, margin: '6px 0 0' }}>{partner.tagline}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, marginTop: 40, background: BORDER, borderRadius: 16, overflow: 'hidden' }}>
          {[
            { icon: <Truck size={20} color="#6366f1" />, value: partner.fleet ?? '—', label: 'Vehicles' },
            { icon: <Users size={20} color="#6366f1" />, value: partner.drivers ?? '—', label: 'Drivers' },
          ].map(s => (
            <div key={s.label} style={{ background: CARD_BG, padding: '24px', textAlign: 'center' }}>
              <div style={{ marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 36, fontWeight: 900 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Details */}
        <div style={{ marginTop: 24, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {partner.legal_type && <Detail icon={<Building2 size={15} color="#6366f1" />} label="Organisation Type" value={partner.legal_type} />}
            {partner.address    && <Detail icon={<MapPin size={15} color="#6366f1" />} label="Registered Address" value={partner.address} />}
            {partner.contact_person && <Detail icon={<Phone size={15} color="#6366f1" />} label="Contact" value={`${partner.contact_person}${partner.mobile ? ` · ${partner.mobile}` : ''}`} />}
            {partner.email      && <Detail icon={<Mail size={15} color="#6366f1" />} label="Email" value={<a href={`mailto:${partner.email}`} style={{ color: '#818cf8' }}>{partner.email}</a>} />}
            {partner.website    && <Detail icon={<Globe size={15} color="#6366f1" />} label="Website" value={<a href={partner.website} target="_blank" rel="noreferrer" style={{ color: '#818cf8' }}>{partner.website.replace(/^https?:\/\//, '')}</a>} />}
            {(partner.gst || partner.pan || partner.cin) && (
              <Detail icon={<FileText size={15} color="#6366f1" />} label="Legal Identifiers" value={
                <span>
                  {partner.gst && <span style={{ display: 'block', fontFamily: 'monospace', fontSize: 12 }}>GST: {partner.gst}</span>}
                  {partner.pan && <span style={{ display: 'block', fontFamily: 'monospace', fontSize: 12 }}>PAN: {partner.pan}</span>}
                  {partner.cin && <span style={{ display: 'block', fontFamily: 'monospace', fontSize: 12 }}>CIN: {partner.cin}</span>}
                </span>
              } />
            )}
          </div>
        </div>

        {partner.about && (
          <div style={{ marginTop: 20, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '28px 32px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: 10 }}>About</p>
            <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, fontSize: 15, margin: 0 }}>{partner.about}</p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

function Detail({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ marginTop: 2, flexShrink: 0 }}>{icon}</div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' }}>{label}</p>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  );
}

// ── Partner Listing ───────────────────────────────────────────────────────────
function PartnerListing() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/config/partners`)
      .then(r => r.json())
      .then(d => { if (d.success) setPartners(d.partners || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const PAGE_BG = '#040712';
  const CARD_BG = 'rgba(255,255,255,0.04)';
  const BORDER  = 'rgba(255,255,255,0.08)';

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Nav onBack={() => { window.location.href = 'https://mobilitygrid.in'; }} backLabel="MobilityGrid.in" />

      {/* Hero strip */}
      <div style={{
        paddingTop: 140, paddingBottom: 60, textAlign: 'center',
        background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(79,70,229,0.18) 0%, transparent 70%)',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 24px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
            color: '#a5b4fc', fontSize: 12, fontWeight: 700,
            padding: '6px 16px', borderRadius: 40, marginBottom: 24,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <CheckCircle size={12} /> Verified Fleet Partners
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 900, margin: '0 0 16px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Fleets running on<br /><em style={{ fontStyle: 'italic', color: '#c4965a' }}>MobilityGrid</em>
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 17, lineHeight: 1.7, margin: 0 }}>
            Onboarded merchants managing their EV fleets with digital rent collection, driver KYC, and real-time tracking.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <Loader2 size={24} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : partners.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', paddingTop: 60, fontSize: 15 }}>No partners listed yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
            {partners.map(p => (
              <button
                key={p.partner_slug}
                onClick={() => navigate(`/${p.partner_slug}`)}
                style={{
                  background: CARD_BG, border: `1px solid ${BORDER}`,
                  borderRadius: 20, padding: '28px', textAlign: 'left',
                  cursor: 'pointer', color: '#fff', transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column', gap: 16,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = CARD_BG; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 900,
                  }}>
                    {initials(p.brand_name || p.full_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>{p.full_name}</p>
                    {p.tagline && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.tagline}</p>}
                  </div>
                  <ArrowRight size={16} color="rgba(255,255,255,0.25)" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 40, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={9} /> {p.partner_status === 'ACTIVE' ? 'Active' : p.partner_status}
                  </span>
                  {p.since_year && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Since {p.since_year}</span>}
                  {p.vehicle_count > 0 && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{p.vehicle_count} vehicles</span>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* CTA */}
        <div style={{
          marginTop: 60, background: 'linear-gradient(135deg,rgba(79,70,229,0.15),rgba(124,58,237,0.1))',
          border: '1px solid rgba(99,102,241,0.2)', borderRadius: 24,
          padding: '40px 32px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Want to list your fleet?</p>
          <p style={{ color: 'rgba(255,255,255,0.45)', margin: '0 0 24px', fontSize: 15 }}>Join the MobilityGrid partner network</p>
          <a href="https://mobilitygrid.in/#contact" style={{
            display: 'inline-block', background: '#4f46e5', color: '#fff',
            padding: '12px 28px', borderRadius: 40, fontWeight: 700, fontSize: 14,
            textDecoration: 'none', transition: 'background 0.2s',
          }}>
            Express Interest →
          </a>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function PartnersPage() {
  const { slug } = useParams();
  return slug ? <PartnerDetail slug={slug} /> : <PartnerListing />;
}
