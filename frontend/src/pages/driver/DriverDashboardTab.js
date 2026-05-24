import React from 'react';

export default function DriverDashboardTab({ user, handlePayment, paymentLoading, driverDetails }) {
  return (
    <div className="p-4 space-y-5">
      <div className="bg-white border border-amber-300 rounded-3xl p-6 shadow-md">
        <h2 className="text-4xl font-bold text-slate-900">₹{driverDetails.dues}</h2>
        <button onClick={handlePayment} className="mt-5 w-full bg-slate-900 text-white font-bold py-4 rounded-2xl">
          {paymentLoading ? 'Processing...' : 'PAY VIA PAYYANTRA'}
        </button>
      </div>
    </div>
  );
}