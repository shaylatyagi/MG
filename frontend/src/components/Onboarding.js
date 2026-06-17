// frontend/src/components/Onboarding.js
// First-login guided tour for Driver and Owner apps
import React, { useState, useEffect } from 'react';

const TOURS = {
  driver: [
    {
      icon: '👛',
      title: 'Your Wallet',
      body: 'Check your current balance here. Your earnings and payments are tracked in real time.',
    },
    {
      icon: '💳',
      title: 'Pay Your Dues',
      body: 'Tap "Pay Now" to pay daily/weekly dues online. Cash payments are recorded by your owner.',
    },
    {
      icon: '📄',
      title: 'KYC Documents',
      body: 'Upload your Aadhaar, licence, and photo. Verified drivers get faster approvals.',
    },
    {
      icon: '🆘',
      title: 'SOS Emergency',
      body: 'Press the red SOS button in an emergency. Your owner and admin are alerted instantly.',
    },
  ],
  owner: [
    {
      icon: '🚗',
      title: 'Add Drivers',
      body: 'Tap + to register a new driver. Share your Owner Code for self-signup.',
    },
    {
      icon: '🔑',
      title: 'Assign Vehicles',
      body: 'Link a vehicle to a driver from the Vehicles tab so dues are tracked correctly.',
    },
    {
      icon: '💰',
      title: 'Record Payments',
      body: 'Log cash payments on behalf of drivers. Online payments auto-update.',
    },
    {
      icon: '🔔',
      title: 'Notifications',
      body: 'Get alerts for SOS, KYC submissions, and dues reminders.',
    },
  ],
};

const DOT_ACTIVE = {
  width: 8, height: 8, borderRadius: 4,
  background: '#4f46e5', transition: 'all 0.2s',
};
const DOT = {
  width: 6, height: 6, borderRadius: 3,
  background: '#c7d2fe', transition: 'all 0.2s',
};

export default function Onboarding({ role = 'driver', onDone }) {
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);

  const steps = TOURS[role] || TOURS.driver;

  const finish = () => {
    setClosing(true);
    setTimeout(() => {
      try { localStorage.setItem('mg_onboarding_' + role, '1'); } catch (_) {}
      onDone && onDone();
    }, 300);
  };

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else finish();
  };

  const skip = () => finish();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15,23,42,0.7)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      transition: 'opacity 0.3s', opacity: closing ? 0 : 1,
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#fff', borderRadius: '24px 24px 0 0',
        padding: '28px 24px 40px',
        transform: closing ? 'translateY(20px)' : 'translateY(0)',
        transition: 'transform 0.3s ease',
      }}>
        {/* Skip */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button onClick={skip} style={{
            background: 'none', border: 'none',
            color: '#94a3b8', fontSize: 13, fontWeight: 600, padding: '4px 8px',
          }}>
            Skip
          </button>
        </div>

        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 24,
          background: '#eef2ff', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 36, margin: '0 auto 20px',
          transition: 'all 0.25s',
        }}>
          {steps[step].icon}
        </div>

        {/* Content */}
        <h2 style={{
          fontSize: 20, fontWeight: 800, color: '#0f172a',
          textAlign: 'center', margin: '0 0 10px',
        }}>
          {steps[step].title}
        </h2>
        <p style={{
          fontSize: 14, color: '#475569', textAlign: 'center',
          lineHeight: 1.6, margin: '0 0 28px', minHeight: 44,
        }}>
          {steps[step].body}
        </p>

        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {steps.map((_, i) => (
            <div key={i} style={i === step ? DOT_ACTIVE : DOT} />
          ))}
        </div>

        {/* CTA */}
        <button onClick={next} style={{
          width: '100%', padding: '14px 0',
          background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
          color: '#fff', border: 'none', borderRadius: 16,
          fontSize: 16, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(79,70,229,0.3)',
        }}>
          {step < steps.length - 1 ? 'Next →' : 'Get Started 🚀'}
        </button>
      </div>
    </div>
  );
}

/**
 * useOnboarding(role)
 * Returns { showTour, dismissTour }
 * showTour === true only on the very first session after login.
 * Call dismissTour() when onboarding is done.
 */
export function useOnboarding(role) {
  const key = 'mg_onboarding_' + role;
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      // If no created_at in stored user (old session before this fix), treat as existing user
      if (!user.created_at) return;
      const ageMs = Date.now() - new Date(user.created_at).getTime();
      // More than 1 hour old = not a brand-new registration
      if (ageMs > 60 * 60 * 1000) return;
      // Brand-new user: show once, then mark done
      if (!localStorage.getItem(key)) setShowTour(true);
    } catch (_) {}
  }, [key]);

  const dismissTour = () => {
    try { localStorage.setItem(key, '1'); } catch (_) {}
    setShowTour(false);
  };

  return { showTour, dismissTour };
}
