/**
 * Payment Service
 * src/services/payment.service.js
 *
 * All payment, ledger, and transaction API calls in one place.
 */

const API = 'https://mg-qw5s.onrender.com';

const headers = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

// ─── GET ──────────────────────────────────────────────────────────────────────

export const getOwnerStats = async (ownerId, token) => {
  const res = await fetch(`${API}/api/payment/owner/stats?ownerId=${ownerId}`, { headers: headers(token) });
  return res.json();
};

export const getLedgerSummary = async (period, token) => {
  const res = await fetch(`${API}/api/payment/owner/ledger?period=${period}`, { headers: headers(token) });
  return res.json();
};

export const getTransactions = async (ownerId, token) => {
  const res = await fetch(`${API}/api/payment/owner/transactions?ownerId=${ownerId}`, { headers: headers(token) });
  return res.json();
};

export const getDriverLedger = async (ownerId, token) => {
  const res = await fetch(`${API}/api/payment/owner/driver-ledger?ownerId=${ownerId}`, { headers: headers(token) });
  return res.json();
};

export const getIncentiveRules = async (ownerId, token) => {
  const res = await fetch(`${API}/api/payment/owner/incentive-rules?ownerId=${ownerId}`, { headers: headers(token) });
  return res.json();
};

export const getOwnerPlan = async (ownerId, token) => {
  const res = await fetch(`${API}/api/payment/owner/plan?ownerId=${ownerId}`, { headers: headers(token) });
  return res.json();
};

export const getOwnerByPhone = async (phone, token) => {
  const res = await fetch(`${API}/api/payment/owner/by-phone?phone=${phone}`, { headers: headers(token) });
  return res.json();
};

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const recordCashPayment = async ({ driverPhone, driverName, amount, ownerId, purpose = 'RENT' }, token) => {
  const res = await fetch(`${API}/api/payment/owner/cash-payment`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ driverPhone, driverName, amount, ownerId, purpose }),
  });
  return res.json();
};

export const addLedgerEntry = async ({ driverId, ownerId, entryType, amount, description }, token) => {
  const res = await fetch(`${API}/api/payment/owner/ledger-entry`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ driverId, ownerId, entryType, amount, description }),
  });
  return res.json();
};

export const saveIncentiveRules = async ({ ownerId, isEnabled, rules }, token) => {
  const res = await fetch(`${API}/api/payment/owner/incentive-rules`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ ownerId, isEnabled, rules }),
  });
  return res.json();
};

export const createPaymentOrder = async ({ amount, customerName, customerPhone, customerEmail, purpose }, token) => {
  const res = await fetch(`${API}/api/payment/create-order`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ amount, customerName, customerPhone, customerEmail, purpose }),
  });
  return res.json();
};

export const upgradeToPremium = async (ownerId, months = 1, token) => {
  const res = await fetch(`${API}/api/payment/owner/upgrade-premium`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ ownerId, months }),
  });
  return res.json();
};