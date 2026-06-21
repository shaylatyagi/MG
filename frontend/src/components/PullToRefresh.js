// frontend/src/components/PullToRefresh.js
// Native-feel pull-to-refresh for mobile WebView / PWA
import React, { useRef, useState, useCallback } from 'react';

const THRESHOLD = 64;   // px to pull before triggering
const MAX_PULL  = 90;   // max visual stretch

/**
 * <PullToRefresh onRefresh={asyncFn}>
 *   {children}
 * </PullToRefresh>
 *
 * onRefresh must return a Promise. The spinner shows until it resolves.
 */
export default function PullToRefresh({ onRefresh, children = null, disabled = false }) {
  const [pullY, setPullY] = useState(0);      // current drag distance (px)
  const [loading, setLoading] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    if (disabled || loading) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;       // only trigger at top
    startY.current = e.touches[0].clientY;
  }, [disabled, loading]);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) { startY.current = null; return; }
    // Rubberband effect: each extra px contributes less
    const clamped = Math.min(dy * 0.5, MAX_PULL);
    setPullY(clamped);
    if (dy > 10) e.preventDefault();           // prevent page scroll during pull
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (startY.current === null) return;
    startY.current = null;
    if (pullY >= THRESHOLD * 0.5) {
      setLoading(true);
      setPullY(THRESHOLD * 0.5);              // snap to indicator height
      try { await onRefresh(); } catch (_) {}
      setLoading(false);
    }
    setPullY(0);
  }, [pullY, onRefresh]);

  const progress = Math.min(pullY / (THRESHOLD * 0.5), 1);
  const showIndicator = pullY > 4 || loading;

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ overflowY: 'auto', height: '100%', position: 'relative', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
    >
      {/* Pull indicator */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: Math.max(pullY, loading ? 40 : 0),
        overflow: 'hidden',
        transition: loading ? 'height 0.2s ease' : 'none',
        zIndex: 10,
        opacity: showIndicator ? 1 : 0,
        pointerEvents: 'none',
      }}>
        {loading ? (
          <div className="ptr-spinner" />
        ) : (
          <div style={{
            width: 22, height: 22,
            border: '2.5px solid #e2e8f0',
            borderTopColor: '#4f46e5',
            borderRadius: '50%',
            transform: `rotate(${progress * 270}deg)`,
            opacity: progress,
            transition: 'none',
          }} />
        )}
      </div>

      {/* Content pushed down while pulling */}
      <div style={{
        transform: `translateY(${pullY}px)`,
        transition: pullY === 0 ? 'transform 0.3s ease' : 'none',
      }}>
        {children}
      </div>
    </div>
  );
}
