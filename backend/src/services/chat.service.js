/**
 * Chat Service
 * src/services/chat.service.js
 *
 * All chat-related API calls in one place.
 */

const API = 'https://mg-qw5s.onrender.com';

const headers = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

export const getChatMessages = async (driverPhone, ownerId, token) => {
  const res = await fetch(
    `${API}/api/payment/chat/messages?driverPhone=${driverPhone}&ownerId=${ownerId}`,
    { headers: headers(token) }
  );
  return res.json();
};

export const sendChatMessage = async ({ driverPhone, message, senderType, ownerId }, token) => {
  const res = await fetch(`${API}/api/payment/chat/send`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ driverPhone, message, senderType, ownerId }),
  });
  return res.json();
};

export const getUnreadCount = async (driverPhone, viewerType, token) => {
  const res = await fetch(
    `${API}/api/payment/chat/unread?driverPhone=${driverPhone}&viewerType=${viewerType}`,
    { headers: headers(token) }
  );
  return res.json();
};