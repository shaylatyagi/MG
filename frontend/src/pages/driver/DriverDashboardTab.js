import React from 'react';

export default function DriverDashboardTab({ user, driverDetails, handlePayment, paymentLoading }) {
  return (
    <div className="p-4 space-y-5 animate-fade-in">
      {/* Asset Health Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-bold text-lg mb-4">{driverDetails.vehicle_number}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
            <p className="text-[10px] text-blue-600 font-bold">BATTERY</p>
            <p className="font-black text-xl">{driverDetails.battery_level}%</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
            <p className="text-[10px] text-orange-600 font-bold">DRIVEN</p>
            <p className="font-black text-xl">{driverDetails.kms_driven} KM</p>
          </div>
        </div>
      </div>

      {/* Quick Rent Card */}
      <div className="bg-white border border-amber-300 rounded-3xl p-6 shadow-md">
        <p className="text-amber-600 text-xs font-bold uppercase">Outstanding Rent</p>
        <h2 className="text-4xl font-bold text-slate-900 mt-1">₹{driverDetails.dues}</h2>
        <button onClick={handlePayment} className="mt-5 w-full bg-slate-900 text-white font-bold py-4 rounded-2xl">
          {paymentLoading ? 'Processing...' : 'PAY VIA PAYYANTRA'}
        </button>
      </div>
    </div>
  );
}