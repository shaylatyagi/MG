import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';
import { BrandLogo } from '../hooks/useBranding';

function LandingPage() {
  const [navScrolled, setNavScrolled] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    role: '',
    fleet: '',
    city: '',
    type: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState('admin');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [landingPartners, setLandingPartners] = useState([]);

  useEffect(() => {
    const API = process.env.REACT_APP_API_URL || 'https://mg-qw5s.onrender.com';
    fetch(`${API}/api/config/partners`)
      .then(r => r.json())
      .then(d => { if (d.success) setLandingPartners(d.partners || []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (submitted) {
      const successCard = document.getElementById('successCard');
      successCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [submitted]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const phone = formData.phone.trim();
    if (!/^[0-9]{10}$/.test(phone)) {
      alert('Please enter a valid 10-digit WhatsApp number.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name: formData.name.trim(),
      phone,
      email: formData.email.trim() || undefined,
      company: formData.company.trim(),
      role: formData.role,
      fleet: formData.fleet,
      city: formData.city.trim(),
      type: formData.type,
      ts: new Date().toISOString(),
    };

    try {
      await fetch('https://mg-qw5s.onrender.com/api/auth/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (_) {
      // ignore network errors for now
    }

    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <>
      <div id="page-top" style={{ position: 'absolute', top: 0 }} />
      <nav id="nav" className={navScrolled ? 'scrolled' : ''}>
        <div className="nav-inner">
          <Link to="/" className="nav-logo" onClick={() => { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; }}>
            <BrandLogo variant="cyan" height={31} alt="MobilityGrid" />
          </Link>
          <div className="nav-links">
            <a href="#vision" className="nav-link">Vision</a>
            <a href="#gaps" className="nav-link">Problems</a>
            <a href="#solutions" className="nav-link">Solutions</a>
            <a href="#how" className="nav-link">How it Works</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="https://partners.mobilitygrid.in" className="nav-link" target="_blank" rel="noopener noreferrer">Partners</a>
          </div>
          <div className="nav-actions">
            <a href="#signup" className="btn btn-primary btn-sm">Get Early Access</a>
          </div>
          <button
            className={`hamburger${mobileMenuOpen ? ' open' : ''}`}
            aria-label="Toggle menu"
            onClick={() => setMobileMenuOpen(o => !o)}
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div className={`mobile-drawer${mobileMenuOpen ? ' open' : ''}`}>
        <div className="mobile-drawer-inner">
          <a href="#vision"   className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Vision</a>
          <a href="#gaps"     className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Problems</a>
          <a href="#solutions"  className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Solutions</a>
          <a href="#how"      className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>How it Works</a>
          <a href="#pricing"  className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
          <a href="https://partners.mobilitygrid.in" className="mobile-nav-link" target="_blank" rel="noopener noreferrer" onClick={() => setMobileMenuOpen(false)}>Partners</a>
          <a href="#signup"   className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setMobileMenuOpen(false)}>Get Early Access</a>
        </div>
      </div>

      <section className="hero">
        <div className="hero-split">
          <div className="hero-left">
            <div className="hero-badge">
              <div className="hero-badge-dot" />
              <span className="hero-badge-text">Now in private beta · Onboarding fleets across India</span>
            </div>
            <h1>
              The Operating<br />
              System for India's<br />
              <em>Fleet Operations</em>
            </h1>
            <p className="hero-sub">
              Digital rent collection, driver KYC, fleet management, and earnings tracking. Built from the ground up for how India's gig workforce actually lives and works.
            </p>
            <div className="hero-ctas">
              <a href="#signup" className="btn btn-primary btn-lg">Get Early Access</a>
              <Link to="/login" className="btn btn-outline-light btn-lg">See the solutions</Link>
            </div>
          </div>
          <div className="hero-right">
          <div className="preview-glow" />
          <div className="browser-mock" aria-hidden="true">
            <div className="browser-bar">
              <div className="browser-dots">
                <div className="browser-dot" style={{ background: '#ef4444' }} />
                <div className="browser-dot" style={{ background: '#f59e0b' }} />
                <div className="browser-dot" style={{ background: '#22c55e' }} />
              </div>
              <div className="browser-url">app.mobilitygrid.in/admin/dashboard</div>
            </div>
            <div className="admin-mock">
              <div className="admin-sidebar-mock">
                <div className="mock-logo-row">
                  <div className="mock-logo-name">MobilityGrid</div>
                  <div className="mock-logo-sub">Super Admin</div>
                </div>
                <div className="mock-nav-item active"><div className="mock-nav-icon" /> Dashboard</div>
                <div className="mock-nav-item"><div className="mock-nav-icon" /> Companies</div>
                <div className="mock-nav-item"><div className="mock-nav-icon" /> KYC Review</div>
                <div className="mock-nav-item"><div className="mock-nav-icon" /> All Drivers</div>
              </div>
              <div className="admin-main-mock">
                <div className="mock-page-title">Platform Overview</div>
                <div className="mock-page-sub">Sunday, 7 June 2026</div>
                <div className="mock-stats-row">
                  <div className="mock-stat"><div className="mock-stat-val">24</div><div className="mock-stat-lbl">Companies</div></div>
                  <div className="mock-stat"><div className="mock-stat-val blue">312</div><div className="mock-stat-lbl">Fleet Owners</div></div>
                  <div className="mock-stat"><div className="mock-stat-val">1,840</div><div className="mock-stat-lbl">Drivers</div></div>
                  <div className="mock-stat"><div className="mock-stat-val green">₹8.4L</div><div className="mock-stat-lbl">This Month</div></div>
                </div>
                <div className="mock-table">
                  <div className="mock-table-hdr">
                    <span className="mock-th">Company</span>
                    <span className="mock-th">Drivers</span>
                    <span className="mock-th">Collection</span>
                    <span className="mock-th">Status</span>
                  </div>
                  <div className="mock-table-row">
                    <span className="mock-td">Rajesh EV Fleet</span>
                    <span className="mock-td">48</span>
                    <span className="mock-td">₹96,000</span>
                    <span className="mock-td"><span className="mock-badge green">Active</span></span>
                  </div>
                  <div className="mock-table-row">
                    <span className="mock-td">Metro Autos Pvt</span>
                    <span className="mock-td">22</span>
                    <span className="mock-td">₹41,800</span>
                    <span className="mock-td"><span className="mock-badge amber">KYC Pending</span></span>
                  </div>
                  <div className="mock-table-row">
                    <span className="mock-td">CityRide Solutions</span>
                    <span className="mock-td">76</span>
                    <span className="mock-td">₹1.52L</span>
                    <span className="mock-td"><span className="mock-badge indigo">Reviewing</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>

      <div className="trust-bar">
        <div className="trust-inner">
          <span className="trust-label">Built for India's fleet operations</span>
          <div className="trust-divider" />
          <div className="trust-stat"><div className="trust-stat-val">Any Scale</div><div className="trust-stat-lbl">Small fleet to enterprise</div></div>
          <div className="trust-divider" />
          <div className="trust-stat"><div className="trust-stat-val">UPI</div><div className="trust-stat-lbl">Verified digital collections</div></div>
          <div className="trust-divider" />
          <div className="trust-stat"><div className="trust-stat-val">Real-time</div><div className="trust-stat-lbl">Live fleet visibility</div></div>
          <div className="trust-divider" />
          <div className="trust-stat"><div className="trust-stat-val">EN / HI</div><div className="trust-stat-lbl">Multi-language support</div></div>
          <div className="trust-divider" />
          <div className="trust-stat"><div className="trust-stat-val">24 hrs</div><div className="trust-stat-lbl">Fleet onboarding time</div></div>
        </div>
      </div>

<section className="vm-section" id="vision">
        <div className="container">
          <div className="vm-grid">
            <div>
              <div className="vm-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
                <div className="vm-card">
                  <div className="vm-card-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 2v3m0 14v3M2 12h3m14 0h3m-3.5-6.5-2.12 2.12M6.62 17.38l-2.12 2.12M17.38 17.38l2.12 2.12M4.5 6.5l2.12 2.12" />
                    </svg>
                  </div>
                  <h2 className="vm-card-title">Our Vision</h2>
                  <p>A world where every fleet operator and gig worker in India has the infrastructure, visibility, and tools to build a financially secure livelihood. On their own terms.</p>
                </div>
                <div className="vm-card" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)' }}>
                  <div className="vm-card-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <h2 className="vm-card-title">Our Mission</h2>
                  <p>To close the three structural gaps (Time, Payment, and Asset) that hold India's gig workforce back, by building an operating ecosystem designed entirely around how they actually earn and live.</p>
                </div>
              </div>
            </div>
            <div className="vm-text">
              <p className="section-label">Why We Exist</p>
              <h2 className="display" style={{ marginBottom: '24px' }}>Most people see the <em>convenience.</em></h2>
              <p>Every day, millions of drivers, riders, and logistics workers power the Indian city: delivering food, ferrying passengers, moving goods. They are the circulatory system of the modern urban economy.</p>
              <p>Yet the infrastructure built around them was never truly designed for <strong>how they live and work</strong>. Fleet operators, often small business owners managing 5 to 500 vehicles, carry enormous operational weight on fragmented, manual systems: WhatsApp messages, paper ledgers, and disconnected spreadsheets.</p>
              <p>We spent months listening to the ground truth. What we found is not a technology problem. It is a <strong>design problem</strong>. The solutionss built for this workforce were designed around the platform's convenience, not the person doing the work.</p>
              <p>MobilityGrid is our answer to that.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="gaps-section" id="gaps">
        <div className="container">
          <div className="gaps-header">
            <p className="section-label">The Problems</p>
            <h2 className="display">Three gaps that define the challenge</h2>
            <p>Through months of direct research, we identified three structural mismatches that compound into a system that consistently fails both the operator and the driver.</p>
          </div>

          <div className="gaps-grid">
            <div className="gap-card">
              <span className="gap-num">01</span>
              <div className="gap-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <div className="gap-label">Time Gap</div>
              <div className="gap-title">Daily earners in a monthly financial system</div>
              <div className="gap-body">A driver earns every day. But traditional finance, collections, and settlements are built around monthly cycles. That mismatch creates friction, missed collections, and uncertainty for everyone.</div>
            </div>
            <div className="gap-card">
              <span className="gap-num">02</span>
              <div className="gap-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              </div>
              <div className="gap-label">Payment Gap</div>
              <div className="gap-title">Fluid income, rigid collection systems</div>
              <div className="gap-body">Drivers live in daily cash flow. Fleet owners still use paper records, manual reminders, or one-size-fits-all billing systems that break trust and trigger defaults.</div>
            </div>
            <div className="gap-card">
              <span className="gap-num">03</span>
              <div className="gap-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="gap-label">Asset Gap</div>
              <div className="gap-title">A vehicle is their livelihood, not their own</div>
              <div className="gap-body">A driver's vehicle is their primary asset. But assignment, documentation, and payment responsibility remain fragmented across WhatsApp, paper, and disconnected systems.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="solutions-section" id="solutions">
        <div className="container">
          <div className="solutions-header">
            <p className="section-label">Problems</p>
            <h2 className="display">One ecosystem. <em>Three stakeholders.</em></h2>
            <p>MobilityGrid is not a single app. It is a coordinated operating system with purpose-built interfaces for every actor in the fleet.</p>
          </div>

          <div className="solutions-tabs">
            <button type="button" className={`ptab ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
              <span className="ptab-dot" /> Super Admin Console
            </button>
            <button type="button" className={`ptab ${activeTab === 'owner' ? 'active' : ''}`} onClick={() => setActiveTab('owner')}>
              <span className="ptab-dot" /> Fleet Owner Dashboard
            </button>
            <button type="button" className={`ptab ${activeTab === 'driver' ? 'active' : ''}`} onClick={() => setActiveTab('driver')}>
              <span className="ptab-dot" /> Driver Terminal
            </button>
          </div>

          <div className="solutions-panels">
            <div className={`solutions-panel ${activeTab === 'admin' ? 'active' : ''}`}>
              <div className="panel-content">
                <span className="tag tag-indigo">Super Admin</span>
                <h3>Full platform oversight from one console</h3>
                <p>The Super Admin Console gives the MobilityGrid team complete visibility over every company, fleet owner, driver, and payment on the platform. With tools to onboard, approve, and monitor at scale.</p>
                <ul className="panel-features">
                  <li className="panel-feature"><span className="pf-check">✓</span>Company onboarding and fleet operator management</li>
                  <li className="panel-feature"><span className="pf-check">✓</span>Driver KYC review queue: Aadhaar, PAN, DL, Bank</li>
                  <li className="panel-feature"><span className="pf-check">✓</span>Real-time platform GMV and collections dashboard</li>
                  <li className="panel-feature"><span className="pf-check">✓</span>Cross-fleet driver and vehicle registry</li>
                  <li className="panel-feature"><span className="pf-check">✓</span>Role-based access: admin, manager, read-only</li>
                </ul>
              </div>
              <div className="panel-visual">
                <div className="browser-mock" style={{ boxShadow: '0 24px 64px rgba(15, 23, 42, 0.16)' }}>
                  <div className="browser-bar">
                    <div className="browser-dots">
                      <div className="browser-dot" style={{ background: '#ef4444' }} />
                      <div className="browser-dot" style={{ background: '#f59e0b' }} />
                      <div className="browser-dot" style={{ background: '#22c55e' }} />
                    </div>
                    <div className="browser-url">app.mobilitygrid.in/admin/kyc</div>
                  </div>
                  <div className="admin-mock" style={{ minHeight: '280px' }}>
                    <div className="admin-sidebar-mock">
                      <div className="mock-logo-row">
                        <div className="mock-logo-name">MobilityGrid</div>
                        <div className="mock-logo-sub">Super Admin</div>
                      </div>
                      <div className="mock-nav-item">Dashboard</div>
                      <div className="mock-nav-item">Companies</div>
                      <div className="mock-nav-item active">KYC Review</div>
                      <div className="mock-nav-item">All Drivers</div>
                    </div>
                    <div className="admin-main-mock" style={{ padding: '16px' }}>
                      <div className="mock-page-title">KYC Review Queue</div>
                      <div className="mock-page-sub">14 pending · 3 under review</div>
                      <div className="mock-table" style={{ marginTop: '12px' }}>
                        <div className="mock-table-hdr">
                          <span className="mock-th">Driver</span>
                          <span className="mock-th">Document</span>
                          <span className="mock-th">Status</span>
                          <span className="mock-th">Action</span>
                        </div>
                        <div className="mock-table-row">
                          <span className="mock-td">Santosh Kumar</span>
                          <span className="mock-td">Aadhaar</span>
                          <span className="mock-td"><span className="mock-badge amber">Pending</span></span>
                          <span className="mock-td" style={{ color: '#4f46e5' }}>Review →</span>
                        </div>
                        <div className="mock-table-row">
                          <span className="mock-td">Pradeep Yadav</span>
                          <span className="mock-td">DL + PAN</span>
                          <span className="mock-td"><span className="mock-badge indigo">Review</span></span>
                          <span className="mock-td" style={{ color: '#4f46e5' }}>Review →</span>
                        </div>
                        <div className="mock-table-row">
                          <span className="mock-td">Ramesh Singh</span>
                          <span className="mock-td">Bank A/C</span>
                          <span className="mock-td"><span className="mock-badge green">Verified</span></span>
                          <span className="mock-td" style={{ color: '#64748b' }}>Done</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`solutions-panel ${activeTab === 'owner' ? 'active' : ''}`}>
              <div className="panel-content">
                <span className="tag tag-gold">Fleet Owner</span>
                <h3>Complete fleet visibility, zero spreadsheets</h3>
                <p>The Fleet Owner Dashboard replaces WhatsApp groups, paper ledgers, and Excel files with one single source of truth. Every operator can see exactly who has paid, who hasn't, and what their fleet is worth today.</p>
                <ul className="panel-features">
                  <li className="panel-feature"><span className="pf-check">✓</span>Live dashboard: vehicles, drivers, outstanding dues</li>
                  <li className="panel-feature"><span className="pf-check">✓</span>UPI payment links you can send directly to drivers via WhatsApp</li>
                  <li className="panel-feature"><span className="pf-check">✓</span>Transaction history with driver-wise breakdown</li>
                  <li className="panel-feature"><span className="pf-check">✓</span>Driver onboarding with agreement upload and address verification</li>
                  <li className="panel-feature"><span className="pf-check">✓</span>Vehicle assignment and daily rent tracking</li>
                </ul>
              </div>
              <div className="panel-visual">
                <div className="owner-mock">
                  <div className="om-header">
                    <div>
                      <div className="om-title">Fleet Dashboard</div>
                      <div className="om-sub">June 2026 · 23 active drivers</div>
                    </div>
                    <div className="om-badge">● Live</div>
                  </div>
                  <div className="om-body">
                    <div className="om-stats">
                      <div className="om-stat"><div className="om-stat-val indigo">₹46,200</div><div className="om-stat-lbl">Collected · June</div></div>
                      <div className="om-stat"><div className="om-stat-val" style={{ color: '#dc2626' }}>₹8,400</div><div className="om-stat-lbl">Outstanding</div></div>
                      <div className="om-stat"><div className="om-stat-val green">19 / 23</div><div className="om-stat-lbl">Paid this month</div></div>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', color: '#64748b', marginBottom: '10px' }}>Recent Drivers</div>
                    <div className="om-driver-row">
                      <div className="om-avatar">RK</div>
                      <div><div className="om-driver-name">Ravi Kumar</div><div className="om-driver-sub">KA 01 EV 2201</div></div>
                      <div className="om-driver-amt">₹2,000<span className="om-driver-status paid">Paid</span></div>
                    </div>
                    <div className="om-driver-row">
                      <div className="om-avatar" style={{ background: '#7c3aed' }}>SP</div>
                      <div><div className="om-driver-name">Suresh Patil</div><div className="om-driver-sub">KA 05 EV 1148</div></div>
                      <div className="om-driver-amt">₹2,000<span className="om-driver-status pending">Due</span></div>
                    </div>
                    <div className="om-driver-row">
                      <div className="om-avatar" style={{ background: '#0f766e' }}>MR</div>
                      <div><div className="om-driver-name">Mohan Reddy</div><div className="om-driver-sub">KA 02 EV 0890</div></div>
                      <div className="om-driver-amt">₹1,800<span className="om-driver-status paid">Paid</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`solutions-panel ${activeTab === 'driver' ? 'active' : ''}`}>
              <div className="panel-content">
                <span className="tag tag-slate">Driver</span>
                <h3>Your earnings, your vehicle, your future</h3>
                <p>The Driver Terminal is a mobile-first app designed for low-end Android devices and 2G/3G networks. It gives every driver full transparency into their financial relationship with their fleet, in English and Hindi.</p>
                <ul className="panel-features">
                  <li className="panel-feature"><span className="pf-check">✓</span>Wallet balance, daily dues, and outstanding amount</li>
                  <li className="panel-feature"><span className="pf-check">✓</span>Pay rent instantly via UPI, any amount, any time</li>
                  <li className="panel-feature"><span className="pf-check">✓</span>Private earnings tracker, visible only to the driver</li>
                  <li className="panel-feature"><span className="pf-check">✓</span>KYC document upload: Aadhaar, PAN, Driving Licence</li>
                  <li className="panel-feature"><span className="pf-check">✓</span>Full transaction history with downloadable receipts</li>
                </ul>
              </div>
              <div className="panel-visual" style={{ display: 'flex', justifyContent: 'center' }}>
                <div className="phone-mock">
                  <div className="phone-notch">
                    <div className="phone-notch-bar" />
                  </div>
                  <div className="phone-screen">
                    <div className="phone-header">
                      <div className="ph-name">Driver Terminal</div>
                      <div className="ph-role">Santosh Kumar · KA 01 EV 2201</div>
                    </div>
                    <div className="phone-body">
                      <div className="wallet-card">
                        <div className="wc-label">Wallet Balance</div>
                        <div className="wc-amount">₹1,240</div>
                        <div className="wc-due">Due this cycle: ₹2,000</div>
                        <div className="wc-actions">
                          <div className="wc-btn">Pay Now</div>
                          <div className="wc-btn">Withdraw</div>
                          <div className="wc-btn">History</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: '#64748b', marginBottom: '8px' }}>My Earnings · June</div>
                      <div className="phone-list-item">
                        <div className="pli-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2"><path d="M12 2v20m5-17H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                        </div>
                        <div className="pli-main">
                          <div className="pli-title">Today's Earnings</div>
                          <div className="pli-sub">3 trips · 7 hrs active</div>
                        </div>
                        <div className="pli-amount green">+₹820</div>
                      </div>
                      <div className="phone-list-item">
                        <div className="pli-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
                        </div>
                        <div className="pli-main">
                          <div className="pli-title">Rent paid · Jun 5</div>
                          <div className="pli-sub">UPI · MobilityGrid</div>
                        </div>
                        <div className="pli-amount" style={{ color: '#dc2626' }}>−₹2,000</div>
                      </div>
                      <div className="phone-list-item">
                        <div className="pli-icon">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                        </div>
                        <div className="pli-main">
                          <div className="pli-title">Month total</div>
                          <div className="pli-sub">June 1 – 7</div>
                        </div>
                        <div className="pli-amount green">₹5,240</div>
                      </div>
                    </div>
                    <div className="phone-bottom-nav">
                      <div className="pbn-item active"><div className="pbn-icon" />Home</div>
                      <div className="pbn-item"><div className="pbn-icon" />Wallet</div>
                      <div className="pbn-item"><div className="pbn-icon" />Pay</div>
                      <div className="pbn-item"><div className="pbn-icon" />KYC</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="container">
          <div className="features-header">
            <p className="section-label">Platform Capabilities</p>
            <h2 className="display">Everything the fleet operations needs,<br /><em>nothing it doesn't</em></h2>
            <p>Every feature was built from direct research with fleet operators and drivers across India. Not from assumptions.</p>
          </div>
          <div className="features-grid">
            <div className="feature-cell">
              <div className="feature-icon">💳</div>
              <div className="feature-title">UPI Rent Collection</div>
              <div className="feature-body">Verified digital payments via MobilityGrid. Drivers pay through any UPI app. Owners see collections in real time with a full audit trail.</div>
              <a href="#solutions" className="feature-link">Learn more →</a>
            </div>
            <div className="feature-cell">
              <div className="feature-icon">🪪</div>
              <div className="feature-title">Driver KYC & Verification</div>
              <div className="feature-body">Aadhaar, PAN, Driving Licence, and bank verification managed through an admin queue.</div>
              <a href="#solutions" className="feature-link">Learn more →</a>
            </div>
            <div className="feature-cell">
              <div className="feature-icon">📊</div>
              <div className="feature-title">Live Fleet Dashboard</div>
              <div className="feature-body">Real-time visibility across your vehicles, drivers, and collections in a single system.</div>
              <a href="#solutions" className="feature-link">Learn more →</a>
            </div>
            <div className="feature-cell">
              <div className="feature-icon">🔒</div>
              <div className="feature-title">Private Earnings Tracker</div>
              <div className="feature-body">Drivers track earnings privately, which helps build trust while keeping operations transparent.</div>
              <a href="#solutions" className="feature-link">Learn more →</a>
            </div>
            <div className="feature-cell">
              <div className="feature-icon">📁</div>
              <div className="feature-title">Compliance Vault</div>
              <div className="feature-body">Store documents, RC copies, and KYC files in one searchable place.</div>
              <a href="#solutions" className="feature-link">Learn more →</a>
            </div>
            <div className="feature-cell">
              <div className="feature-icon">🌐</div>
              <div className="feature-title">Hindi + English Interface</div>
              <div className="feature-body">The driver terminal supports both Hindi and English for real-world usability.</div>
              <a href="#solutions" className="feature-link">Learn more →</a>
            </div>
          </div>
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="container">
          <div className="how-header">
            <p className="section-label">How It Works</p>
            <h2 className="display">Up and running in <em>four steps</em></h2>
            <p>From fleet onboarding to digital collections, the process is designed to be simple, fast, and reliable.</p>
          </div>
          <div className="how-steps">
            <div className="how-step">
              <div className="how-step-num">1</div>
              <h3>Admin onboards your company</h3>
              <p>MobilityGrid verifies and activates your fleet, usually in under 24 hours.</p>
            </div>
            <div className="how-step">
              <div className="how-step-num">2</div>
              <h3>Add vehicles and drivers</h3>
              <p>Set up vehicles, assign drivers, and define daily rents from the owner dashboard.</p>
            </div>
            <div className="how-step">
              <div className="how-step-num">3</div>
              <h3>Drivers complete KYC</h3>
              <p>Drivers upload documents through the mobile terminal. Admin verifies to unlock assignments.</p>
            </div>
            <div className="how-step">
              <div className="how-step-num">4</div>
              <h3>Collections run digitally</h3>
              <p>Drivers pay rent via UPI. Every payment is recorded, visible, and reconciled automatically.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="for-section">
        <div className="container">
          <div className="for-header">
            <p className="section-label">Built For</p>
            <h2 className="display">Purpose-built for <em>every stakeholder</em></h2>
          </div>
          <div className="for-grid">
            <div className="for-card">
              <div className="for-avatar" style={{ background: '#ede9fe' }}>🚗</div>
              <h3>Fleet Owners</h3>
              <p className="sub">Any fleet, any size</p>
              <p>Replace WhatsApp reminders and paper ledgers with a real-time dashboard. Know exactly who has paid and what your fleet is worth.</p>
              <ul className="for-list">
                <li className="for-item"><span className="for-bullet" />Zero manual reconciliation</li>
                <li className="for-item"><span className="for-bullet" />Verified UPI collections</li>
                <li className="for-item"><span className="for-bullet" />Fleet registry at scale</li>
              </ul>
            </div>
            <div className="for-card">
              <div className="for-avatar" style={{ background: '#fef3c7' }}>🧑‍💼</div>
              <h3>Fleet Managers</h3>
              <p className="sub">Day-to-day operations</p>
              <p>Manage assignments, record collections, and track driver compliance without access to owner-only financial controls.</p>
              <ul className="for-list">
                <li className="for-item"><span className="for-bullet" />Role-based controls</li>
                <li className="for-item"><span className="for-bullet" />Driver and vehicle assignment</li>
                <li className="for-item"><span className="for-bullet" />Cash collection recording</li>
              </ul>
            </div>
            <div className="for-card">
              <div className="for-avatar" style={{ background: '#dcfce7' }}>🛺</div>
              <h3>Drivers</h3>
              <p className="sub">Gig workers, daily earners</p>
              <p>See dues, track earnings, pay rent with a tap, and keep documents in order using a phone that works even on 2G.</p>
              <ul className="for-list">
                <li className="for-item"><span className="for-bullet" />Private earnings tracker</li>
                <li className="for-item"><span className="for-bullet" />UPI payment in one tap</li>
                <li className="for-item"><span className="for-bullet" />Hindi + English UI</li>
              </ul>
            </div>
          </div>
        </div>
      </section>


      {/* ── PRICING SECTION ─────────────────────────────────────────────── */}
      <section className="pricing-section" id="pricing">
        <div className="container">
          <p className="section-label" style={{ textAlign: 'center', marginBottom: '12px' }}>Simple Pricing</p>
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Transparent pricing. No hidden fees.</h2>
          <p className="section-sub" style={{ textAlign: 'center', marginBottom: '48px', maxWidth: '520px', margin: '0 auto 48px' }}>
            One-time onboarding. Pay per driver. Scale at your own pace.
          </p>

          <div className="pricing-grid">
            {/* STARTER */}
            <div className="pricing-card">
              <div className="pricing-badge">Starter</div>
              <div className="pricing-price">₹25,000<span> onboarding</span></div>
              <div className="pricing-desc">One-time setup for fleets up to 20 drivers</div>
              <ul className="pricing-features">
                <li><span className="pf-check">✓</span> Owner dashboard &amp; driver app</li>
                <li><span className="pf-check">✓</span> Up to 20 drivers</li>
                <li><span className="pf-check">✓</span> Vehicle management &amp; assignment</li>
                <li><span className="pf-check">✓</span> KYC document collection</li>
                <li><span className="pf-check">✓</span> SOS emergency alerts</li>
                <li><span className="pf-check">✓</span> ₹100 / driver / month</li>
                <li><span className="pf-cross">✗</span> Bulk driver upload</li>
                <li><span className="pf-cross">✗</span> Online payment collection</li>
                <li><span className="pf-cross">✗</span> Advanced analytics</li>
              </ul>
              <a href="mailto:mobilitygrid@gmail.com" className="pricing-btn pricing-btn-outline">Get Onboarded</a>
            </div>

            {/* GROWTH */}
            <div className="pricing-card pricing-card-featured">
              <div className="pricing-badge pricing-badge-featured">Most Popular</div>
              <div className="pricing-price">₹100<span>/driver/month</span></div>
              <div className="pricing-desc">For growing fleets that need more power</div>
              <ul className="pricing-features">
                <li><span className="pf-check">✓</span> Everything in Free</li>
                <li><span className="pf-check">✓</span> Unlimited drivers</li>
                <li><span className="pf-check">✓</span> Bulk CSV upload</li>
                <li><span className="pf-check">✓</span> Online payment collection</li>
                <li><span className="pf-check">✓</span> Advanced analytics &amp; reports</li>
                <li><span className="pf-check">✓</span> Priority support</li>
                <li><span className="pf-check">✓</span> Multi-company management</li>
                <li><span className="pf-check">✓</span> Custom payment cycles</li>
                <li><span className="pf-check">✓</span> Driver performance tracking</li>
              </ul>
              <div className="pricing-note">First 10 drivers: 50% off for 3 months</div>
              <a href="/login?role=owner&signup=true" className="pricing-btn pricing-btn-primary">Start Growing</a>
            </div>

            {/* ENTERPRISE */}
            <div className="pricing-card">
              <div className="pricing-badge">Enterprise</div>
              <div className="pricing-price">Custom<span> pricing</span></div>
              <div className="pricing-desc">For large fleets and aggregators</div>
              <ul className="pricing-features">
                <li><span className="pf-check">✓</span> Everything in Growth</li>
                <li><span className="pf-check">✓</span> Dedicated account manager</li>
                <li><span className="pf-check">✓</span> Custom integrations</li>
                <li><span className="pf-check">✓</span> White-label option</li>
                <li><span className="pf-check">✓</span> SLA guarantee</li>
                <li><span className="pf-check">✓</span> On-site onboarding</li>
                <li><span className="pf-check">✓</span> API access</li>
                <li><span className="pf-check">✓</span> Custom reporting</li>
                <li><span className="pf-check">✓</span> 24/7 support</li>
              </ul>
              <a href="mailto:mobilitygrid@gmail.com" className="pricing-btn pricing-btn-outline">Contact Us</a>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '14px', color: '#64748b' }}>
          </p>
        </div>
      </section>


      {/* ── PARTNERS SECTION ──────────────────────────────────────── */}
      <section style={{ background: '#f8fafc', padding: '80px 0' }} id="partners">
        <div className="container">
          <p className="section-label" style={{ textAlign: 'center', marginBottom: '12px' }}>Fleet Partners</p>
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Fleets running on MobilityGrid</h2>
          <p className="section-sub" style={{ textAlign: 'center', marginBottom: '48px', maxWidth: '480px', margin: '0 auto 48px' }}>
            Verified fleet operators who have onboarded their drivers and vehicles on our platform.
          </p>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 40 }}>
            {landingPartners.map(p => {
              const initials = (p.brand_name || p.full_name || '?').split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
              return (
                <a key={p.partner_slug} href={`https://partners.mobilitygrid.in/${p.partner_slug}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'white', borderRadius: 20, padding: '24px 28px',
                    border: '1.5px solid #e2e8f0', width: 240, cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.10)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.transform='translateY(0)'; }}
                  >
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, color: 'white', fontWeight: 900, fontSize: 18 }}>{initials}</div>
                    <p style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>{p.brand_name || p.full_name}</p>
                    {p.tagline && <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 1.4 }}>{p.tagline}</p>}
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: 20 }}>✓ Verified Partner</span>
                  </div>
                </a>
              );
            })}
            {/* legacy placeholder - remove below block once all partners are in DB */}
            {landingPartners.length === 0 && (
            <a href="https://partners.mobilitygrid.in/recoverynest" style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'white', borderRadius: 20, padding: '24px 28px',
                border: '1.5px solid #e2e8f0', width: 240, cursor: 'pointer',                transition: 'box-shadow 0.2s, transform 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow='0 8px 32px rgba(79,70,229,0.12)'; e.currentTarget.style.transform='translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'; e.currentTarget.style.transform='translateY(0)'; }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#1e40af,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, color: 'white', fontWeight: 900, fontSize: 18 }}>RN</div>
                <p style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>Recovery Nest</p>
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12, lineHeight: 1.4 }}>Fleet Recovery &amp; Logistics</p>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: 20 }}>✓ Verified Partner</span>
              </div>
            </a>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <a href="https://partners.mobilitygrid.in" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#4f46e5', textDecoration: 'none' }}>
              View all partners →
            </a>
          </div>
        </div>
      </section>

