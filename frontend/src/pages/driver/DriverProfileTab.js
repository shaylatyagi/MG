import { useState } from 'react';
export default function DriverProfileTab() {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-2xl p-6 shadow text-center"><div className="w-28 h-28 mx-auto rounded-full border-4 border-dashed border-slate-300 flex items-center justify-center">📷 Click Selfie</div></div>
      <div className="bg-white rounded-2xl p-6 shadow space-y-4">
        <p className="font-bold">1. Basic Records</p>
        <input className="w-full p-3 border rounded-xl" placeholder="Full Name" />
        <input className="w-full p-3 border rounded-xl" placeholder="Phone" />
      </div>
      <div className="bg-white rounded-2xl p-6 shadow space-y-4">
        <p className="font-bold text-red-600">2. Emergency Contact</p>
        <input className="w-full p-3 border rounded-xl" placeholder="Kin Name" />
      </div>
      <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold">SAVE PROFILE</button>
    </div>
  );
}