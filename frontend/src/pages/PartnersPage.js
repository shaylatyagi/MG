import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Phone, FileText, MapPin, Truck, Users,
  CheckCircle, Mail, Building2, Calendar, Award, Globe, Loader2,
} from 'lucide-react';
import { BrandLogo } from '../hooks/useBranding';

const API = process.env.REACT_APP_API_URL || 'https://mg-qw5s.onrender.com';

// Derive 2-letter avatar initials from name
const initials = (name = '') =>
  name.split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';

// ── Partner Detail Page ───────────────────────────────────────────────────────
function PartnerDetail({ slug }) {
  const navigate = useNavigate();
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`${API}/api/config/partner/${encodeURIComponent(slug.toLowerCase())}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setPartner(d.partner);
        else setError(d.error || 'Partner not found');
      })
      .catch(() => setError('Could not load partner details'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={28} className="text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !partner) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <p className="font-black text-slate-800 text-lg mb-2">Partner not found</p>
        <p className="text-sm text-slate-400 mb-6">{error}</p>
        <button
          onClick={() => navigate('/partners')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
        >
          ← All Partners
        </button>
      </div>
    );
  }

  const statusColor = partner.status === 'ACTIVE' ? 'bg-emerald-500/30' : 'bg-slate-400/30';

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="https://mobilitygrid.in">
            <BrandLogo variant="cyan" height={28} alt="MobilityGrid" />
          </a>
          <button
            onClick={() => navigate('/partners')}
            className="px-5 py-2 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-indigo-600 transition"
          >
            ← Partners
          </button>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">

          {/* Hero */}
          <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 p-8 text-white">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-black shadow-lg shrink-0">
                {initials(partner.brand || partner.name)}
              </div>
              <div>
                <h1 className="text-3xl font-extrabold">{partner.name}</h1>
                {partner.brand && partner.brand !== partner.name && (
                  <p className="text-indigo-200 text-sm font-bold mt-0.5">Brand: {partner.brand}</p>
                )}
                {partner.tagline && (
                  <p className="text-white/80 text-sm mt-1">{partner.tagline}</p>
                )}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className={`${statusColor} text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1`}>
                    <CheckCircle size={12} /> {partner.status === 'ACTIVE' ? 'Active Partner' : partner.status}
                  </span>
                  {partner.since && (
                    <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Calendar size={12} /> Since {partner.since}
                    </span>
                  )}
                  {partner.category && (
                    <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                      {partner.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 border-b border-slate-100">
            <div className="p-5 border-r border-slate-100 text-center">
              <Truck size={18} className="text-indigo-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-slate-800">{partner.fleet ?? '—'}</p>
              <p className="text-xs text-slate-400 font-medium">Vehicles</p>
            </div>
            <div className="p-5 text-center">
              <Users size={18} className="text-indigo-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-slate-800">{partner.drivers ?? '—'}</p>
              <p className="text-xs text-slate-400 font-medium">Drivers</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left */}
            <div className="space-y-4">
              {partner.legal_type && (
                <div className="flex items-start gap-3">
                  <Building2 size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Organisation Type</p>
                    <p className="text-sm font-semibold text-slate-800">{partner.legal_type}</p>
                  </div>
                </div>
              )}
              {partner.address && (
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Registered Address</p>
                    <p className="text-sm text-slate-700">{partner.address}</p>
                  </div>
                </div>
              )}
              {partner.contact_person && (
                <div className="flex items-start gap-3">
                  <Phone size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Contact</p>
                    <p className="text-sm font-semibold text-slate-800">{partner.contact_person}</p>
                    {partner.mobile && (
                      <p className="text-xs text-slate-500 font-mono">{partner.mobile}</p>
                    )}
                  </div>
                </div>
              )}
              {partner.email && (
                <div className="flex items-start gap-3">
                  <Mail size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Email</p>
                    <a href={`mailto:${partner.email}`} className="text-sm text-indigo-600 hover:underline">
                      {partner.email}
                    </a>
                  </div>
                </div>
              )}
              {partner.website && (
                <div className="flex items-start gap-3">
                  <Globe size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Website</p>
                    <a href={partner.website} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">
                      {partner.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Right */}
            <div className="space-y-4">
              {(partner.gst || partner.pan || partner.cin) && (
                <div className="flex items-start gap-3">
                  <FileText size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Legal Identifiers</p>
                    {partner.gst && <p className="text-sm font-mono text-slate-700">GST: {partner.gst}</p>}
                    {partner.pan && <p className="text-sm font-mono text-slate-700">PAN: {partner.pan}</p>}
                    {partner.cin && <p className="text-sm font-mono text-slate-700">CIN: {partner.cin}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* About */}
          {partner.about && (
            <div className="px-8 pb-8">
              <h3 className="text-sm font-bold text-slate-700 mb-2">About</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{partner.about}</p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <button onClick={() => navigate('/partners')} className="text-sm text-slate-400 hover:text-indigo-600 font-medium">
            ← All Partners
          </button>
        </div>
      </main>
    </div>
  );
}

// ── Partner Listing Page ──────────────────────────────────────────────────────
function PartnerListing() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch(`${API}/api/config/partners`)
      .then(r => r.json())
      .then(d => { if (d.success) setPartners(d.partners || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-white border-b border-slate-100 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Truck size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800">Fleet Partners</h1>
            <p className="text-xs text-slate-400">Verified fleets running on MobilityGrid</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="text-indigo-400 animate-spin" />
          </div>
        ) : partners.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-12">No partners listed yet.</p>
        ) : (
          partners.map(p => (
            <button
              key={p.partner_slug}
              onClick={() => navigate(`/partners/${p.partner_slug}`)}
              className="w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 text-left hover:border-indigo-300 hover:shadow-sm transition"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                {initials(p.brand_name || p.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800 text-sm">{p.full_name}</p>
                {p.tagline && <p className="text-xs text-slate-400 truncate mt-0.5">{p.tagline}</p>}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <CheckCircle size={10} className="text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-bold">
                    {p.partner_status === 'ACTIVE' ? 'Active' : p.partner_status}
                  </span>
                  {p.since_year && (
                    <>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">Since {p.since_year}</span>
                    </>
                  )}
                  {p.vehicle_count > 0 && (
                    <>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{p.vehicle_count} vehicles</span>
                    </>
                  )}
                </div>
              </div>
              <ArrowLeft size={14} className="text-slate-300 rotate-180 shrink-0" />
            </button>
          ))
        )}

        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-5 text-center">
          <p className="text-sm font-black text-indigo-800 mb-1">Want to list your fleet?</p>
          <p className="text-xs text-indigo-500 mb-3">Get on the MobilityGrid partner network</p>
          <a
            href="https://mobilitygrid.in#contact"
            className="inline-block px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition"
          >
            Express Interest
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function PartnersPage() {
  const { slug } = useParams();
  return slug ? <PartnerDetail slug={slug} /> : <PartnerListing />;
}
