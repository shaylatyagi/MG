import { useState } from 'react';

export default function DriverProfileTab({ lang, user = {} }) {  // Default empty object
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone_number || '');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [selfie, setSelfie] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    
    alert(lang === 'en' 
      ? "Profile Saved Successfully!" 
      : "प्रोफाइल सफलतापूर्वक सहेज ली गई!"
    );
  };

  return (
    <div className="p-4 space-y-4">

      {saved && (
        <div className="bg-emerald-100 border border-emerald-500 text-emerald-700 p-4 rounded-2xl text-center font-medium">
          ✅ {lang === 'en' ? 'Profile Updated Successfully' : 'प्रोफाइल अपडेट हो गई'}
        </div>
      )}

      {/* Selfie Section */}
      <div className="bg-white rounded-2xl p-6 shadow text-center">
        <p className="font-bold text-lg mb-4">
          {lang === 'en' ? 'Driver Photo / Face Verification' : 'ड्राइवर फोटो'}
        </p>
        
        <label className="cursor-pointer block">
          <div className="w-28 h-28 mx-auto rounded-full border-4 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50">
            {selfie ? (
              <img src={selfie} alt="selfie" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <span className="text-4xl">📷</span>
                <p className="text-xs text-slate-500 mt-2 font-medium">CLICK SELFIE</p>
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files[0]) {
                setSelfie(URL.createObjectURL(e.target.files[0]));
              }
            }}
          />
        </label>
      </div>

      {/* Basic Details */}
      <div className="bg-white rounded-2xl p-6 shadow">
        <p className="font-bold mb-4 text-lg">
          {lang === 'en' ? '1. Basic Driver Records' : '1. बुनियादी जानकारी'}
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Legal Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              placeholder="Enter full name"
            />
          </div>
          
          <div>
            <label className="block text-sm text-slate-600 mb-1">Phone Number (+91)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              placeholder="9876543210"
            />
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-white rounded-2xl p-6 shadow">
        <p className="font-bold mb-4 text-lg text-red-600">
          {lang === 'en' ? '2. Emergency Contact' : '2. इमरजेंसी संपर्क'}
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Kin / Nominee Name</label>
            <input
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              placeholder="e.g. Sunita Singh"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Relation</label>
              <select
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Relation</option>
                <option value="spouse">Spouse</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Emergency Phone</label>
              <input
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500"
                placeholder="9812345678"
              />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg active:scale-95 transition-all"
      >
        {lang === 'en' ? 'Save Profile' : 'प्रोफाइल सहेजें'}
      </button>

    </div>
  );
}