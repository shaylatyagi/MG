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
  // Slug ko decode aur clean karein
  const cleanSlug = slug ? slug.toLowerCase().trim() : "";
  const p = PARTNERS.find(item => item.slug === cleanSlug);
  // PAN Masking Logic
const maskPan = (pan) => {
  if (!pan) return 'N/A';
  return '*****' + pan.slice(-5); // Sirf last 5 digits dikhayega
};

// Rendering in JSX
<div className="space-y-4">
  <p><strong>Organisation:</strong> {p.name}</p>
  <p><strong>PAN:</strong> {maskPan(p.pan)}</p>
  
  {/* Website removal: Simply delete or comment out the website link block below */}
  {/* 
  <a href={partner.website} target="_blank" rel="noreferrer">
     Visit Website
  </a> 
  */}
</div>
  if (!p) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <p className="font-black text-slate-800 text-lg mb-4">Partner details nahi mil rahe.</p>
      <button 
        onClick={() => window.location.href = 'https://partners.mobilitygrid.in'} 
        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold"
      >
        Sabhi Partners dekhein
      </button>
    </div>
  );

  // ... baaki ka return code waisa hi rahega

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* 1. Header Match: LandingPage jaisa */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="https://mobilitygrid.in" className="text-xl font-black tracking-tighter text-slate-900">
            Mobility<span className="text-indigo-600">Grid</span>
          </a>
          <a href="https://mobilitygrid.in" className="px-5 py-2 bg-slate-900 text-white rounded-full text-xs font-bold hover:bg-indigo-600 transition">
            Back to Home
          </a>
        </div>
      </nav>

      {/* 2. Content Container */}
      <main className="pt-32 pb-20 px-6 max-w-3xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight">Fleet Partners</h1>
          <p className="text-slate-500 text-lg">Verified fleets running on our infrastructure</p>
        </div>

        <div className="grid gap-6">
          {PARTNERS.map(p => (
            <button 
              key={p.slug} 
              onClick={() => window.location.href = `https://partners.mobilitygrid.in/${p.slug}`}
              className="group w-full bg-white border border-slate-200 rounded-3xl p-8 flex items-center gap-6 text-left hover:shadow-xl hover:border-indigo-200 transition-all duration-300"
            >
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-sm ${p.gradient}`}>
                {p.avatar}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition">{p.name}</h3>
                <p className="text-slate-500 mt-1">{p.tagline}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition">
                <ArrowLeft size={18} className="rotate-180 text-slate-400 group-hover:text-indigo-600" />
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

function PartnerListing() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-4 py-4">
        <button onClick={() => window.location.href = 'https://mobilitygrid.in'} className="flex items-center gap-1.5 text-slate-500 text-sm mb-4 hover:text-slate-700 transition">
          <ArrowLeft size={15} /> 
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
  
  // Sahi tarika: hostname mein https:// nahi hota
  const isSubdomain = window.location.hostname === 'partners.mobilitygrid.in';
  
  // Logic: Agar subdomain pe hain toh sirf /slug, nahi toh seedha redirect
  if (isSubdomain) {
    navigate(`/${p.slug}`);
  } else {
    // Agar main domain pe hain, toh seedha subdomain pe bhej do (Professional approach)
    window.location.href = `https://partners.mobilitygrid.in/${p.slug}`;
  }
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
          <a href="mailto:mobilitygrid@gmail.com"
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
