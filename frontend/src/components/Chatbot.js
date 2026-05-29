// frontend/src/components/UniversalChatbot.js
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Send, Volume2, VolumeX, Loader, Wallet, CreditCard, Bell, Truck, Users, IndianRupee } from 'lucide-react';

const API = 'https://mg-qw5s.onrender.com';

export default function Chatbot({ userRole, userId, userPhone, token, onClose, persistedMessages, onMessagesUpdate}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const storageKey = `mg_chat_${userRole}_${userId || userPhone}`;
const [messages, setMessages] = useState(() => {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) return JSON.parse(saved);
  } catch {}
  return persistedMessages?.length > 0 ? persistedMessages : [];
});
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [data,setUserData] = useState(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const isOwner = userRole === 'OWNER';

  // Initialize welcome message
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

  // Fetch user data based on role
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
        drivers: driversData.drivers || [],
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
    return freshData; // ← YE ADD KARO
  } catch (err) {
    console.error('Error fetching user data:', err);
    return null;
  }
};

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-IN';

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
    handleUserMessage(final);
    setIsListening(false);
  }
};

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        addMessage('bot', 'माफ करें, मैं आपकी बात नहीं सुन पाया। कृपया फिर से बोलें।\n\nSorry, I could not hear you. Please try again.');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);
  const speak = (text) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const speakable = text
    .replace(/[^\x00-\x7F\u0900-\u097F\s]/g, '') // emojis, ₹ etc. hata
    .replace(/\n+/g, '. ')
    .trim();

  if (!speakable) return;
  setIsSpeaking(true);

  const doSpeak = () => {
    const voices = window.speechSynthesis.getVoices();
    const best = 
      voices.find(v => v.name === 'Google हिन्दी') ||
      voices.find(v => v.name.includes('Lekha')) ||
      voices.find(v => v.name.includes('Heera')) ||
      voices.find(v => v.lang === 'hi-IN') ||
      voices.find(v => v.lang === 'en-IN');

    const u = new SpeechSynthesisUtterance(speakable);
    if (best) u.voice = best;
    u.lang = /[\u0900-\u097F]/.test(speakable) ? 'hi-IN' : 'en-IN';
    u.rate = 0.88;
    u.pitch = 1.0;
    u.volume = 1.0;
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  window.speechSynthesis.getVoices().length === 0
    ? window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true })
    : doSpeak();
};

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Could not start recognition:', error);
      }
    } else {
      addMessage('bot', 'Speech recognition is not supported in your browser. Please type your question.');
    }
  };
  const addMessage = (role, content) => {
  setMessages(prev => {
    const updated = [...prev, { role, content }];
    try { localStorage.setItem(storageKey, JSON.stringify(updated.slice(-50))); } catch {}
    if (onMessagesUpdate) onMessagesUpdate(updated);
    return updated;
  });
};

  // Check if driver paid today
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
  const data = await fetchUserData();
  if (!data) return "Data load nahi hua.";

  if (isOwner) {
    // Collection
    if (msg.match(/collection|kitna|aaya|earning|kamai|received|total|पैसे|इलेक्शन/)) {
  const today = new Date().toDateString();
  const todayEarnings = (data.orders || [])
    .filter(o => o.transaction_status === 'SUCCESS' && 
      new Date(o.order_completion_date).toDateString() === today)
    .reduce((sum, o) => sum + parseFloat(o.order_amount || 0), 0);
  return `💰 आज का collection: ₹${todayEarnings.toLocaleString('en-IN')}\n📊 Total (lifetime): ₹${data.todayCollection.toLocaleString('en-IN')}`;
}

    // Who paid
    if (msg.match(/paid|pay|diya|de diya|kiya|kisne|who|किसने|दिया|पेमेंट/))  {
      const paid = [], notPaid = [];
      for (const d of (data.drivers || []))
        hasDriverPaidToday(d.mobile_number, data.orders) ? paid.push(d.full_name) : notPaid.push(d.full_name);
      return `✅ Paid (${paid.length}): ${paid.join(', ') || 'कोई नहीं'}\n❌ Nahi diya (${notPaid.length}): ${notPaid.join(', ') || 'कोई नहीं'}`;
    }
    // Drivers without vehicle
    if (msg.match(/vehicle|gaadi/) && msg.match(/nahi|nahin|nhi|free|without/)) {
      const noVehicle = (data.drivers || []).filter(d =>
        !(data.vehicles || []).some(v => v.driver_id === d.id)
      );
      return noVehicle.length === 0
        ? `✅ सभी drivers को vehicle assigned है!`
        : `🚫 Vehicle नहीं है (${noVehicle.length}):\n${noVehicle.map(d => d.full_name).join('\n')}`;
    }
    // Who hasn't paid
    if (msg.match(/nahi|nhi|pending|due|baaki|outstanding|नहीं|बाकी/)) {
      const notPaid = (data.drivers || []).filter(d => !hasDriverPaidToday(d.mobile_number, data.orders)).map(d => d.full_name);
      return notPaid.length === 0 ? `🎉 सभी ने payment कर दी!` : `❌ Pending:\n${notPaid.join('\n')}`;
    }
    // Notification bhejo
if (msg.match(/notification|notify|remind|bhejo|send|याद|भेजो/)) {
  try {
    const notifRes = await fetch(`${API}/api/payment/owner/notify-unpaid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    });
    const notifData = await notifRes.json();
    const today = new Date().toDateString();
    const unpaid = (data.drivers || []).filter(d => !hasDriverPaidToday(d.mobile_number, data.orders));
    return notifData.success
      ? `✅ ${notifData.count} drivers ko payment reminder bheja gaya:\n${unpaid.map(d => d.full_name).join(', ')}`
      : `❌ Notification send nahi ho paya.`;
  } catch {
    return `❌ Notification service unavailable.`;
  }
}
// ASSIGN DRIVER TO VEHICLE
if (msg.match(/assign|de do|dedo|lagao|dal do|vehicle de|gaadi de|attach|jod do/)) {
  const freeDrivers = (data.drivers || []).filter(d => !data.vehicles.some(v => v.driver_id === d.id));
  const freeVehicles = (data.vehicles || []).filter(v => !v.driver_id);

  // Driver dhundo message mein
  const driver = freeDrivers.find(d => {
    const parts = (d.full_name || '').toLowerCase().split(' ');
    return parts.some(p => p.length > 2 && msg.includes(p));
  });

  // Vehicle dhundo message mein
  const vehicle = freeVehicles.find(v =>
    msg.includes(v.vehicle_number.toLowerCase())
  );

  // Rent nikalo
  const rentMatch = msg.match(/(\d{2,5})/);
  const rentAmount = rentMatch ? parseInt(rentMatch[1]) : null;

  if (driver && vehicle && rentAmount) {
    try {
      const tkn = localStorage.getItem('token');
      const res = await fetch(`${API}/api/assignment/assign-with-rent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tkn}` },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          driverId: driver.id,
          rentType: 'DAILY',
          rentAmount: rentAmount,
          dailyRent: rentAmount
        })
      });
      const result = await res.json();
      return result.success
        ? `✅ Done! ${vehicle.vehicle_number} → ${driver.full_name} @ ₹${rentAmount}/day\nDB updated!`
        : `❌ Failed: ${result.error}`;
    } catch {
      return `❌ Network error.`;
    }
  }

  // Missing info — guide karo
  if (!driver && !vehicle) {
    return `Driver aur vehicle dono specify karein.\n\nFree drivers: ${freeDrivers.map(d => d.full_name).join(', ')}\nFree vehicles: ${freeVehicles.map(v => v.vehicle_number).join(', ')}`;
  }
  if (!driver) return `Konsa driver? Free hain:\n${freeDrivers.map(d => d.full_name).join('\n')}`;
  if (!vehicle) return `Konsa vehicle? Free hain:\n${freeVehicles.map(v => v.vehicle_number).join('\n')}`;
  if (!rentAmount) return `${driver.full_name} ko ${vehicle.vehicle_number} — rent kitna? (e.g. "300 rupaye daily")`;
}

// UNASSIGN
if (msg.match(/wapas lo|hata do|remove|unassign|free karo|chhod do/)) {
  const namedForUnassign = (data.drivers || [])
    .map(d => ({ d, score: (d.full_name||'').toLowerCase().split(' ').filter(p => p.length > 2 && msg.includes(p)).length }))
    .filter(x => x.score > 0).sort((a,b) => b.score - a.score)[0]?.d;
  const vehForUnassign = namedForUnassign
    ? (data.vehicles || []).find(v => v.driver_id === namedForUnassign.id)
    : (data.vehicles || []).find(v => msg.includes(v.vehicle_number.toLowerCase()));

  if (vehForUnassign) {
    try {
      const tkn = localStorage.getItem('token');
      const res = await fetch(`${API}/api/assignment/unassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tkn}` },
        body: JSON.stringify({ vehicleId: vehForUnassign.id })
      });
      const result = await res.json();
      return result.success
        ? `✅ ${vehForUnassign.vehicle_number} unassigned! Vehicle free hai ab.`
        : `❌ Failed: ${result.error}`;
    } catch {
      return `❌ Network error.`;
    }
  }
  return `Kiska vehicle free karna hai? Driver naam ya vehicle number bolein.`;
}
    // Vehicles
    if (msg.match(/vehicle|gaadi|fleet|gadi|assigned|rent|किराया|गाड़ी/)) {
  const assigned = (data.vehicles || []).filter(v => v.driver_id);
const free = (data.vehicles || []).filter(v => !v.driver_id);
const vehicleList = assigned.map(v => 
  `${v.driver_name || 'Unknown'} → ${v.vehicle_number} @ ₹${v.daily_rent}/day`
).join('\n');
return `🚛 Assigned (${assigned.length}):\n${vehicleList || 'कोई नहीं'}\n\n⚠️ Free (${free.length}): ${free.map(v => v.vehicle_number).join(', ') || 'कोई नहीं'}`;
  const list = assigned.map(v => `${v.driver_name} → ${v.vehicle_number} @ ₹${v.daily_rent}/day`).join('\n');
  return `🚛 Assigned (${assigned.length}):\n${list || 'कोई नहीं'}\n\n⚠️ Free (${free.length}): ${free.map(v => v.vehicle_number).join(', ') || 'कोई नहीं'}`;
}

    // Drivers
    if (msg.match(/driver|kitne log|team|ड्राइवर|कितने/))
      return `👥 कुल ${data.totalDrivers} drivers हैं।`;

    // Summary
    if (msg.match(/summary|sab|batao|update|report|status|बताओ|सब/)) {
      const paid = (data.drivers || []).filter(d => hasDriverPaidToday(d.mobile_number, data.orders)).length;
      return `📊 Collection: ₹${data.todayCollection.toLocaleString('en-IN')}\n✅ Paid: ${paid}/${data.totalDrivers}\n🚛 Fleet: ${data.totalVehicles}`;
    }

    // Individual driver
    const named = (data.drivers || [])
      .map(d => ({ d, score: (d.full_name||'').toLowerCase().split(' ').filter(p => p.length > 2 && msg.includes(p)).length }))
      .filter(x => x.score > 0).sort((a,b) => b.score - a.score)[0]?.d;
    if (named) {
      const paid = hasDriverPaidToday(named.mobile_number, data.orders);
      const veh = (data.vehicles || []).find(v => v.driver_id === named.id);
      return `👤 ${named.full_name}\n${paid ? '✅ Paid today' : '❌ Not paid'}\n🚛 ${veh?.vehicle_number || 'No vehicle'}\n💰 ₹${named.wallet_balance || 0}`;
    }

    // Hello
    if (msg.match(/hello|hi|namaste|hey|haan|नमस्ते/)) {
      const unpaid = (data.drivers || []).filter(d => !hasDriverPaidToday(d.mobile_number, data.orders)).length;
      return `नमस्ते! 💰 ₹${data.todayCollection.toLocaleString('en-IN')} collected. ❌ ${unpaid} drivers pending.`;
    }

  } else {
    if (msg.match(/bakaya|due|kitna dena|pending|बकाया/)) return data.todayDues <= 0 ? `🎉 कोई बकाया नहीं!` : `🚨 ₹${data.todayDues} बकाया है।`;
    if (msg.match(/wallet|balance|paisa|वॉलेट/)) return `💰 Wallet: ₹${data.walletBalance}`;
    if (msg.match(/pay|diya|paid|दिया/)) return data.paidToday > 0 ? `✅ हाँ, आज pay कर दिया।` : `❌ नहीं, बकाया ₹${data.todayDues}`;
    if (msg.match(/vehicle|gaadi|गाड़ी/)) return data.vehicleNumber === 'Not Assigned' ? `🚨 Vehicle assign नहीं।` : `🚛 ${data.vehicleNumber} — ₹${data.dailyRent}/day`;
    if (msg.match(/hello|hi|namaste|नमस्ते/)) return `नमस्ते! बकाया: ₹${data.todayDues} | Wallet: ₹${data.walletBalance}`;
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
  body: JSON.stringify({ message: userMessage, context: data, history: recentHistory })
});
    const d = await res.json();
    return d.reply || d.message || `"summary" type karein poori jankari ke liye.`;
  } catch {
    return `"summary" type karein poori jankari ke liye.`;
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
      speak(response);
    } catch (error) {
      console.error('Error:', error);
      addMessage('bot', 'क्षमा करें, कुछ गड़बड़ हो गई। कृपया फिर से कोशिश करें।\n\nSorry, something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSend = () => {
    if (inputText.trim()) {
      handleUserMessage(inputText);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-2">
      <div className="bg-white rounded-3xl w-full max-w-md h-[min(600px,85vh)] flex flex-col shadow-2xl">
        {/* Header */}
        <div className={`p-4 rounded-t-3xl flex items-center justify-between ${isOwner ? 'bg-gradient-to-r from-blue-600 to-indigo-700' : 'bg-gradient-to-r from-green-600 to-emerald-700'} text-white`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-xl">{isOwner ? '🏢' : '🚛'}</span>
            </div>
            <div>
              <h3 className="font-black">{isOwner ? 'Fleet Assistant' : 'Driver Assistant'}</h3>
              <p className="text-[10px] opacity-80">हिंदी / English • Voice Enabled</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={isSpeaking ? stopSpeaking : () => {}} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        {data && (
          <div className={`px-4 py-2 bg-slate-100 border-b flex justify-around ${isOwner ? '' : ''}`}>
            {isOwner ? (
              <>
                <div className="text-center"><IndianRupee size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">₹{data.todayCollection}</p><p className="text-[7px] text-slate-400">Collection</p></div>
                <div className="text-center"><Users size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">{data.totalDrivers}</p><p className="text-[7px] text-slate-400">Drivers</p></div>
                <div className="text-center"><Truck size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">{data.totalVehicles}</p><p className="text-[7px] text-slate-400">Vehicles</p></div>
              </>
            ) : (
              <>
                <div className="text-center"><Wallet size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">₹{data.walletBalance}</p><p className="text-[7px] text-slate-400">Wallet</p></div>
                <div className="text-center"><CreditCard size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">₹{data.todayDues}</p><p className="text-[7px] text-slate-400">Due Today</p></div>
                <div className="text-center"><Truck size={12} className="mx-auto text-slate-500" /><p className="text-[9px] font-black">{data.vehicleNumber === 'Not Assigned' ? '—' : '✓'}</p><p className="text-[7px] text-slate-400">Vehicle</p></div>
              </>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? (isOwner ? 'bg-blue-600 text-white rounded-br-none' : 'bg-green-600 text-white rounded-br-none') : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'}`}>
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

        {/* Input Area */}
        <div className="p-4 border-t bg-white rounded-b-3xl">
          <div className="flex gap-2">
            <button onClick={startListening} disabled={isListening} className={`p-3 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600 hover:bg-blue-100'}`}>
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyPress={handleKeyPress} placeholder="हिंदी या English में लिखें / बोलें..." className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500" disabled={isListening} />
            <button onClick={handleSend} disabled={!inputText.trim() || isProcessing} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50">
              <Send size={18} />
            </button>
          </div>
          <div className="mt-2 text-center">
            <p className="text-[9px] text-slate-400">🎤 बोलें: {isOwner ? '"आज का collection?"' : '"मेरा बकाया?"'} • Type "help" for commands</p>
          </div>
        </div>
      </div>
    </div>
  );
}