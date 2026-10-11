import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';

/**
 * Where the server sends the browser after a Google sign-in.
 *
 * The API mints its own JWT and passes it in the query string. We store it and
 * then hard-navigate, which also rewrites the history entry — leaving the token
 * in the address bar (and in the back button) would be a real leak.
 */
export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setFailed(true);
      const id = setTimeout(() => navigate('/login', { replace: true }), 2200);
      return () => clearTimeout(id);
    }

    localStorage.setItem('token', token);
    // replace(), not assign(): the token must not stay in history.
    const fresh = params.get('new') === '1';
    window.location.replace(fresh ? '/trees?welcome=1' : '/trees');
  }, [params, navigate]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-4xl mb-4">{failed ? '⚠️' : '🌳'}</div>
        <p className="text-gray-300 text-sm">
          {failed ? t.googleFailed : t.googleSigningIn}
        </p>
      </div>
    </div>
  );
}
