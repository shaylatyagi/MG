/**
 * Vehicle Service
 * src/services/vehicle.service.js
 *
 * All vehicle-related API calls in one place.
 */

const API = 'https://mg-qw5s.onrender.com';

const headers = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

// ─── GET ──────────────────────────────────────────────────────────────────────

export const getVehicles = async (ownerId, token) => {
  const res = await fetch(`${API}/api/payment/owner/vehicles?ownerId=${ownerId}`, { headers: headers(token) });
  const data = await res.json();
  return Array.isArray(data) ? data : (data.vehicles || data.data || []);
};

export const getVehicleHistory = async (vehicleId, token) => {
  const res = await fetch(`${API}/api/payment/owner/vehicle-history/${vehicleId}`, { headers: headers(token) });
  return res.json();
};

export const getVehicleStats = async (vehicleId, token) => {
  const res = await fetch(`${API}/api/payment/owner/vehicle-stats/${vehicleId}`, { headers: headers(token) });
  return res.json();
};

export const getDamageRecords = async (vehicleId, token) => {
  const res = await fetch(`${API}/api/payment/owner/damage-records/${vehicleId}`, { headers: headers(token) });
  return res.json();
};

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const addVehicle = async (vehicleData, token) => {
  const res = await fetch(`${API}/api/payment/owner/vehicles`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(vehicleData),
  });
  return res.json();
};

export const bulkUploadVehicles = async (vehicles, ownerId, token) => {
  const res = await fetch(`${API}/api/payment/owner/bulk-upload-vehicles`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ vehicles, ownerId }),
  });
  return res.json();
};

export const addDamageRecord = async (damageData, token) => {
  const res = await fetch(`${API}/api/payment/owner/damage-record`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(damageData),
  });
  return res.json();
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export const updateVehicleStatus = async (vehicleId, status, token) => {
  const res = await fetch(`${API}/api/payment/owner/vehicles/${vehicleId}/status`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify({ status }),
  });
  return res.json();
};

export const resolveDamageRecord = async (damageId, token) => {
  const res = await fetch(`${API}/api/payment/owner/damage-record/${damageId}/resolve`, {
    method: 'PUT',
    headers: headers(token),
  });
  return res.json();
};