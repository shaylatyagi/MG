/**
 * Notification Service
 * src/services/notification.service.js
 *
 * All notification-related API calls in one place.
 */

const API = 'https://mg-qw5s.onrender.com';

const headers = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export const getOwnerNotifications = async (ownerId, token) => {
  const res = await fetch(
    `${API}/api/payment/owner/notifications?ownerId=${ownerId}`,
    { headers: headers(token) }
  );
  return res.json();
};

export const markNotificationsRead = async (userId, token) => {
  const res = await fetch(
    `${API}/api/payment/notifications/mark-read?userId=${userId}`,
    { method: 'PUT', headers: headers(token) }
  );
  return res.json();
};

export const getSosAlerts = async (ownerId, token) => {
  const res = await fetch(
    `${API}/api/payment/owner/sos-alerts?ownerId=${ownerId}`,
    { headers: headers(token) }
  );
  return res.json();
};

export const dismissSosAlert = async (alertId, token) => {
  const res = await fetch(
    `${API}/api/payment/owner/sos-dismiss/${alertId}`,
    { method: 'PUT', headers: headers(token) }
  );
  return res.json();
};