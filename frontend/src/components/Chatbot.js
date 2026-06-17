// frontend/src/components/Chatbot.js
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Send, Loader, Wallet, CreditCard, Truck, Users, IndianRupee } from 'lucide-react';

const API = 'https://mg-qw5s.onrender.com';

export default function Chatbot({ userRole, userId = null, userPhone, token, onClose, onMessagesUpdate, persistedMessages = null }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(`mg_chat_${userRole}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [quickStats, setQuickStats] = useState(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const cachedVoicesRef = useRef([]);
  const ttsUnlockedRef = useRef(false);
  const isOwner = userRole === 'OWNER';
  const accumulatedTextRef = useRef('');  // ✅ poori baat collect karo
  const silenceTimerRef = useRef(null);   // ✅ silence detect karo

  // ─── INIT ───────────────────────────────────────────────────────────
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 0) {
        const w = isOwner
          ? 'Namaste! Fleet Assistant ready hoon.\n\nCollection, drivers, vehicles, ledger — kuch bhi poochein!'
          : 'Namaste! Driver Assistant ready hoon.\n\nBakaya, wallet, gaadi — kuch bhi poochein!';
        return [{ role: 'bot', content: w }];
      }
      return prev;
    });
    fetchQuickStats();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem(`mg_chat_${userRole}`, JSON.stringify(messages.slice(-50))); } catch {}
    }
  }, [messages]);

  // ─── VOICES CACHE ───────────────────────────────────────────────────
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) cachedVoicesRef.current = v;
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);
  useEffect(() => {
  const t = setInterval(() => {
    if (window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
    }
  }, 5000);
  return () => clearInterval(t);
}, []);

  // ─── SPEECH RECOGNITION ─────────────────────────────────────────────
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    recognitionRef.current = new SR();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-IN'; // Hinglish dono
    recognitionRef.current.onresult = (e) => {
  let interim = '';
  for (let i = e.resultIndex; i < e.results.length; i++) {
    const t = e.results[i][0].transcript;
    if (e.results[i].isFinal) {
      accumulatedTextRef.current += ' ' + t; // ✅ final chunks jodta ja
    } else {
      interim += t;
    }
  }

  // Display — accumulated + interim
  setInputText((accumulatedTextRef.current + ' ' + interim).trim());

  // ✅ Silence timer reset — 1.5 sec silence ke baad process karo
  if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  silenceTimerRef.current = setTimeout(() => {
    const finalText = accumulatedTextRef.current.trim();
    if (finalText) {
      recognitionRef.current.stop();
      handleUserMessage(finalText);
      setIsListening(false);
      accumulatedTextRef.current = ''; // reset
    }
  }, 1500);
};
    recognitionRef.current.onerror = (e) => {
      setIsListening(false);
      if (e.error !== 'no-speech' && e.error !== 'aborted')
        addMessage('bot', 'Mic access nahi mila. Browser permissions check karein.');
    };
    recognitionRef.current.onend = () => setIsListening(false);
  }, []);

  // ─── TTS ────────────────────────────────────────────────────────────
  const unlockTTS = () => {
    if (ttsUnlockedRef.current || !('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      window.speechSynthesis.speak(u);
      ttsUnlockedRef.current = true;
    } catch {}
  };

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    try { if (window.speechSynthesis.paused) window.speechSynthesis.resume(); } catch {}
    window.speechSynthesis.cancel();

    const speakable = text
      .replace(/₹/g, 'rupaye')
      .replace(/[^\x00-\x7F\u0900-\u097F\s0-9.,!?]/g, '')
      .replace(/\n+/g, '. ')
      .trim();
    if (!speakable) return;

    setIsSpeaking(true);
    const voices = cachedVoicesRef.current.length > 0
      ? cachedVoicesRef.current
      : window.speechSynthesis.getVoices();
    const best =
      voices.find(v => v.lang === 'hi-IN') ||
      voices.find(v => v.lang?.startsWith('hi')) ||
      voices.find(v => v.lang === 'en-IN') ||
      voices[0];

    const u = new SpeechSynthesisUtterance(speakable);
    if (best) { u.voice = best; u.lang = best.lang; } else u.lang = 'hi-IN';
    u.rate = 0.85; u.volume = 1.0;
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    setTimeout(() => { try { window.speechSynthesis.speak(u); } catch { setIsSpeaking(false); } }, 300);
  };

  const startListening = () => {
    unlockTTS();
    if (!recognitionRef.current) { addMessage('bot', 'Speech recognition supported nahi hai.'); return; }
    try { recognitionRef.current.stop(); } catch {}
    setTimeout(() => {
      try { setInputText(''); recognitionRef.current.start(); setIsListening(true); }
      catch { setIsListening(false); }
    }, 200);
  };

  const addMessage = (role, content) => {
    setMessages(prev => {
      const updated = [...prev, { role, content }];
      if (onMessagesUpdate) onMessagesUpdate(updated);
      return updated;
    });
  };

  // ─── QUICK STATS (header mein dikhane ke liye) ──────────────────────
  const fetchQuickStats = async () => {
    try {
      const H = { Authorization: `Bearer ${token}` };
      if (isOwner) {
        const res = await fetch(`${API}/api/payment/owner/stats?ownerId=${userId}`, { headers: H });
        const d = await res.json();
        setQuickStats({ a: d.total_earnings || 0, b: d.total_drivers || 0, c: d.total_vehicles || 0 });
      } else {
        const [pRes, dRes] = await Promise.all([
          fetch(`${API}/api/payment/driver/profile?phone=${userPhone}`, { headers: H }),
          fetch(`${API}/api/payment/driver/dues?phone=${userPhone}`, { headers: H })
        ]);
        const p = await pRes.json(); const d = await dRes.json();
        setQuickStats({ a: p.wallet_balance || 0, b: d.dues || 0, c: p.vehicle_number || '—' });
      }
    } catch {}
  };
  const detectIntent = (msg) => {
  const m = msg.toLowerCase().trim();

  // Exact patterns
  if (m.match(/collect|kitni aayi|kitna aaya|earning|kamai|received|aaj kitna|आज का/)) return 'collection';
  if (m.match(/kaun.*paid|kisne.*diya|who.*paid|paid.*today|payment.*kiya|paid list/)) return 'who_paid';
  if (m.match(/pending|nahi.*diya|baaki|outstanding|due|kiska baaki/)) return 'pending';
  if (m.match(/ledger|hisab|account|advance|entry|record/)) return 'ledger';
  if (m.match(/assign|de do|lagao|vehicle.*de|gaadi.*de|attach|rent.*set/)) return 'assign';
  if (m.match(/unassign|wapas|remove|hata|free karo|chhod/)) return 'unassign';
  if (m.match(/vehicle|gaadi|fleet|gadi/)) return 'vehicles';
  if (m.match(/driver|kitne log|team/)) return 'drivers';
  if (m.match(/summary|sab batao|full report|update|aaj ka|overview/)) return 'summary';
  if (m.match(/damage|accident|repair|tyre/)) return 'damage';
  if (m.match(/hello|hi |namaste|hey |start|help|madad|kya kar|kya pata/)) return 'hello';

  // Driver
  if (m.match(/mera.*bakaya|mujhe.*dena|kitna.*dena|my due|due/)) return 'my_dues';
  if (m.match(/wallet|balance|mere paisa|paisa kitna/)) return 'my_wallet';
  if (m.match(/meri.*gaadi|mera.*vehicle|my vehicle/)) return 'my_vehicle';
  if (m.match(/pay|payment karo|rent do/)) return 'pay_info';

  // ✅ Nearest word fallback — 3-char prefix match
  const words = m.split(/\s+/);
  const keywordMap = {
    collection: ['col', 'kol', 'earn', 'aay', 'kam'],
    who_paid:   ['pai', 'pay', 'diy', 'kis'],
    pending:    ['pen', 'baa', 'due', 'bak'],
    vehicles:   ['veh', 'gaa', 'fle', 'car', 'tru'],
    drivers:    ['dri', 'tea', 'log'],
    summary:    ['sum', 'rep', 'bat', 'sta'],
    ledger:     ['led', 'his', 'acc'],
    hello:      ['hel', 'nam', 'hey', 'mad', 'kya'],
  };
  for (const [intent, prefixes] of Object.entries(keywordMap)) {
    if (words.some(w => prefixes.some(p => w.startsWith(p)))) return intent;
  }

  return 'unknown';
};
  // ─── DATA FETCHERS ──────────────────────────────────────────────────
  const H = () => ({ Authorization: `Bearer ${token}` });

  const fetchStats = () =>
    fetch(`${API}/api/payment/owner/stats?ownerId=${userId}`, { headers: H() }).then(r => r.json());

  const fetchDriversAndTx = async () => {
    const [dRes, tRes] = await Promise.all([
      fetch(`${API}/api/payment/owner/drivers/list?ownerId=${userId}`, { headers: H() }),
      fetch(`${API}/api/payment/owner/transactions?ownerId=${userId}`, { headers: H() })
    ]);
    const d = await dRes.json(); const t = await tRes.json();
    return {
      drivers: Array.isArray(d) ? d : (d.drivers || []),
      orders: Array.isArray(t) ? t : (t.transactions || [])
    };
  };

  const fetchVehiclesAndDrivers = async () => {
    const [vRes, dRes] = await Promise.all([
      fetch(`${API}/api/payment/owner/vehicles?ownerId=${userId}`, { headers: H() }),
      fetch(`${API}/api/payment/owner/drivers/list?ownerId=${userId}`, { headers: H() })
    ]);
    const v = await vRes.json(); const d = await dRes.json();
    return {
      vehicles: Array.isArray(v) ? v : (v.vehicles || []),
      drivers: Array.isArray(d) ? d : (d.drivers || [])
    };
  };

  const fetchLedger = () =>
    fetch(`${API}/api/payment/owner/driver-ledger?ownerId=${userId}`, { headers: H() }).then(r => r.json());

  const fetchDriverProfile = () =>
    fetch(`${API}/api/payment/driver/profile?phone=${userPhone}`, { headers: H() }).then(r => r.json());

  const fetchDriverDues = () =>
    fetch(`${API}/api/payment/driver/dues?phone=${userPhone}`, { headers: H() }).then(r => r.json());

  // ─── INTENT HANDLERS ────────────────────────────────────────────────
  const hasDriverPaidToday = (phone, orders) => {
    const today = new Date().toISOString().split('T')[0];
    return orders.some(o =>
      o.payer_mobile === phone &&
      o.transaction_status === 'SUCCESS' &&
      o.order_completion_date?.split('T')[0] === today
    );
  };

  const handleIntent = async (intent, msg) => {
    switch (intent) {
      case 'hello': {
  if (isOwner) {
    const [stats, ledger] = await Promise.all([
      fetchStats(),
      fetch(`${API}/api/payment/owner/ledger?period=today`, { headers: H() })
        .then(r => r.json()).catch(() => ({ received: 0 }))
    ]);
    const todayAmt = ledger.received || 0;
    return `Namaste! Main aapka Fleet Assistant hoon.\n\nAaj ka collection: ${todayAmt.toLocaleString('en-IN')} rupaye\nDrivers: ${stats.total_drivers || 0} | Vehicles: ${stats.total_vehicles || 0}\n\nMain in cheezon mein madad kar sakta hoon:\n• Collection aur earnings\n• Kaun paid, kaun pending\n• Vehicle assign/unassign\n• Driver details\n• Ledger aur accounts\n\nKuch bhi poochein!`;
  } else {
    const [profile, dues] = await Promise.all([fetchDriverProfile(), fetchDriverDues()]);
    return `Namaste ${profile.name || ''}! Main aapka Driver Assistant hoon.\n\nBakaya: ${dues.dues || 0} rupaye\nWallet: ${profile.wallet_balance || 0} rupaye\nGaadi: ${profile.vehicle_number || 'assign nahi'}\n\nMain in cheezon mein madad kar sakta hoon:\n• Aapka bakaya\n• Wallet balance\n• Gaadi ki details\n• Payment info`;
  }
}

      case 'collection': {
  const [stats, ledger] = await Promise.all([
    fetchStats(),
    fetch(`${API}/api/payment/owner/ledger?period=today`, { headers: H() })
      .then(r => r.json()).catch(() => ({ received: 0, outstanding: 0 }))
  ]);
  const todayAmt = ledger.received || 0;
  const outstanding = ledger.outstanding || 0;
  return `Aaj ka collection: ${todayAmt.toLocaleString('en-IN')} rupaye\nBaaki outstanding: ${outstanding.toLocaleString('en-IN')} rupaye\nTotal drivers: ${stats.total_drivers || 0}`;
}

      case 'who_paid': {
        const { drivers, orders } = await fetchDriversAndTx();
        const paid = drivers.filter(d => hasDriverPaidToday(d.mobile_number, orders));
        const notPaid = drivers.filter(d => !hasDriverPaidToday(d.mobile_number, orders));
        return `Paid aaj (${paid.length}): ${paid.map(d => d.full_name).join(', ') || 'koi nahi'}\n\nNahi diya (${notPaid.length}): ${notPaid.map(d => d.full_name).join(', ') || 'koi nahi'}`;
      }

      case 'pending': {
        const { drivers, orders } = await fetchDriversAndTx();
        const pending = drivers.filter(d => !hasDriverPaidToday(d.mobile_number, orders));
        if (pending.length === 0) return 'Sabne payment kar di aaj!';
        return `Pending (${pending.length} drivers):\n${pending.map(d => `${d.full_name} - ${d.phone_number || d.mobile_number}`).join('\n')}`;
      }

      case 'ledger': {
        const ledgerData = await fetchLedger();
        if (!ledgerData?.length) return 'Abhi koi ledger data nahi hai.';
        // Specific driver dhundo message mein
        const named = ledgerData.find(d =>
          (d.full_name || '').toLowerCase().split(' ').some(p => p.length > 2 && msg.includes(p.toLowerCase()))
        );
        if (named) {
          const net = parseFloat(named.pending || 0) - parseFloat(named.advance || 0);
          return `${named.full_name}\nKul paid: ${parseFloat(named.total_paid || 0).toLocaleString('en-IN')} rupaye\nPending: ${parseFloat(named.pending || 0).toLocaleString('en-IN')} rupaye\nAdvance: ${parseFloat(named.advance || 0).toLocaleString('en-IN')} rupaye\nNet: ${net > 0 ? net.toLocaleString('en-IN') + ' rupaye baaki' : Math.abs(net).toLocaleString('en-IN') + ' rupaye credit'}`;
        }
        // Overall summary
        const totalPending = ledgerData.reduce((s, d) => s + parseFloat(d.pending || 0), 0);
        const totalPaid = ledgerData.reduce((s, d) => s + parseFloat(d.total_paid || 0), 0);
        return `Kul ledger (${ledgerData.length} drivers):\nTotal collected: ${totalPaid.toLocaleString('en-IN')} rupaye\nTotal pending: ${totalPending.toLocaleString('en-IN')} rupaye\n\nKisi ek driver ka naam lo detail ke liye.`;
      }

      case 'vehicles': {
        const { vehicles, drivers } = await fetchVehiclesAndDrivers();
        const assigned = vehicles.filter(v => v.driver_id);
        const free = vehicles.filter(v => !v.driver_id);
        const list = assigned.map(v => `${v.vehicle_number} - ${v.driver_name || '?'} - ${v.daily_rent} rupaye/day`).join('\n');
        return `Fleet (${vehicles.length} total)\n\nAssigned (${assigned.length}):\n${list || 'koi nahi'}\n\nFree (${free.length}): ${free.map(v => v.vehicle_number).join(', ') || 'koi nahi'}`;
      }

      case 'drivers': {
        const { drivers, orders } = await fetchDriversAndTx();
        const paid = drivers.filter(d => hasDriverPaidToday(d.mobile_number, orders)).length;
        // Specific driver dhundo
        const named = drivers.find(d =>
          (d.full_name || '').toLowerCase().split(' ').some(p => p.length > 2 && msg.includes(p.toLowerCase()))
        );
        if (named) {
          const paidToday = hasDriverPaidToday(named.mobile_number, orders);
          const { vehicles } = await fetchVehiclesAndDrivers();
          const veh = vehicles.find(v => v.driver_id === named.id);
          return `${named.full_name}\nPhone: ${named.phone_number || named.mobile_number}\nAaj payment: ${paidToday ? 'Ho gayi' : 'Nahi hui'}\nVehicle: ${veh?.vehicle_number || 'assign nahi'}\nWallet: ${named.wallet_balance || 0} rupaye`;
        }
        return `Kul drivers: ${drivers.length}\nAaj paid: ${paid}\nPending: ${drivers.length - paid}\n\nKisi driver ka naam lo detail ke liye.`;
      }

      case 'assign': {
        const { vehicles, drivers } = await fetchVehiclesAndDrivers();
        const freeV = vehicles.filter(v => !v.driver_id);
        const freeD = drivers.filter(d => !vehicles.some(v => v.driver_id === d.id));
        const driver = freeD.find(d =>
          (d.full_name || '').toLowerCase().split(' ').some(p => p.length > 2 && msg.includes(p.toLowerCase()))
        );
        const vehicle = freeV.find(v => msg.toLowerCase().includes(v.vehicle_number.toLowerCase()));
        const rentMatch = msg.match(/\b(\d{3,5})\b/);
        const rent = rentMatch ? parseInt(rentMatch[1]) : null;

        if (driver && vehicle && rent) {
          const res = await fetch(`${API}/api/assignment/assign-with-rent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ vehicleId: vehicle.id, driverId: driver.id, rentType: 'DAILY', rentAmount: rent, dailyRent: rent })
          });
          const result = await res.json();
          return result.success
            ? `${vehicle.vehicle_number} assign ho gaya ${driver.full_name} ko. Rent: ${rent} rupaye per day.`
            : `Assignment fail: ${result.error}`;
        }
        if (!driver && !vehicle) return `Driver aur vehicle dono bolo.\n\nFree drivers: ${freeD.map(d => d.full_name).join(', ') || 'koi nahi'}\nFree vehicles: ${freeV.map(v => v.vehicle_number).join(', ') || 'koi nahi'}`;
        if (!driver) return `Konsa driver?\nFree: ${freeD.map(d => d.full_name).join(', ')}`;
        if (!vehicle) return `Konsa vehicle?\nFree: ${freeV.map(v => v.vehicle_number).join(', ')}`;
        if (!rent) return `${driver.full_name} ko ${vehicle.vehicle_number} — rent kitna? (sirf number bolo, jaise 700)`;
        return 'Kuch samajh nahi aaya. Driver naam, vehicle number, aur rent amount bolo.';
      }

      case 'unassign': {
        const { vehicles } = await fetchVehiclesAndDrivers();
        const veh = vehicles.find(v =>
          v.driver_id && msg.toLowerCase().includes(v.vehicle_number.toLowerCase())
        ) || vehicles.find(v =>
          v.driver_id && (v.driver_name || '').toLowerCase().split(' ').some(p => p.length > 2 && msg.includes(p.toLowerCase()))
        );
        if (!veh) {
          const assigned = vehicles.filter(v => v.driver_id);
          return `Konsa vehicle free karna hai?\n${assigned.map(v => `${v.vehicle_number} - ${v.driver_name}`).join('\n')}`;
        }
        const res = await fetch(`${API}/api/assignment/unassign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ vehicleId: veh.id })
        });
        const result = await res.json();
        return result.success ? `${veh.vehicle_number} free ho gaya. ${veh.driver_name} unassigned.` : `Failed: ${result.error}`;
      }

      case 'summary': {
        const [stats, { drivers, orders }, ledgerData] = await Promise.all([
          fetchStats(), fetchDriversAndTx(), fetchLedger()
        ]);
        const paid = drivers.filter(d => hasDriverPaidToday(d.mobile_number, orders)).length;
        const totalPending = (ledgerData || []).reduce((s, d) => s + parseFloat(d.pending || 0), 0);
        return `Aaj ka summary:\nCollection: ${(stats.total_earnings || 0).toLocaleString('en-IN')} rupaye\nDrivers paid: ${paid} out of ${drivers.length}\nPending dues: ${totalPending.toLocaleString('en-IN')} rupaye\nFleet: ${stats.total_vehicles || 0} vehicles\n${drivers.length - paid > 0 ? `\nAbhi baki: ${drivers.filter(d => !hasDriverPaidToday(d.mobile_number, orders)).map(d => d.full_name).join(', ')}` : ''}`;
      }

      // ─── DRIVER INTENTS ───────────────────────────────────────────
      case 'my_dues': {
        const dues = await fetchDriverDues();
        if (dues.dues <= 0) return 'Aaj ka koi bakaya nahi hai!';
        return `Aaj dena hai: ${dues.dues} rupaye\nRent: ${dues.daily_rent || 0} rupaye per day\nAaj paid: ${dues.paid_today || 0} rupaye`;
      }

      case 'my_wallet': {
        const profile = await fetchDriverProfile();
        return `Wallet balance: ${profile.wallet_balance || 0} rupaye\nStatus: ${profile.status || 'Active'}`;
      }

      case 'my_vehicle': {
        const profile = await fetchDriverProfile();
        if (!profile.vehicle_number) return 'Abhi koi vehicle assign nahi hai. Owner se baat karein.';
        return `Gaadi: ${profile.vehicle_number}\nModel: ${profile.vehicle_model || '—'}\nRent: ${profile.vehicle_daily_rent || profile.daily_rent || '—'} rupaye per day`;
      }

      case 'pay_info': {
        const dues = await fetchDriverDues();
        return `Bakaya: ${dues.dues || 0} rupaye\nPayment karne ke liye Dashboard ke Wallet section mein jaayein.\nUPI aur online payment available hai.`;
      }

      case 'hello': {
        if (!isOwner) {
          const [profile, dues] = await Promise.all([fetchDriverProfile(), fetchDriverDues()]);
          return `Namaste ${profile.name || ''}!\nBakaya: ${dues.dues || 0} rupaye\nWallet: ${profile.wallet_balance || 0} rupaye\nGaadi: ${profile.vehicle_number || 'assign nahi'}\n\nKya poochna hai?`;
        }
        break;
      }

      default:
        return null;
    }
  };
const processMessage = async (userMessage) => {
  const msg = userMessage.toLowerCase().trim();
  const intent = detectIntent(msg);

  // Known intent handle karo
  if (intent !== 'unknown') {
    try {
      const result = await handleIntent(intent, msg);
      if (result) return result;
    } catch (err) {
      console.error('Intent handler error:', err);
    }
  }

  // Unknown ya intent fail — LLM try karo
  try {
    const statsRaw = await fetchStats().catch(() => ({}));
    const res = await fetch(`${API}/api/payment/chatbot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        message: userMessage,
        context: { role: userRole, ...statsRaw, userId, userPhone },
        history: messages.slice(-6).map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
      })
    });
    const d = await res.json();
    if (d.reply || d.message) return d.reply || d.message;
  } catch {}

  // Final fallback — helpful hint
  return isOwner
    ? 'Yeh samajh nahi aaya. Try karein:\n"collection", "pending", "vehicles", "summary", ya kisi driver ka naam bolein.'
    : 'Yeh samajh nahi aaya. Try karein:\n"mera bakaya", "wallet", "meri gaadi"';
};

  const handleUserMessage = async (message) => {
    if (!message.trim()) return;
    addMessage('user', message);
    setInputText('');
    setIsProcessing(true);
    try {
      const response = await processMessage(message);
      addMessage('bot', response);
      setTimeout(() => speak(response), 300);
    } catch {
      const err = 'Kuch gadbad ho gayi. Dobara try karein.';
      addMessage('bot', err);
      setTimeout(() => speak(err), 300);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSend = () => {
    unlockTTS();
    if (inputText.trim()) handleUserMessage(inputText);
  };

  // ─── RENDER ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white" style={{ maxWidth: 412, margin: '0 auto', left: 0, right: 0 }}>

      {/* Header */}
      <div className={`p-4 flex items-center justify-between ${isOwner ? 'bg-gradient-to-r from-blue-600 to-indigo-700' : 'bg-gradient-to-r from-green-600 to-emerald-700'} text-white`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
            {isOwner ? '🏢' : '🚛'}
          </div>
          <div>
            <h3 className="font-black">{isOwner ? 'Fleet Assistant' : 'Driver Assistant'}</h3>
            <p className="text-[10px] opacity-80">
              {isSpeaking ? '🔊 Bol raha hoon...' : isListening ? '🎤 Sun raha hoon...' : 'Hindi / English • Voice Enabled'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <X size={16} />
        </button>
      </div>

      {/* Quick Stats */}
      {quickStats && (
        <div className="px-4 py-2 bg-slate-100 border-b flex justify-around">
          {isOwner ? (
            <>
              <div className="text-center"><IndianRupee size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">₹{quickStats.a}</p><p className="text-[7px] text-slate-400">Collection</p></div>
              <div className="text-center"><Users size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">{quickStats.b}</p><p className="text-[7px] text-slate-400">Drivers</p></div>
              <div className="text-center"><Truck size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">{quickStats.c}</p><p className="text-[7px] text-slate-400">Vehicles</p></div>
            </>
          ) : (
            <>
              <div className="text-center"><Wallet size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">₹{quickStats.a}</p><p className="text-[7px] text-slate-400">Wallet</p></div>
              <div className="text-center"><CreditCard size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">₹{quickStats.b}</p><p className="text-[7px] text-slate-400">Due</p></div>
              <div className="text-center"><Truck size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">{quickStats.c}</p><p className="text-[7px] text-slate-400">Vehicle</p></div>
            </>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
              ? (isOwner ? 'bg-blue-600 text-white rounded-br-none' : 'bg-green-600 text-white rounded-br-none')
              : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm'}`}>
              {msg.role === 'bot' && <span className="text-xs mr-1">{isOwner ? '🏢' : '🚛'}</span>}
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
              <Loader size={14} className="animate-spin text-blue-600" />
              <span className="text-xs text-slate-400">Data fetch kar raha hoon...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick chips — sirf shuru mein */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 bg-white border-t flex gap-2 flex-wrap">
          {(isOwner
            ? ['Collection?', 'Kaun paid?', 'Pending?', 'Summary', 'Vehicles?', 'Drivers?']
            : ['Mera bakaya?', 'Wallet?', 'Meri gaadi?', 'Aaj kitna dena?']
          ).map(q => (
            <button key={q}
              onClick={() => { unlockTTS(); handleUserMessage(q); }}
              className="text-[10px] font-black px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-200 hover:bg-blue-100 transition">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t bg-white flex-shrink-0">
        <div className="flex gap-2">
          <button
            onClick={startListening}
            disabled={isListening || isProcessing}
            className={`p-3 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-blue-100'}`}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? 'Sun raha hoon...' : 'Kuch bhi poochein...'}
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            disabled={isListening}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isProcessing}
            className="p-3 bg-blue-600 text-white rounded-xl disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
