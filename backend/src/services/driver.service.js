/**
 * Driver Service
 * src/services/driver.service.js
 *
 * All driver-related API calls in one place.
 * Import this wherever you need driver data.
 */

const API = 'https://mg-qw5s.onrender.com';

const headers = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

// ─── GET ──────────────────────────────────────────────────────────────────────

export const getDriversList = async (ownerId, token) => {
  const res = await fetch(`${API}/api/payment/owner/drivers/list?ownerId=${ownerId}`, { headers: headers(token) });
  const data = await res.json();
  return Array.isArray(data) ? data : (data.drivers || []);
};

export const getDriverHistory = async (driverId, token) => {
  const res = await fetch(`${API}/api/payment/owner/driver-history/${driverId}`, { headers: headers(token) });
  return res.json();
};

export const getDriverStatement = async (driverId, token) => {
  const res = await fetch(`${API}/api/payment/owner/driver-statement?driverId=${driverId}`, { headers: headers(token) });
  return res.json();
};

export const getDriverActivity = async (ownerId, date, token) => {
  const res = await fetch(`${API}/api/payment/owner/driver-activity?ownerId=${ownerId}&date=${date}`, { headers: headers(token) });
  return res.json();
};

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const addDriver = async (driverData, token) => {
  const res = await fetch(`${API}/api/payment/owner/add-driver`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(driverData),
  });
  return res.json();
};

export const bulkUploadDrivers = async (drivers, ownerId, token) => {
  const res = await fetch(`${API}/api/payment/owner/bulk-upload`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ drivers, ownerId }),
  });
  return res.json();
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export const setDriverIncentiveRule = async (driverId, ruleIndex, token) => {
  const res = await fetch(`${API}/api/payment/owner/driver-incentive-rule`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ driverId, ruleIndex }),
  });
  return res.json();
};

export const notifyUnpaidDrivers = async (token) => {
  const res = await fetch(`${API}/api/payment/owner/notify-unpaid`, {
    method: 'POST',
    headers: headers(token),
  });
  return res.json();
};