/**
 * Assignment Service
 * src/services/assignment.service.js
 *
 * All vehicle-driver assignment API calls in one place.
 */

const API = 'https://mg-qw5s.onrender.com';

const headers = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

// ─── GET ──────────────────────────────────────────────────────────────────────

export const getUnassignedDrivers = async (token) => {
  const res = await fetch(`${API}/api/assignment/unassigned/drivers`, { headers: headers(token) });
  const data = await res.json();
  return data.success ? (data.data || []) : [];
};

export const getUnassignedVehicles = async (token) => {
  const res = await fetch(`${API}/api/assignment/unassigned/vehicles`, { headers: headers(token) });
  const data = await res.json();
  return data.success ? (data.data || []) : [];
};

export const getAvailableVehiclesForDriver = async (driverId, token) => {
  const res = await fetch(`${API}/api/assignment/available/vehicles?driverId=${driverId}`, { headers: headers(token) });
  const data = await res.json();
  return data.success ? (data.data || []) : [];
};

export const getAvailableDriversForVehicle = async (vehicleId, token) => {
  const res = await fetch(`${API}/api/assignment/available/drivers?vehicleId=${vehicleId}`, { headers: headers(token) });
  const data = await res.json();
  return data.success ? (data.data || []) : [];
};

// ─── CREATE / UPDATE ──────────────────────────────────────────────────────────

export const assignVehicleWithRent = async ({ vehicleId, driverId, rentType, rentAmount, dailyRent }, token) => {
  const res = await fetch(`${API}/api/assignment/assign-with-rent`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ vehicleId, driverId, rentType, rentAmount, dailyRent }),
  });
  return res.json();
};

export const unassignVehicle = async (vehicleId, token) => {
  const res = await fetch(`${API}/api/assignment/unassign`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ vehicleId }),
  });
  return res.json();
};