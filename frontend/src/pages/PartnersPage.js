import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, FileText, MapPin, Truck, Users, CheckCircle, ExternalLink, Mail, Building2, Calendar, Award } from 'lucide-react';

const PARTNERS = [
  {
    slug:      'recoverynest',
    name:      'Recovery Nest LLP',
    brand:     'EV4Rent',
    tagline:   'E-Bike Rental & Fleet Operations · Ghaziabad, UP',
    avatar:    'RN',
    gradient:  'from-blue-700 to-blue-500',
    location:  '271, Shakti Khand-04, Indirapuram, Ghaziabad – 201014, Uttar Pradesh',
    mobile:    '+91 98997 15718',
    email:     'business@recoverynest.in',
    gst:       '09ABLFR5375B1ZY',
    pan:       'ABLFR5375B',
    cin:       'ACO-8282',
    fleet:     74,
    drivers:   29,
    turnover:  '₹36 Lakh / year',
    category:  'E-Bike Rental Service Provider',
    legalType: 'Partnership LLP',
    contact:   'Mukesh Kumar (Partner) · +91 98997 15718',
    about:     'Recovery Nest LLP (brand: EV4Rent) is a Ghaziabad-based electric two-wheeler rental fleet. They operate 74 EVs — Dangus Pro and Swift Volt models — deployed to delivery riders across NCR. Onboarded on MobilityGrid for digital rent collection, driver KYC, and fleet tracking.',
    status:    'Active Partner',
    since:     '2026',
    tags:      ['EV Fleet', 'E-Bike Rental', 'Delivery Logistics', 'NCR'],
  },
  // Add more partners here later
];

const maskPan = (pan) => {
  if (!pan) return 'N/A';
  return '*****' + pan.slice(-5);
};

// ── Partner Detail Component ────────────────────────────────────────────────
function PartnerDetail({ slug }) {
  const navigate = useNavigate();
  const cleanSlug = slug?.toLowerCase().trim() || '';
  const partner = PARTNERS.find(p => p.slug === cleanSlug);

  if (!partner) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <p className="font-black text-slate-800 text-lg mb-4">Partner details nahi mil rahe.</p>
        <button 
          onClick={() => navigate('/')} 
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
        >
          Sabhi Partners dekhein
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="https://mobilitygrid.in" className="text-xl font-black tracking-tighter text-slate-900">
            Mobility<span className="text-indigo-600">Grid</span>
          </a>
          <button 
            onClick={() => navigate('/')}
            className="px-5 py-2 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-indigo-600 transition"
          >
            ← Back to Partners
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-md border border-slate-200 overflow-hidden">
          {/* Hero */}
          <div className={`bg-gradient-to-r ${partner.gradient} p-8 text-white`}>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-black shadow-lg">
                {partner.avatar}
              </div>
              <div>
                <h1 className="text-3xl font-extrabold">{partner.name}</h1>
                <p className="text-white/80 text-sm mt-1">{partner.tagline}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="bg-emerald-500/30 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle size={14} /> {partner.status}
                  </span>
                  <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Calendar size={14} /> Since {partner.since}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 size={18} className="text-indigo-600 mt-1" />
                <div>
                  <p className="text-xs text-slate-400 font-medium">Organisation Type</p>
                  <p className="text-sm font-semibold text-slate-800">{partner.legalType}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-indigo-600 mt-1" />
                <div>
                  <p className="text-xs text-slate-400 font-medium">Registered Address</p>
                  <p className="text-sm text-slate-700">{partner.location}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={18} className="text-indigo-600 mt-1" />
                <div>
                  <p className="text-xs text-slate-400 font-medium">Contact</p>
                  <p className="text-sm font-semibold text-slate-800">{partner.contact}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-indigo-600 mt-1" />
                <div>
                  <p className="text-xs text-slate-400 font-medium">Email</p>
                  <a href={`mailto:${partner.email}`} className="text-sm text-indigo-600 hover:underline font-medium">
                    {partner.email}
                  </a>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FileText size={18} className="text-indigo-600 mt-1" />
                <div>
                  <p className="text-xs text-slate-400 font-medium">GST / PAN / CIN</p>
                  <p className="text-sm font-mono text-slate-700">{partner.gst}</p>
                  <p className="text-sm font-mono text-slate-700">PAN: {maskPan(partner.pan)}</p>
                  <p className="text-sm font-mono text-slate-700">CIN: {partner.cin}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Truck size={18} className="text-indigo-600 mt-1" />
                <div>
                  <p className="text-xs text-slate-400 font-medium">Fleet & Drivers</p>
                  <p className="text-sm font-semibold text-slate-800">{partner.fleet} vehicles · {partner.drivers} drivers</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Award size={18} className="text-indigo-600 mt-1" />
                <div>
                  <p className="text-xs text-slate-400 font-medium">Annual Turnover</p>
                  <p className="text-sm font-bold text-slate-800">{partner.turnover}</p>
                </div>
              </div>
            </div>
          </div>

          {/* About & Tags */}
          <div className="px-8 pb-8">
            <h3 className="text-sm font-bold text-slate-700 mb-2">About</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{partner.about}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {partner.tags.map((tag, i) => (
                <span key={i} className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Back button (extra) */}
        <div className="mt-6 text-center">
          <button 
            onClick={() => navigate('/')}
            className="text-sm text-slate-400 hover:text-indigo-600 transition font-medium"
          >
            ← Back to all partners
          </button>
        </div>
      </main>
    </div>
  );
}

// ── Partner Listing ──────────────────────────────────────────────────────────
function PartnerListing() {
  const navigate = useNavigate();

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
        {PARTNERS.map(p => (
          <button 
            key={p.slug} 
            onClick={() => navigate(`/${p.slug}`)}
            className="w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 text-left hover:border-indigo-300 hover:shadow-sm transition"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center text-white font-black text-sm shrink-0`}>
              {p.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-slate-800 text-sm">{p.name}</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{p.tagline}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <CheckCircle size={10} className="text-emerald-500" />
                <span className="text-xs text-emerald-600 font-bold">{p.status}</span>
                <span className="text-xs text-slate-300">·</span>
                <span className="text-xs text-slate-400">Since {p.since}</span>
              </div>
            </div>
            <ArrowLeft size={14} className="text-slate-300 rotate-180 shrink-0" />
          </button>
        ))}

        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-5 text-center">
          <p className="text-sm font-black text-indigo-800 mb-1">Want to list your fleet?</p>
          <p className="text-xs text-indigo-500 mb-3">· Get on MobilityGrid partner directory</p>
          <a 
            href="mailto:mobilitygrid@gmail.com"
            className="inline-block px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition"
          >
            Contact Us
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Main Export ──────────────────────────────────────────────────────────────
export default function PartnersPage() {
  const { slug } = useParams();
  return slug ? <PartnerDetail slug={slug} /> : <PartnerListing />;
}