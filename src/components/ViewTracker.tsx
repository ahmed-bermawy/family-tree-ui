import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { API_BASE } from '../api/client';

/**
 * Fires a view-tracking beacon on every route change.
 * Uses sendBeacon when available (fire-and-forget, survives page unload).
 */
export default function ViewTracker() {
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const payload = {
      path: location.pathname + location.search,
      referrer: document.referrer || undefined,
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    // fetch + keepalive instead of sendBeacon:
    // sendBeacon can't do CORS preflight for application/json, so browsers silently block it.
    try {
      fetch(`${API_BASE}/track`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // tracking must never break the app
    }
  }, [location.pathname, location.search]);

  return null;
}
