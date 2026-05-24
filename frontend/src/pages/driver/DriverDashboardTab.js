import React from 'react';
import DriverDashboardTab from './driver/DriverDashboardTab';

export default function DriverDashboard() {
  return (
    <div className="h-screen w-full bg-slate-50">
      {/* Yeh sirf tumhari nayi tab component ko render karega, koi extra sidebar nahi */}
      <DriverDashboardTab />
    </div>
  );
}