import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── React Query client ────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:   5 * 60 * 1000,
      retry:       1,
      refetchOnWindowFocus: false,
    },
  },
});


// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('ErrorBoundary caught:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 'var(--space-3)' }}>
          <h2 style={{ color: 'var(--color-danger)', fontSize: 'var(--text-xl)', margin: 0 }}>Something went wrong</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', margin: 0 }}>{this.state.error?.message}</p>
          <button
            className="btn-primary"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
          >
            Go home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const LandingPage     = lazy(() => import('./pages/LandingPage'));
const Login           = lazy(() => import('./pages/Login'));
const OwnerApp        = lazy(() => import('./pages/OwnerApp.jsx'));
const DriverPWA       = lazy(() => import('./pages/DriverPWA'));
const Profile         = lazy(() => import('./pages/Profile'));
const PaymentResult   = lazy(() => import('./pages/PaymentResult'));
const PartnerHub      = lazy(() => import('./pages/PartnerHub'));
const PartnersPage    = lazy(() => import('./pages/PartnersPage'));
const AdminPanel      = lazy(() => import('./pages/admin/CompanyDashboard'));
const PaymentLinkPage = lazy(() => import('./pages/PaymentLinkPage'));
const ManagerApp      = lazy(() => import('./pages/ManagerApp'));

// ── Suspense fallback ─────────────────────────────────────────────────────────
const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)' }}>
    <div style={{
      width: 36, height: 36,
      border: '3px solid var(--color-border)',
      borderTopColor: 'var(--color-primary)',
      borderRadius: 'var(--radius-full)',
      animation: 'spin 0.7s linear infinite',
    }} />
    <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
  </div>
);

// ── PrivateRoute ──────────────────────────────────────────────────────────────
function PrivateRoute({ children, adminOnly }) {
  const { token, adminToken } = useAuth();
  if (!token && !adminToken) return <Navigate to="/login" replace />;
  if (adminOnly && !adminToken)  return <Navigate to="/login" replace />;
  return children;
}
function App() {
  const host = window.location.hostname;
  const isPartnersSubdomain = host === 'partners.mobilitygrid.in';
  const isAdminSubdomain = host === 'admin.mobilitygrid.in';
  const AdminRoot = () => {
  const { adminToken } = useAuth();
  if (adminToken) {
    return <AdminPanel />;
  }
  return <Login />;
};
  return (
    <main role="main">
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Router>
              <Suspense fallback={<PageLoader />}>
                {isPartnersSubdomain ? (
                  <Routes>
                    <Route path="/" element={<PartnersPage />} />
                    <Route path="/:slug" element={<PartnersPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                ) : (
                  <Routes>
                    <Route path="/" element={isAdminSubdomain ? <AdminRoot /> : <LandingPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/payment-result" element={<PaymentResult />} />
                    <Route path="/pay/:token" element={<PaymentLinkPage />} />
                    <Route path="/owner/*" element={<PrivateRoute><OwnerApp /></PrivateRoute>} />
                    <Route path="/driver/*" element={<PrivateRoute><DriverPWA /></PrivateRoute>} />
                    <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                    <Route path="/manager/*" element={<PrivateRoute><ManagerApp /></PrivateRoute>} />
                    
                    {/* 🔥 Admin route exists ONLY on admin.mobilitygrid.in */}
                    {isAdminSubdomain && (
                      <Route path="/admin/*" element={<PrivateRoute adminOnly><AdminPanel /></PrivateRoute>} />
                    )}
                    
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                )}
              </Suspense>
            </Router>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </main>
  );
}

export default App;
