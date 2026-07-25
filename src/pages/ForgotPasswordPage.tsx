import { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../api/endpoints';
import { useI18n } from '../i18n/I18nContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await auth.forgotPassword(email);
      setSent(true);
      if (res.resetLink) setResetLink(res.resetLink);
    } catch (err: any) {
      setError(err.response?.data?.message || t.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔑</div>
          <h1 className="text-2xl font-bold text-white">{t.forgotPassword}</h1>
          <p className="text-gray-400 text-sm mt-1">{t.forgotDesc}</p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 text-xs text-yellow-400">
              📢 {t.noEmailNotice}
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.email}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg transition"
            >
              {loading ? '...' : t.sendResetLink}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="text-3xl mb-3">✅</div>
            <p className="text-emerald-400 font-semibold mb-1">{t.resetLinkSent}</p>
            <p className="text-gray-400 text-xs mb-4">{t.noEmailNotice}</p>
            {resetLink && (
              <div className="bg-gray-700/50 border border-emerald-600/50 rounded-xl p-4 mb-4">
                <p className="text-gray-400 text-xs mb-2">{t.yourResetLink}</p>
                <a
                  href={resetLink}
                  className="text-emerald-400 text-sm font-mono break-all hover:text-emerald-300 transition block bg-gray-800 rounded-lg p-3 border border-gray-600"
                >
                  {resetLink}
                </a>
                <button
                  onClick={() => { navigator.clipboard?.writeText(resetLink); }}
                  className="mt-2 text-xs text-gray-500 hover:text-emerald-400 transition"
                >
                  📋 {t.copyLink}
                </button>
              </div>
            )}
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 text-sm transition block mt-2">{t.backToLogin}</Link>
          </div>
        )}

        <div className="mt-4 text-center">
          <Link to="/login" className="text-gray-500 hover:text-gray-300 text-sm transition">{t.backToLogin}</Link>
        </div>
      </div>
    </div>
  );
}
