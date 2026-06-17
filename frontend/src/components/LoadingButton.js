// frontend/src/components/LoadingButton.js
// A button that shows an inline spinner while its async onClick runs.
// Automatically disables itself during loading to prevent double-taps.
import React, { useState } from 'react';

/**
 * <LoadingButton
 *   onClick={async () => { await doSomething(); }}
 *   className="..."
 *   style={{...}}
 *   loadingText="Saving..."   // optional — shown while loading
 *   disabled={false}
 * >
 *   Save
 * </LoadingButton>
 */
export default function LoadingButton({
  onClick,
  children = null,
  loadingText,
  className = '',
  style = {},
  disabled = false,
  type = 'button',
  ...rest
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e) => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      await onClick?.(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type={type}
      className={className}
      style={{ ...style, opacity: (loading || disabled) ? 0.72 : 1, transition: 'opacity 0.15s' }}
      onClick={handleClick}
      disabled={loading || disabled}
      {...rest}
    >
      {loading ? (
        <>
          <span className="btn-spinner" />
          {loadingText || children}
        </>
      ) : children}
    </button>
  );
}