<section className="signup-section" id="signup">
        <div className="container signup-inner">
          <div className="signup-grid">
            <div className="signup-left">
              <p className="section-label section-label-light" style={{ marginBottom: '16px' }}>Expression of Interest</p>
              <h2 className="display display-light">Be part of<br /><em>what comes next.</em></h2>
              <p className="body-lg">We are in active development and speaking with fleet operators, managers, and drivers across India. If you operate a fleet or work within the ecosystem, we want to hear from you first.</p>
              <div className="signup-promises">
                <div className="sp-item"><span className="sp-dot" />Our team reaches out within 24 hours</div>
                <div className="sp-item"><span className="sp-dot" />This is a conversation, not a sales call</div>
                <div className="sp-item"><span className="sp-dot" />Early participants shape the solutions roadmap</div>
                <div className="sp-item"><span className="sp-dot" />Your details are never shared with third parties</div>
              </div>
            </div>

            <div>
              <div id="successCard" className={`success-card${submitted ? ' show' : ''}`}>
                <span className="success-icon">✦</span>
                <div className="success-title">You're on the list.</div>
                <div className="success-body">
                  Thank you for your interest in MobilityGrid.<br />
                  Our team will reach out on WhatsApp within 24 hours.<br /><br />
                  You are now part of building the infrastructure that India's fleet operations deserves.
                </div>
              </div>

              <div id="formCard" className="form-card" style={{ display: submitted ? 'none' : 'block' }}>
                <div className="form-title">Express Your Interest</div>
                <div className="form-sub">Takes 60 seconds. No commitment required.</div>

                <form className="signup-form" onSubmit={handleSubmit}>
                  <div className="field-row">
                    <div className="field">
                      <label>Full Name</label>
                      <input name="name" value={formData.name} onChange={handleChange} placeholder="Your name" required />
                    </div>
                    <div className="field">
                      <label>WhatsApp Number</label>
                      <input name="phone" value={formData.phone} onChange={handleChange} placeholder="10-digit number" maxLength="10" required />
                    </div>
                  </div>

                  <div className="field">
                    <label>Email Address <span style={{fontWeight:400,color:'#94a3b8',fontSize:'12px'}}>(optional, for confirmation)</span></label>
                    <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" />
                  </div>

                  <div className="field">
                    <label>Organisation / Fleet Name</label>
                    <input name="company" value={formData.company} onChange={handleChange} placeholder="Your company or fleet" required />
                  </div>

                  <div className="field-row">
                    <div className="field">
                      <label>Your Role</label>
                      <select name="role" value={formData.role} onChange={handleChange} required aria-label="Your Role">
                        <option value="" disabled>Select role</option>
                        <option>Fleet Owner / Operator</option>
                        <option>Fleet Manager</option>
                        <option>Driver / Rider</option>
                        <option>Investor / Partner</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Fleet Size</label>
                      <select name="fleet" value={formData.fleet} onChange={handleChange} aria-label="Fleet Size">
                        <option value="" disabled>Select range</option>
                        <option>1 – 10 vehicles</option>
                        <option>11 – 30 vehicles</option>
                        <option>31 – 100 vehicles</option>
                        <option>100+ vehicles</option>
                      </select>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field">
                      <label>City</label>
                      <input name="city" value={formData.city} onChange={handleChange} placeholder="Where you operate" />
                    </div>
                    <div className="field">
                      <label>Vehicle Type</label>
                      <select name="type" value={formData.type} onChange={handleChange} aria-label="Vehicle Type">
                        <option value="" disabled>Select type</option>
                        <option>EV / Electric</option>
                        <option>Auto-Rickshaw</option>
                        <option>Cab / Car</option>
                        <option>Truck / Commercial</option>
                        <option>Two-Wheeler</option>
                        <option>Mixed Fleet</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="form-submit btn btn-primary btn-lg" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Expression of Interest →'}
                  </button>
                  <div className="form-note">By submitting you agree to be contacted by the MobilityGrid team. We do not share your information.</div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-accent" />
        <div className="container footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="footer-logo">
                <BrandLogo variant="cyan" height={31} alt="MobilityGrid" />
              </div>
              <p className="footer-tagline">The operating system for India's fleet operations. Built for every operator, manager, and driver.</p>
              <div className="footer-badge">
                <div className="footer-badge-dot" />
                <span className="footer-badge-text">India's Fleet Operating System</span>
              </div>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">solutions</div>
              <ul className="footer-links">
                <li><a href="#solutions" className="footer-link">Super Admin Console</a></li>
                <li><a href="#solutions" className="footer-link">Fleet Owner Dashboard</a></li>
                <li><a href="#solutions" className="footer-link">Driver Terminal</a></li>
                <li><a href="#solutions" className="footer-link">KYC &amp; Compliance</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Company</div>
              <ul className="footer-links">
                <li><a href="#vision" className="footer-link">Vision &amp; Mission</a></li>
                <li><a href="#gaps" className="footer-link">Problems</a></li>
                <li><a href="#how" className="footer-link">How It Works</a></li>
                <li><a href="#signup" className="footer-link">Get Early Access</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <div className="footer-col-title">Contact</div>
              <ul className="footer-links">
                <li><a href="mailto:mobilitygrid@gmail.com" className="footer-link">mobilitygrid@gmail.com</a></li>
                <li><span className="footer-link">Bengaluru, India</span></li>
                <li><a href="#signup" className="footer-link">Request a Demo</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2026 MobilityGrid. All rights reserved.</div>
            <div className="footer-by">Built with purpose in India <span className="footer-india">🇮🇳</span></div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default LandingPage;
