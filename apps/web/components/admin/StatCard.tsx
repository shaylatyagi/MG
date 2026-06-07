interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: 'default' | 'green' | 'blue' | 'orange' | 'red';
}

const colorMap = {
  default: 'text-slate-900',
  green: 'text-green-600',
  blue: 'text-blue-600',
  orange: 'text-orange-600',
  red: 'text-red-600',
};

export default function StatCard({ label, value, sub, color = 'default' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}
