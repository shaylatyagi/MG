// frontend/src/components/UniversalChatbot.js
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Send, Volume2, VolumeX, Loader, Wallet, CreditCard, Bell, Truck, Users, IndianRupee } from 'lucide-react';

const API = 'https://mg-qw5s.onrender.com';

export default function Chatbot({ userRole, userId, userPhone, token, onClose }) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [data,setUserData] = useState(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const isOwner = userRole === 'OWNER';

  // Initialize welcome message
  useEffect(() => {
    if (isOwner) {
      setMessages([{
        role: 'bot',
        content: 'नमस्ते! Main aapka Fleet Assistant hoon. 🏢\n\nमैं आपकी मदद कर सकता हूँ:\n• आज का कितना collection हुआ?\n• किस driver ने payment नहीं दी?\n• कितने drivers active हैं?\n• कितने vehicles हैं?\n\nI can help you with:\n• Today\'s collection\n• Driver payment status\n• Fleet statistics\n• Vehicle details\n\nJust speak or type your question! 🎤'
      }]);
    } else {
      setMessages([{
        role: 'bot',
        content: 'नमस्ते! Main aapka Driver Assistant hoon. 🚛\n\nमैं आपकी मदद कर सकता हूँ:\n• मेरा बकाया कितना है?\n• मेरे wallet में कितना balance है?\n• क्या मैंने आज payment दी?\n• मेरी vehicle कौन सी है?\n\nI can help you with:\n• Today\'s pending dues\n• Wallet balance\n• Payment status\n• Vehicle details\n\nJust speak or type your question! 🎤'
      }]);
    }
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
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'hi-IN';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        handleUserMessage(transcript);
        setIsListening(false);
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
  const clean = text
    .replace(/[\u0900-\u097F\s]+/g, ' ')
    .replace(/[^\x00-\x7F]/g, '')
    .trim();
  if (!clean) return;
  setIsSpeaking(true);
  const u = new SpeechSynthesisUtterance(clean);
  const voices = window.speechSynthesis.getVoices();
  const female = voices.find(v =>
    (v.name.toLowerCase().includes('female') || v.name.includes('Heera') || 
     v.name.includes('Priya') || v.name.includes('Zira')) &&
    (v.lang.startsWith('en') || v.lang.startsWith('hi'))
  ) || voices.find(v => v.lang === 'en-IN');
  if (female) u.voice = female;
  u.lang = 'en-IN';
  u.rate = 0.82;
  u.pitch = 1.4;
  u.onend = () => setIsSpeaking(false);
  u.onerror = () => setIsSpeaking(false);
  window.speechSynthesis.speak(u);
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
    setMessages(prev => [...prev, { role, content }]);
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

  // Process intent based on role
  const processIntent = async (userMessage) => {
    const lowerMsg = userMessage.toLowerCase();
    const data = await fetchUserData();
    
    if (!data) {
      return "डेटा लोड नहीं हो पाया। कृपया दोबारा कोशिश करें।";
    }

    // ========== OWNER INTENTS ==========
    if (isOwner) {
      // Today's collection
      if (lowerMsg.includes('collection') || lowerMsg.includes('earning') || lowerMsg.includes('कलेक्शन') || 
          lowerMsg.includes('कमाई') || lowerMsg.includes('today') && (lowerMsg.includes('kitna') || lowerMsg.includes('how much'))) {
        return `💰 आज का कुल collection ₹${data.todayCollection.toLocaleString('en-IN')} है।\n\n💰 Today's total collection is ₹${data.todayCollection.toLocaleString('en-IN')}.`;
      }

      // Which drivers haven't paid?
      if ((lowerMsg.includes('not paid') || lowerMsg.includes('didn\'t pay') || 
     lowerMsg.includes('नहीं दिया') || lowerMsg.includes('pending') ||
     lowerMsg.includes('nahi') || lowerMsg.includes('nhi') || 
     lowerMsg.includes('due') || lowerMsg.includes('baaki') || lowerMsg.includes('baki')) && 
          (lowerMsg.includes('driver') || lowerMsg.includes('ड्राइवर'))) {
        const notPaidDrivers = [];
        for (const driver of data.drivers) {
          const paid = hasDriverPaidToday(driver.mobile_number, data.orders);
          if (!paid) {
            notPaidDrivers.push(`${driver.full_name} (${driver.mobile_number})`);
          }
        }
        if (notPaidDrivers.length === 0) {
          return "🎉 बहुत अच्छा! सभी drivers ने आज payment कर दी है।\n\n🎉 Great! All drivers have made their payments today.";
        } else {
          return `⚠️ इन drivers ने आज payment नहीं दी है: ${notPaidDrivers.join(', ')}\n\n⚠️ These drivers haven't paid today: ${notPaidDrivers.join(', ')}`;
        }
      }

      // Total drivers
      if (lowerMsg.includes('how many drivers') || lowerMsg.includes('kitne driver') || lowerMsg.includes('total drivers')) {
        return `👥 आपके पास कुल ${data.totalDrivers} drivers हैं।\n\n👥 You have a total of ${data.totalDrivers} drivers.`;
      }

      // Total vehicles
      if (lowerMsg.includes('how many vehicles') || lowerMsg.includes('kitne vehicles') || lowerMsg.includes('total vehicles') || lowerMsg.includes('fleet')) {
        return `🚛 आपके पास कुल ${data.totalVehicles} vehicles हैं।\n\n🚛 You have a total of ${data.totalVehicles} vehicles.`;
      }

      // Driver who paid today
      if (lowerMsg.includes('who paid') || lowerMsg.includes('किसने दिया') || 
    lowerMsg.includes('paid') || lowerMsg.includes('de diya') || 
    lowerMsg.includes('diya') || lowerMsg.includes('pay kar')) {
        const paidDrivers = [];
        for (const driver of data.drivers) {
          const paid = hasDriverPaidToday(driver.mobile_number, data.orders);
          if (paid) {
            paidDrivers.push(`${driver.full_name} (${driver.mobile_number})`);
          }
        }
        if (paidDrivers.length === 0) {
          return "📭 आज किसी driver ने payment नहीं दी है।\n\n📭 No driver has paid today.";
        } else {
          return `✅ इन drivers ने आज payment दी है: ${paidDrivers.join(', ')}\n\n✅ These drivers have paid today: ${paidDrivers.join(', ')}`;
        }
      }
    }

    // ========== DRIVER INTENTS ==========
    else {
      // Today's due
      if (lowerMsg.includes('बकाया') || lowerMsg.includes('due') || lowerMsg.includes('कितना देना') || lowerMsg.includes('pending')) {
        if (data.todayDues <= 0) {
          return "🎉 बधाई हो! आपका आज का कोई बकाया नहीं है।\n\n🎉 Congratulations! You have no pending dues today.";
        } else {
          return `🚨 आपका आज का बकाया ₹${data.todayDues} है।\n\n🚨 Your pending dues today are ₹${data.todayDues}.`;
        }
      }

      // Wallet balance
      if (lowerMsg.includes('वॉलेट') || lowerMsg.includes('wallet') || lowerMsg.includes('balance') || lowerMsg.includes('बैलेंस')) {
        return `💰 आपके wallet में ₹${data.walletBalance} का balance है।\n\n💰 Your wallet balance is ₹${data.walletBalance}.`;
      }

      // Did I pay today?
      if (lowerMsg.includes('pay kiya') || lowerMsg.includes('paid') || lowerMsg.includes('भुगतान किया') || lowerMsg.includes('किराया दिया')) {
        const paid = data.paidToday > 0;
        if (paid) {
          return "✅ हाँ, आपने आज का किराया दे दिया है। शुक्रिया!\n\n✅ Yes, you have paid today's rent. Thank you!";
        } else {
          return `❌ नहीं, आपने आज का किराया नहीं दिया है। आपका बकाया ₹${data.todayDues} है।\n\n❌ No, you haven't paid today's rent yet. Your pending dues are ₹${data.todayDues}.`;
        }
      }

      // Vehicle details
      if (lowerMsg.includes('गाड़ी') || lowerMsg.includes('vehicle') || lowerMsg.includes('वाहन')) {
        if (data.vehicleNumber === 'Not Assigned') {
          return "🚨 आपको अभी कोई गाड़ी assign नहीं की गई है।\n\n🚨 No vehicle has been assigned to you yet.";
        } else {
          return `🚛 आपकी गाड़ी: ${data.vehicleNumber}, दैनिक किराया: ₹${data.dailyRent}\n\n🚛 Your vehicle: ${data.vehicleNumber}, Daily rent: ₹${data.dailyRent}`;
        }
      }

      // Daily rent
      if (lowerMsg.includes('किराया') || lowerMsg.includes('rent') || lowerMsg.includes('daily rent')) {
        return `📅 आपका दैनिक किराया ₹${data.dailyRent} है।\n\n📅 Your daily rent is ₹${data.dailyRent}.`;
      }
    }

    // ========== COMMON INTENTS ==========
    
    // Greeting
    if (lowerMsg.includes('नमस्ते') || lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('हैलो')) {
      if (isOwner) {
        return `नमस्ते! आज का collection ₹${data.todayCollection} है। ${data.totalDrivers} drivers में से कितने ने payment दी है? मैं बता सकता हूँ।\n\nHello! Today's collection is ₹${data.todayCollection}. I can tell you how many drivers have paid.`;
      } else {
        return `नमस्ते! आपका आज का बकाया ₹${data.todayDues} है। वॉलेट में ₹${data.walletBalance} है।\n\nHello! Your pending dues today are ₹${data.todayDues}. Wallet balance is ₹${data.walletBalance}.`;
      }
    }

    // Help
    if (lowerMsg.includes('help') || lowerMsg.includes('मदद') || lowerMsg.includes('क्या कर सकते हो')) {
      if (isOwner) {
        return `Chat मैं आपकी मदद कर सकता हूँ:\n\n• "आज का collection कितना है?"\n• "किस driver ने payment नहीं दी?"\n• "कितने drivers हैं?"\n• "कितने vehicles हैं?"\n\n• "What is today's collection?"\n• "Which drivers haven't paid?"\n• "How many drivers?"\n• "How many vehicles?"`;
      } else {
        return `Chat मैं आपकी मदद कर सकता हूँ:\n\n• "मेरा बकाया कितना है?"\n• "वॉलेट में कितना है?"\n• "क्या मैंने आज pay किया?"\n• "मेरी गाड़ी कौन सी है?"\n\n• "What is my pending dues?"\n• "Wallet balance?"\n• "Did I pay today?"\n• "My vehicle details?"`;
      }
    }

    // Thank you
    if (lowerMsg.includes('धन्यवाद') || lowerMsg.includes('thank you') || lowerMsg.includes('शुक्रिया')) {
      return "आपका स्वागत है! 😊 क्या मैं और मदद कर सकता हूँ?\n\nYou're welcome! 😊 Can I help you with anything else?";
    }

    try {
  const aiRes = await fetch(`${API}/api/payment/chatbot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message: userMessage, context: data })
  });
  const aiData = await aiRes.json();
  return aiData.reply;
} catch {
  return `मुझे समझ नहीं आया। "help" लिखें।\n\nI didn't understand. Type "help".`;
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md h-[600px] flex flex-col shadow-2xl">
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