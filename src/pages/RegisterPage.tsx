import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { t, toggleLang } = useI18n();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await auth.register({ email, password });
      localStorage.setItem('token', res.access_token);
      const profile = await auth.profile();
      login(res.access_token, profile);
      navigate('/trees');
    } catch (err: any) {
      setError(err.response?.data?.message || t.registerFailed);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800/60 backdrop-blur-lg border border-gray-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="flex justify-end mb-2">
          <button onClick={toggleLang} className="text-xs text-gray-500 hover:text-emerald-400 transition">
            {t.langSwitch}
          </button>
        </div>
        <h1 className="text-3xl font-bold text-white text-center mb-2">{t.appName}</h1>
        <p className="text-gray-400 text-center mb-8">{t.createAccount}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-300 text-sm block mb-1">{t.email}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="text-gray-300 text-sm block mb-1">{t.password}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder="Min 6 characters"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-emerald-500/25"
          >
            {t.registerBtn}
          </button>
        </form>

        <p className="text-gray-500 text-center mt-6 text-sm">
          {t.haveAccount}{' '}
          <Link to="/login" className="text-emerald-400 hover:text-emerald-300 transition">
            {t.signInBtn}
          </Link>
        </p>
      </div>
    </div>
  );
}
