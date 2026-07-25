import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { auth } from '../api/endpoints';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../context/AuthContext';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const { t } = useI18n();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) { setError(t.passwordMinLength); return; }
    if (password !== confirm) { setError(t.passwordsDontMatch); return; }

    setLoading(true);
    try {
      const res = await auth.resetPassword(token || '', password);
      login(res.access_token, { id: 0, email: '' });
      setSuccess(true);
      setTimeout(() => navigate('/trees'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || t.invalidToken);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{success ? '✅' : '🔐'}</div>
          <h1 className="text-2xl font-bold text-white">{t.resetPassword}</h1>
        </div>

        {!success ? (
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.newPassword}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t.confirmPassword}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg transition"
            >
              {loading ? '...' : t.resetPassword}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <p className="text-emerald-400 font-semibold mb-2">{t.resetSuccess}</p>
            <p className="text-gray-500 text-sm">{t.redirecting}</p>
          </div>
        )}

        <div className="mt-4 text-center">
          <Link to="/login" className="text-gray-500 hover:text-gray-300 text-sm transition">{t.backToLogin}</Link>
        </div>
      </div>
    </div>
  );
}
