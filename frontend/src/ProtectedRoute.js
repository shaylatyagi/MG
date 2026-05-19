import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token || !user.role) {
    return <Navigate to="/login" />;
  }

  if (allowedRole && user.role !== allowedRole) {
    if (user.role === 'owner') {
      return <Navigate to="/owner/dashboard" />;
    } else {
      return <Navigate to="/driver/dashboard" />;
    }
  }

  return children;
}