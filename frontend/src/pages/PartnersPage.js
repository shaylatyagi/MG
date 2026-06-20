// frontend/src/pages/PartnersPage.js
// /partners        → listing
// /partners/:slug  → detail
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, FileText, MapPin, Truck, Users, CheckCircle, ExternalLink, Mail } from 'lucide-react';

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
    website:   'https://www.ev4rent.co.in',
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
];

const PARTNER_MAP = Object.fromEntries(PARTNERS.map(p => [p.slug, p]));

const InfoRow = ({ icon: Icon, label, value, mono }) =>
  value ? (
    <div className="px-4 py-3.5 flex items-center gap-3">
      <Icon size={15} className="text-slate-400 shrink-0" />
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className={`text-sm font-semibold text-slate-800 ${mono ? 'font-mono tracking-wider' : ''}`}>{value}</p>
      </div>
    </div>
  ) : null;
function PartnerDetail({ slug }) {
  const navigate = useNavigate();
  // Hum slug ko trim kar rahe hain taaki koi extra space issue na ho
  const cleanSlug = slug ? slug.trim() : "";
  const p = PARTNER_MAP[cleanSlug];

  if (!p) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6">
      <p className="font-black text-slate-800 text-lg">Partner '{cleanSlug}' not found</p>
      <button 
        onClick={() => {
            const isSubdomain = window.location.hostname === 'partners.mobilitygrid.in';
            navigate(isSubdomain ? '/' : '/partners');
        }} 
        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold"
      >
        View All Partners
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 bg-white border-b border-slate-100 z-10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/partners')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <span className="font-black text-slate-800 text-sm">{p.name}</span>
        <span className="ml-auto text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">{p.status}</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className={`bg-gradient-to-br ${p.gradient} rounded-2xl p-6 text-white`}>
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-black mb-4">{p.avatar}</div>
          <h1 className="text-xl font-black mb-1">{p.name}</h1>
          <p className="text-white/70 text-sm mb-4">{p.tagline}</p>
          <div className="flex flex-wrap gap-2">
            {p.tags.map(tag => (
              <span key={tag} className="text-xs font-semibold bg-white/15 px-2.5 py-1 rounded-full">{tag}</span>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-white/70 text-xs font-semibold">
            <CheckCircle size={13} /> Verified Partner · Since {p.since}
          </div>
        </div>

        <div className="bg-white rounded-2xl px-4 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">About</p>
          <p className="text-sm text-slate-700 leading-relaxed">{p.about}</p>
        </div>

        <div className="bg-white rounded-2xl divide-y divide-slate-100">
          <InfoRow icon={Phone}    label="Contact"          value={p.contact} />
          <InfoRow icon={Phone}    label="Mobile"           value={p.mobile} />
          <InfoRow icon={Mail}     label="Email"            value={p.email} />
          <InfoRow icon={FileText} label="Legal Type"       value={p.legalType} />
          <InfoRow icon={FileText} label="Category"         value={p.category} />
          <InfoRow icon={FileText} label="GST Number"       value={p.gst}      mono />
          <InfoRow icon={FileText} label="PAN"              value={p.pan}      mono />
          <InfoRow icon={FileText} label="CIN / LLPIN"      value={p.cin}      mono />
          <InfoRow icon={FileText} label="Annual Turnover"  value={p.turnover} />
          <InfoRow icon={MapPin}   label="Registered Address" value={p.location} />
          <InfoRow icon={Truck}    label="Fleet Size"       value={p.fleet ? `${p.fleet} vehicles` : null} />
          <InfoRow icon={Users}    label="Drivers"          value={p.drivers ? `${p.drivers} active riders` : null} />
          {p.website && (
            <a href={p.website} target="_blank" rel="noopener noreferrer"
              className="px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition">
              <ExternalLink size={15} className="text-slate-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-medium">Website</p>
                <p className="text-sm font-semibold text-indigo-600">{p.website}</p>
              </div>
            </a>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 pb-4">Powered by MobilityGrid</p>
      </div>
    </div>
  );
}

function PartnerListing() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-4 py-4">
        <button onClick={() => window.location.href = 'https://mobilitygrid.in'} className="flex items-center gap-1.5 text-slate-500 text-sm mb-4 hover:text-slate-700 transition">
          <ArrowLeft size={15} /> mobilitygrid.in
        </button>
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
  onClick={(e) => {
    e.preventDefault();
    const isSubdomain = window.location.hostname === 'partners.mobilitygrid.in';
    const target = isSubdomain ? `/${p.slug}` : `/partners/${p.slug}`;
    navigate(target);
  }}
            className="w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 text-left hover:border-indigo-300 hover:shadow-sm transition">
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
          <p className="text-xs text-indigo-500 mb-3"> · Get on MobilityGrid partner directory</p>
          <a href="mailto:mailto:mobilitygrid@gmail.com"
  style={{
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    textDecoration: 'none',
    fontWeight: '900',
    fontSize: '12px',
    borderRadius: '12px',
    pointerEvents: 'auto'
  }}>
  Contact Us
</a>
        </div>
      </div>
    </div>
  );
}

export default function PartnersPage() {
  const { slug } = useParams();
  return slug ? <PartnerDetail slug={slug} /> : <PartnerListing />;
}
