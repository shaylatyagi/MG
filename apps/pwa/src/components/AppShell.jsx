import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const formatSegment = (segment) =>
  segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function AppShell({ title, subtitle, actions = [], hideBack = false, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const breadcrumbs = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    return parts.map(formatSegment).join(' / ');
  }, [pathname]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    if (pathname.startsWith('/driver')) {
      navigate('/driver/wallet');
      return;
    }
    if (pathname.startsWith('/manager')) {
      navigate('/manager/dashboard');
      return;
    }
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-start">
          {!hideBack && (
            <button type="button" className="app-shell__back" onClick={handleBack}>
              <span aria-hidden="true">←</span>
              <span>Back</span>
            </button>
          )}

          <div>
            <p className="app-shell__breadcrumb">{breadcrumbs || 'Home'}</p>
            <h1 className="app-shell__title">{title || formatSegment(pathname.split('/').pop() || 'Home')}</h1>
            {subtitle && <p className="app-shell__subtitle">{subtitle}</p>}
          </div>
        </div>

        {actions.length > 0 && (
          <div className="app-shell__actions">
            {actions.map((action, index) => (
              <button
                key={`${action.label}-${index}`}
                type="button"
                className="app-shell__action-button"
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="app-shell__content">{children}</main>
    </div>
  );
}
