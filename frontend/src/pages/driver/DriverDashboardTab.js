import React, { useState } from 'react';
import api from '../../api';

export default function DriverDashboardTab() {
  const [paymentLoading, setPaymentLoading] = useState(false);
  const driverDetails = { wallet_balance: 1250, dues: 1450, battery_level: 92, kms_driven: 45, vehicle_number: 'MH-12-QX-4019' };

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      const res = await api.post('/api/payment/create-order', { amount: driverDetails.dues });
      if (res.data?.data?.checkoutUrl) window.location.href = res.data.data.checkoutUrl;
    } catch (err) { alert('Gateway connection error'); }
    setPaymentLoading(false);
  };

  return (
    <div className="space-y-5 p-4 bg-slate-50 min-h-screen">
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-4"><p className="text-xs font-bold text-slate-500">ACTIVE VEHICLE</p><span className="text-emerald-600 text-[10px] font-bold">ONLINE</span></div>
        <h3 className="font-bold text-lg mb-4">{driverDetails.vehicle_number}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-3 rounded-xl border"><p className="text-[10px] text-blue-600 font-bold">BATTERY</p><p className="font-black text-xl">{driverDetails.battery_level}% ⚡</p></div>
          <div className="bg-orange-50 p-3 rounded-xl border"><p className="text-[10px] text-orange-600 font-bold">DRIVEN</p><p className="font-black text-xl">{driverDetails.kms_driven} KM</p></div>
        </div>
      </div>
      <div className="bg-white border-amber-300 border rounded-3xl p-6 shadow-md">
        <p className="text-amber-600 text-xs font-bold">⚠️ OUTSTANDING RENT</p>
        <h2 className="text-4xl font-bold mt-1">₹{driverDetails.dues}</h2>
        <button onClick={handlePayment} className="mt-5 w-full bg-slate-900 text-white font-bold py-4 rounded-2xl">{paymentLoading ? 'PROCESSING...' : 'PAY VIA PAYYANTRA'}</button>
      </div>
      <div className="bg-white p-5 rounded-3xl shadow-sm border"><p className="font-bold text-sm mb-4">System Alerts</p><div className="bg-red-50 p-4 rounded-2xl border"><p className="font-semibold text-red-800 text-sm">Docking Required</p><p className="text-xs text-slate-600">Please dock vehicle by 06:00 PM.</p></div></div>
    </div>
  );
}