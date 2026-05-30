// frontend/src/components/Chatbot.js
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Send, Volume2, VolumeX, Loader, Wallet, CreditCard, Truck, Users, IndianRupee } from 'lucide-react';

const API = 'https://mg-qw5s.onrender.com';

export default function Chatbot({ userRole, userId, userPhone, token, onClose, persistedMessages, onMessagesUpdate }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const storageKey = `mg_chat_${userRole}`;

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
  const [data, setUserData] = useState(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // ✅ FIX 1: Voices cache — mobile pe voiceschanged ek baar hi fire hoti hai
  const cachedVoicesRef = useRef([]);
  // ✅ FIX 2: TTS unlock ref — iOS/Android ke liye
  const ttsUnlockedRef = useRef(false);

  const isOwner = userRole === 'OWNER';

  // Welcome message
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 0) {
        const welcome = isOwner
          ? 'नमस्ते! Main aapka Fleet Assistant hoon. 🏢\n\nCollection, driver status, vehicle assignment — kuch bhi poochein!'
          : 'नमस्ते! Main aapka Driver Assistant hoon. 🚛\n\nBakaya, wallet, vehicle — kuch bhi poochein!';
        return [{ role: 'bot', content: welcome }];
      }
      return prev;
    });
    fetchUserData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages.slice(-50)));
      } catch {}
    }
  }, [messages]);

  // ✅ FIX 3: Cache voices on load — mobile ke liye
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) cachedVoicesRef.current = v;
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // ✅ FIX 4: iOS TTS keepalive — 15 sec ke baad ruk jaata tha
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.speechSynthesis?.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 14000);
    return () => clearInterval(interval);
  }, []);

  // Speech Recognition setup
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;        // ✅ Bar bar mute nahi hoga
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'hi-IN';

    recognitionRef.current.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      setInputText(final || interim);
      if (final) {
        recognitionRef.current.stop();              // ✅ Final milne pe stop
        handleUserMessage(final.trim());
        setIsListening(false);
      }
    };

    recognitionRef.current.onerror = (event) => {
      setIsListening(false);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        addMessage('bot', 'Mic permission required. Browser settings mein allow karein.');
      }
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };
  }, []);

  // ✅ FIX 5: TTS unlock — iOS/Android pehle user gesture chahta hai
  const unlockTTS = () => {
    if (ttsUnlockedRef.current || !('speechSynthesis' in window)) return;
    try {
      const silent = new SpeechSynthesisUtterance('');
      silent.volume = 0;
      window.speechSynthesis.speak(silent);
      ttsUnlockedRef.current = true;
    } catch (e) {}
  };

  // ✅ FIX 6: speak() — cached voices + no voiceschanged wait + delay
  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;

    try {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    } catch (e) {}

    window.speechSynthesis.cancel();

    const speakable = text
      .replace(/₹/g, 'rupaye')
      .replace(/[^\x00-\x7F\u0900-\u097F\s0-9.,!?]/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (!speakable) return;
    setIsSpeaking(true);

    // ✅ Cached voices use karo — voiceschanged ka wait mat karo
    const voices = cachedVoicesRef.current.length > 0
      ? cachedVoicesRef.current
      : window.speechSynthesis.getVoices();

    const best =
      voices.find(v => v.lang === 'hi-IN') ||
      voices.find(v => v.lang?.startsWith('hi')) ||
      voices.find(v => v.lang === 'en-IN') ||
      voices.find(v => v.lang?.startsWith('en')) ||
      voices[0];

    const u = new SpeechSynthesisUtterance(speakable);
    if (best) { u.voice = best; u.lang = best.lang; }
    else u.lang = 'hi-IN';
    u.rate = 0.85;
    u.volume = 1.0;
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);

    // ✅ 300ms delay — cancel ke baad turant speak mobile pe block hota hai
    setTimeout(() => {
      try { window.speechSynthesis.speak(u); }
      catch (e) { setIsSpeaking(false); }
    }, 300);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // ✅ FIX 7: startListening — unlockTTS + stop before start
  const startListening = () => {
    unlockTTS(); // User gesture = TTS unlock
    if (!recognitionRef.current) {
      addMessage('bot', 'Speech recognition supported nahi hai. Please type karein.');
      return;
    }
    try { recognitionRef.current.stop(); } catch (e) {}
    setTimeout(() => {
      try {
        setInputText('');
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        setIsListening(false);
      }
    }, 200);
  };

  const addMessage = (role, content) => {
    setMessages(prev => {
      const updated = [...prev, { role, content }];
      if (onMessagesUpdate) onMessagesUpdate(updated);
      return updated;
    });
  };

  const fetchUserData = async () => {
    try {
      const H = { Authorization: `Bearer ${token}` };
      let freshData = {};

      if (isOwner) {
        const [statsRes, vehiclesRes, driversRes, ordersRes] = await Promise.all([
          fetch(`${API}/api/payment/owner/stats?ownerId=${userId}`, { headers: H }),
          fetch(`${API}/api/payment/owner/vehicles?ownerId=${userId}`, { headers: H }),
          fetch(`${API}/api/payment/owner/drivers/list?ownerId=${userId}`, { headers: H }),
          fetch(`${API}/api/payment/owner/transactions?ownerId=${userId}`, { headers: H })
        ]);
        const stats = await statsRes.json();
        const vehicles = await vehiclesRes.json();
        const driversData = await driversRes.json();
        const orders = await ordersRes.json();
        freshData = {
          totalVehicles: stats.total_vehicles || 0,
          totalDrivers: stats.total_drivers || 0,
          todayCollection: stats.total_earnings || 0,
          vehicles: Array.isArray(vehicles) ? vehicles : [],
          drivers: Array.isArray(driversData) ? driversData : (driversData.drivers || []),
          orders: Array.isArray(orders) ? orders : []
        };
      } else {
        const [profileRes, duesRes, txRes] = await Promise.all([
          fetch(`${API}/api/payment/driver/profile?phone=${userPhone}`, { headers: H }),
          fetch(`${API}/api/payment/driver/dues?phone=${userPhone}`, { headers: H }),
          fetch(`${API}/api/payment/my-transactions?phone=${userPhone}`, { headers: H })
        ]);
        const profile = await profileRes.json();
        const dues = await duesRes.json();
        const transactions = await txRes.json();
        freshData = {
          name: profile.full_name || profile.name || 'Driver',
          vehicleNumber: profile.vehicle_number || 'Not Assigned',
          walletBalance: profile.wallet_balance || 0,
          dailyRent: dues.daily_rent || 850,
          todayDues: dues.dues || 0,
          paidToday: dues.paid_today || 0,
          transactions: Array.isArray(transactions) ? transactions : []
        };
      }
      setUserData(freshData);
      return freshData;
    } catch (err) {
      console.error('fetchUserData error:', err);
      return null;
    }
  };

  const hasDriverPaidToday = (driverPhone, orders) => {
    const today = new Date().toISOString().split('T')[0];
    return orders.some(order =>
      order.payer_mobile === driverPhone &&
      order.transaction_status === 'SUCCESS' &&
      order.order_completion_date?.split('T')[0] === today
    );
  };

  const processIntent = async (userMessage) => {
    const msg = userMessage.toLowerCase().trim();
    const freshData = await fetchUserData();
    if (!freshData) return 'Data load nahi hua. Internet check karein.';

    if (isOwner) {
      // Collection
      if (msg.match(/collection|kitna|aaya|earning|kamai|received|total|पैसे/)) {
        const today = new Date().toDateString();
        const todayEarnings = (freshData.orders || [])
          .filter(o => o.transaction_status === 'SUCCESS' &&
            new Date(o.order_completion_date).toDateString() === today)
          .reduce((sum, o) => sum + parseFloat(o.order_amount || 0), 0);
        return `aaj ka collection: ${todayEarnings.toLocaleString('en-IN')} rupaye\nTotal lifetime: ${freshData.todayCollection.toLocaleString('en-IN')} rupaye`;
      }

      // Who paid
      if (msg.match(/paid|pay|diya|kisne|who|kiya/)) {
        const paid = [], notPaid = [];
        for (const d of (freshData.drivers || []))
          hasDriverPaidToday(d.mobile_number, freshData.orders) ? paid.push(d.full_name) : notPaid.push(d.full_name);
        return `Paid (${paid.length}): ${paid.join(', ') || 'koi nahi'}\nNahi diya (${notPaid.length}): ${notPaid.join(', ') || 'koi nahi'}`;
      }

      // Pending
      if (msg.match(/nahi|nhi|pending|due|baaki|outstanding/)) {
        const notPaid = (freshData.drivers || []).filter(d => !hasDriverPaidToday(d.mobile_number, freshData.orders)).map(d => d.full_name);
        return notPaid.length === 0 ? 'Sabne payment kar di!' : `Pending (${notPaid.length}):\n${notPaid.join('\n')}`;
      }

      // Assign
      if (msg.match(/assign|de do|lagao|vehicle de|gaadi de/)) {
        const freeDrivers = (freshData.drivers || []).filter(d => !freshData.vehicles.some(v => v.driver_id === d.id));
        const freeVehicles = (freshData.vehicles || []).filter(v => !v.driver_id);
        const driver = freeDrivers.find(d =>
          (d.full_name || '').toLowerCase().split(' ').some(p => p.length > 2 && msg.includes(p))
        );
        const vehicle = freeVehicles.find(v => msg.includes(v.vehicle_number.toLowerCase()));
        const rentMatch = msg.match(/(\d{3,5})/);
        const rentAmount = rentMatch ? parseInt(rentMatch[1]) : null;

        if (driver && vehicle && rentAmount) {
          try {
            const res = await fetch(`${API}/api/assignment/assign-with-rent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ vehicleId: vehicle.id, driverId: driver.id, rentType: 'DAILY', rentAmount, dailyRent: rentAmount })
            });
            const result = await res.json();
            return result.success
              ? `Done! ${vehicle.vehicle_number} assigned to ${driver.full_name} at ${rentAmount} rupaye per day`
              : `Failed: ${result.error}`;
          } catch { return 'Network error.'; }
        }
        if (!driver && !vehicle) return `Driver aur vehicle specify karein.\nFree drivers: ${freeDrivers.map(d => d.full_name).join(', ')}\nFree vehicles: ${freeVehicles.map(v => v.vehicle_number).join(', ')}`;
        if (!driver) return `Konsa driver? Free hain:\n${freeDrivers.map(d => d.full_name).join('\n')}`;
        if (!vehicle) return `Konsa vehicle? Free hain:\n${freeVehicles.map(v => v.vehicle_number).join('\n')}`;
        if (!rentAmount) return `${driver.full_name} ko ${vehicle.vehicle_number} - rent kitna? Jaise "700 rupaye daily"`;
      }

      // Vehicles
      if (msg.match(/vehicle|gaadi|fleet|assigned|rent/)) {
        const assigned = (freshData.vehicles || []).filter(v => v.driver_id);
        const free = (freshData.vehicles || []).filter(v => !v.driver_id);
        const list = assigned.map(v => `${v.driver_name} - ${v.vehicle_number} - ${v.daily_rent} rupaye per day`).join('\n');
        return `Assigned (${assigned.length}):\n${list || 'koi nahi'}\n\nFree (${free.length}): ${free.map(v => v.vehicle_number).join(', ') || 'koi nahi'}`;
      }

      // Drivers
      if (msg.match(/driver|kitne log|team/))
        return `Kul ${freshData.totalDrivers} drivers hain.`;

      // Summary
      if (msg.match(/summary|sab|batao|update|report|status/)) {
        const paid = (freshData.drivers || []).filter(d => hasDriverPaidToday(d.mobile_number, freshData.orders)).length;
        return `Collection: ${freshData.todayCollection.toLocaleString('en-IN')} rupaye\nPaid: ${paid} out of ${freshData.totalDrivers}\nFleet: ${freshData.totalVehicles} vehicles`;
      }

      // Individual driver
      const named = (freshData.drivers || [])
        .map(d => ({ d, score: (d.full_name || '').toLowerCase().split(' ').filter(p => p.length > 2 && msg.includes(p)).length }))
        .filter(x => x.score > 0).sort((a, b) => b.score - a.score)[0]?.d;
      if (named) {
        const paid = hasDriverPaidToday(named.mobile_number, freshData.orders);
        const veh = (freshData.vehicles || []).find(v => v.driver_id === named.id);
        return `${named.full_name}\n${paid ? 'Aaj payment ho gayi' : 'Aaj payment nahi hui'}\nVehicle: ${veh?.vehicle_number || 'koi nahi'}\nWallet: ${named.wallet_balance || 0} rupaye`;
      }

      // Hello
      if (msg.match(/hello|hi|namaste|hey/)) {
        const unpaid = (freshData.drivers || []).filter(d => !hasDriverPaidToday(d.mobile_number, freshData.orders)).length;
        return `Namaste! ${freshData.todayCollection.toLocaleString('en-IN')} rupaye collect hua. ${unpaid} drivers ka payment baaki hai.`;
      }

    } else {
      // Driver intents
      if (msg.match(/bakaya|due|kitna dena|pending/)) return freshData.todayDues <= 0 ? 'Koi bakaya nahi!' : `${freshData.todayDues} rupaye bakaya hai.`;
      if (msg.match(/wallet|balance|paisa/)) return `Wallet balance: ${freshData.walletBalance} rupaye`;
      if (msg.match(/pay|diya|paid/)) return freshData.paidToday > 0 ? 'Haan, aaj pay kar diya.' : `Nahi, bakaya ${freshData.todayDues} rupaye hai`;
      if (msg.match(/vehicle|gaadi/)) return freshData.vehicleNumber === 'Not Assigned' ? 'Vehicle assign nahi hai.' : `Vehicle: ${freshData.vehicleNumber} - ${freshData.dailyRent} rupaye per day`;
      if (msg.match(/hello|hi|namaste/)) return `Namaste! Bakaya: ${freshData.todayDues} rupaye. Wallet: ${freshData.walletBalance} rupaye`;
    }

    // OpenRouter fallback
    try {
      const recentHistory = messages.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));
      const res = await fetch(`${API}/api/payment/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMessage, context: freshData, history: recentHistory })
      });
      const d = await res.json();
      return d.reply || d.message || '"summary" type karein poori jankari ke liye.';
    } catch {
      return '"summary" type karein poori jankari ke liye.';
    }
  };

  const handleUserMessage = async (message) => {
    if (!message.trim()) return;
    addMessage('user', message);
    setInputText('');
    setIsProcessing(true);
    try {
      const response = await processIntent(message);
      addMessage('bot', response);
      // ✅ 300ms delay before speak
      setTimeout(() => speak(response), 300);
    } catch (error) {
      addMessage('bot', 'Kuch galat ho gaya. Please dobara try karein.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSend = () => {
    unlockTTS(); // ✅ User gesture = TTS unlock
    if (inputText.trim()) handleUserMessage(inputText);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white" style={{ maxWidth: 412, margin: '0 auto', left: 0, right: 0 }}>
      {/* Header */}
      <div className={`p-4 rounded-t-3xl flex items-center justify-between ${isOwner ? 'bg-gradient-to-r from-blue-600 to-indigo-700' : 'bg-gradient-to-r from-green-600 to-emerald-700'} text-white`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-xl">{isOwner ? '🏢' : '🚛'}</span>
          </div>
          <div>
            <h3 className="font-black">{isOwner ? 'Fleet Assistant' : 'Driver Assistant'}</h3>
            <p className="text-[10px] opacity-80">Hindi / English • Voice Enabled</p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* ✅ Volume button — replay last message */}
          <button
            onClick={() => {
              unlockTTS();
              if (isSpeaking) {
                stopSpeaking();
              } else {
                const lastBot = [...messages].reverse().find(m => m.role === 'bot');
                if (lastBot) speak(lastBot.content);
              }
            }}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
          >
            {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {data && (
        <div className="px-4 py-2 bg-slate-100 border-b flex justify-around">
          {isOwner ? (
            <>
              <div className="text-center"><IndianRupee size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">{data.todayCollection}</p><p className="text-[7px] text-slate-400">Collection</p></div>
              <div className="text-center"><Users size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">{data.totalDrivers}</p><p className="text-[7px] text-slate-400">Drivers</p></div>
              <div className="text-center"><Truck size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">{data.totalVehicles}</p><p className="text-[7px] text-slate-400">Vehicles</p></div>
            </>
          ) : (
            <>
              <div className="text-center"><Wallet size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">{data.walletBalance}</p><p className="text-[7px] text-slate-400">Wallet</p></div>
              <div className="text-center"><CreditCard size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">{data.todayDues}</p><p className="text-[7px] text-slate-400">Due Today</p></div>
              <div className="text-center"><Truck size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">{data.vehicleNumber === 'Not Assigned' ? '—' : '✓'}</p><p className="text-[7px] text-slate-400">Vehicle</p></div>
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
              : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'}`}>
              {msg.role === 'bot' && <span className="text-xs font-black mr-1">{isOwner ? '🏢' : '🚛'}</span>}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-slate-200">
              <Loader size={16} className="animate-spin text-blue-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white rounded-b-3xl flex-shrink-0">
        <div className="flex gap-2">
          <button
            onClick={startListening}
            disabled={isListening}
            className={`p-3 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-blue-100'}`}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Hindi ya English mein likhein / bolein..."
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
            disabled={isListening}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isProcessing}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
        <div className="mt-2 text-center">
          <p className="text-[9px] text-slate-400">
            Bolein: {isOwner ? '"aaj ka collection?"' : '"mera bakaya?"'} • Type "help" for commands
          </p>
        </div>
      </div>
    </div>
  );
}