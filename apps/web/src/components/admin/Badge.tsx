interface BadgeProps {
  status: string;
}

const colors: Record<string, string> = {
  Active: 'bg-green-100 text-green-800',
  ACTIVE: 'bg-green-100 text-green-800',
  Inactive: 'bg-red-100 text-red-800',
  INACTIVE: 'bg-red-100 text-red-800',
  VERIFIED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  NOT_STARTED: 'bg-slate-100 text-slate-600',
  SUCCESS: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

export default function Badge({ status }: BadgeProps) {
  const cls = colors[status] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status || 'UNKNOWN'}
    </span>
  );
}
