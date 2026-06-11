'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearAdminToken } from '@/lib/api';

const nav = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '◼' },
  { href: '/admin/companies', label: 'Companies', icon: '🏢' },
  { href: '/admin/kyc',       label: 'KYC Review', icon: '📋' },
  { href: '/admin/drivers',    label: 'All Drivers', icon: '👤' },
  { href: '/admin/audit-logs', label: 'Audit Logs',  icon: '📜' },
];

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();

  const logout = () => {
    clearAdminToken();
    router.push('/login');
  };

  return (
    <aside className="w-60 min-h-screen bg-slate-900 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700">
        <p className="text-white font-bold text-lg tracking-tight">MobilityGrid</p>
        <p className="text-slate-400 text-xs mt-0.5">Super Admin</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon }) => {
          const active = path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-6">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <span>↩</span> Logout
        </button>
      </div>
    </aside>
  );
}
