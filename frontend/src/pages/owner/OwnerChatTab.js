// frontend/src/pages/owner/OwnerChatTab.js — COM-01
// Owner side: list all driver threads, open a thread, send messages
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../api';

export default function OwnerChatTab({ lang }) {
  const [threads, setThreads]       = useState([]);
  const [activeId, setActiveId]     = useState(null);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const bottomRef                   = useRef(null);
  const pollRef                     = useRef(null);

  const loadThreads = useCallback(async () => {
    try {
      const res = await api.get('/api/chat/threads');
      const data = res.data?.data ?? res.data;
      if (Array.isArray(data)) setThreads(data);
    } catch (e) {
      console.error('chat threads:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (driverId) => {
    if (!driverId) return;
    try {
      const res = await api.get('/api/chat/messages', { params: { driver_id: driverId, limit: 60 } });
      const data = res.data?.data ?? res.data;
      if (Array.isArray(data)) setMessages(data);
    } catch (e) {
      console.error('chat messages:', e);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    clearInterval(pollRef.current);
    if (activeId) {
      loadMessages(activeId);
      pollRef.current = setInterval(() => loadMessages(activeId), 6000);
    }
    return () => clearInterval(pollRef.current);
  }, [activeId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openThread = (driverId) => {
    setActiveId(driverId);
    setMessages([]);
    setInput('');
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || !activeId) return;
    setSending(true);
    const optimistic = { id: Date.now(), sender_type: 'OWNER', message: text, created_at: new Date().toISOString(), _pending: true };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    try {
      await api.post('/api/chat/send', { driver_id: activeId, message: text });
      await loadMessages(activeId);
      await loadThreads();
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  const fmt = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const activeDriver = threads.find(t => t.driver_id === activeId);

  if (loading) return (
    <div style={{ padding: '16px' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ height: '64px', backgroundColor: '#F3F4F6', borderRadius: '12px', marginBottom: '10px' }} />
      ))}
    </div>
  );

  // Thread list view
  if (!activeId) return (
    <div style={{ padding: '16px' }}>
      <p style={{ fontSize: '15px', fontWeight: '700', color: '#1A1A1A', marginBottom: '16px', marginTop: 0 }}>
        💬 {lang === 'en' ? 'Driver Messages' : 'ड्राइवर संदेश'}
      </p>
      {threads.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E8E0D5' }}>
          <p style={{ fontSize: '28px', marginBottom: '8px' }}>💬</p>
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>No conversations yet. Drivers can message you from the app.</p>
        </div>
      ) : threads.map(t => (
        <div key={t.driver_id} onClick={() => openThread(t.driver_id)}
          style={{ backgroundColor: 'white', borderRadius: '12px', padding: '14px 16px', marginBottom: '10px', border: '1px solid #E8E0D5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#4F46E5', flexShrink: 0 }}>
            {(t.driver_name || '?').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1A', margin: 0 }}>{t.driver_name}</p>
              <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0, flexShrink: 0, marginLeft: '8px' }}>{fmt(t.last_message_at)}</p>
            </div>
            <p style={{ fontSize: '12px', color: '#6B6B6B', margin: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {t.last_sender === 'DRIVER' ? '' : 'You: '}{t.last_message || 'No messages yet'}
            </p>
          </div>
          {t.unread_count > 0 && (
            <div style={{ minWidth: '20px', height: '20px', borderRadius: '10px', backgroundColor: '#4F46E5', color: 'white', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: '0 5px' }}>
              {t.unread_count}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // Active chat view
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#F8F9FA' }}>
      <div style={{ backgroundColor: '#4F46E5', padding: '14px 16px', color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => setActiveId(null)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer', padding: '0', lineHeight: 1 }}>←</button>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
          {(activeDriver?.driver_name || '?').charAt(0).toUpperCase()}
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: '700', fontSize: '15px' }}>{activeDriver?.driver_name || 'Driver'}</p>
          <p style={{ margin: 0, fontSize: '11px', opacity: 0.8 }}>{activeDriver?.phone_number}</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '80px' }}>
        {messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '14px', marginTop: '40px' }}>No messages yet.</p>
        ) : messages.map(msg => {
          const isMe = msg.sender_type === 'OWNER';
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
              <div style={{ maxWidth: '72%', backgroundColor: isMe ? '#4F46E5' : 'white', color: isMe ? 'white' : '#1A1A1A', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', opacity: msg._pending ? 0.7 : 1 }}>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4' }}>{msg.message}</p>
                <p style={{ margin: '4px 0 0', fontSize: '10px', opacity: 0.65, textAlign: 'right' }}>
                  {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}{msg._pending ? ' · Sending…' : ''}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} style={{ position: 'fixed', bottom: '0', left: 0, right: 0, backgroundColor: 'white', borderTop: '1px solid #E5E7EB', padding: '10px 12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Message driver…"
          style={{ flex: 1, padding: '10px 14px', borderRadius: '24px', border: '1px solid #D1D5DB', fontSize: '14px', outline: 'none' }} />
        <button type="submit" disabled={!input.trim() || sending}
          style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', backgroundColor: input.trim() && !sending ? '#4F46E5' : '#D1D5DB', cursor: input.trim() && !sending ? 'pointer' : 'not-allowed', fontSize: '18px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          ➤
        </button>
      </form>
    </div>
  );
}
