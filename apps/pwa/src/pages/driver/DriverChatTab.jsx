// src/pages/driver/DriverChatTab.jsx — COM-01
// Driver ↔ Owner in-app chat (polling every 8s)
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../api';
import AppShell from '../../components/AppShell';

// Chat uses the global api instance (VITE_API_URL env var)

export default function DriverChatTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const bottomRef               = useRef(null);
  const pollRef                 = useRef(null);

  const getDriverId = () => {
    try {
      const token = localStorage.getItem('mg_token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || payload.sub || null;
    } catch { return null; }
  };

  const fetchMessages = useCallback(async () => {
    const driverId = getDriverId();
    if (!driverId) return;
    try {
      const res = await api.get(`/api/chat/messages`, { params: { driver_id: driverId, limit: 60 } });
      const data = res.data?.data ?? res.data;
      if (Array.isArray(data)) setMessages(data);
      setError('');
    } catch (e) {
      if (e.response?.status !== 401) setError('Could not load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 8000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    const driverId = getDriverId();
    if (!driverId) return;

    setSending(true);
    const optimistic = { id: Date.now(), sender_type: 'DRIVER', message: text, created_at: new Date().toISOString(), _pending: true };
    setMessages(prev => [...prev, optimistic]);
    setInput('');

    try {
      await api.post(`/api/chat/send`, { driver_id: driverId, message: text });
      await fetchMessages();
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setError('Failed to send. Try again.');
    } finally {
      setSending(false);
    }
  };

  const fmt = (ts) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <AppShell title="Chat with Owner" subtitle="Messages stay traceable and easy to resume">
      <div className="chat-page">
        <div className="chat-viewport">
          {loading ? (
            <p className="chat-empty-state">Loading…</p>
          ) : messages.length === 0 ? (
            <div className="chat-empty-state">
              <div className="icon">💬</div>
              <p>No messages yet. Start a conversation!</p>
            </div>
          ) : messages.map((msg) => {
            const isMe = msg.sender_type === 'DRIVER';
            return (
              <div key={msg.id} className={`chat-message-row ${isMe ? 'chat-message-row--sent' : ''}`}>
                <div className={`chat-message ${isMe ? 'chat-message--sent' : ''} ${msg._pending ? 'chat-message--pending' : ''}`}>
                  <p className="chat-message__text">{msg.message}</p>
                  <p className="chat-message__time">{fmt(msg.created_at)}{msg._pending ? ' · Sending…' : ''}</p>
                </div>
              </div>
            );
          })}
          {error && <p className="chat-error-text">{error}</p>}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage} className="chat-input-toolbar">
          <input
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="btn btn--primary chat-send-button"
          >
            ➤
          </button>
        </form>
      </div>
    </AppShell>
  );
}
