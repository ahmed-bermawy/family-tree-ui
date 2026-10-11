import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, trees, persons, relationships } from '../api/endpoints';
import { guestStore, importGuestTree } from '../utils/guestStore';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { API_BASE } from '../api/client';
import Footer from '../components/Footer';
import { usePageMeta } from '../hooks/usePageMeta';

export default function RegisterPage() {
  usePageMeta(
    'Create Account — Family Tree',
    'Create a free account to build your family tree, add photos and connect relatives.',
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { t, toggleLang } = useI18n();
  // Ask the API whether Google is configured here. Any failure (including the
  // endpoint not existing on an older API) simply keeps the button hidden.
  const [googleAvailable, setGoogleAvailable] = useState(false);
  useEffect(() => {
    fetch(`${API_BASE}/auth/providers`)
      .then((r) => (r.ok ? r.json() : { google: false }))
      .then((d) => setGoogleAvailable(!!d.google))
      .catch(() => setGoogleAvailable(false));
  }, []);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await auth.register({ email, password, name: name.trim() || undefined });
      localStorage.setItem('token', res.access_token);
      const profile = await auth.profile();
      login(res.access_token, profile);

      // Someone arriving from the guest builder (/try) brings their tree along:
      // create the tree, its people and the links, then open it.
      if (guestStore.hasTree()) {
        try {
          const treeId = await importGuestTree(
            (treeName) => trees.create(treeName),
            (data) => persons.create(data),
            (data) => relationships.create(data),
            (personId, blob) =>
              persons.uploadPhoto(personId, new File([blob], 'photo.jpg', { type: 'image/jpeg' })),
          );
          navigate(treeId ? `/trees/${treeId}` : '/trees');
          return;
        } catch {
          // Keep the local copy so nothing is lost — the visitor can retry.
        }
      }
      navigate('/trees');
    } catch (err: any) {
      setError(err.response?.data?.message || t.registerFailed);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 flex flex-col">
    <div className="flex-1 flex items-center justify-center p-4">
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
            <label className="text-gray-300 text-sm block mb-1">{t.name}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder={t.namePlaceholder}
            />
          </div>
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

                  {/* Google is the only external provider so far. The link is only
            rendered when the API reports it is configured, so a deployment
            without credentials never shows a button that cannot work. */}
        {googleAvailable && (
          <>
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-[11px]">
                <span className="bg-gray-800 px-2 text-gray-500">{t.orDivider}</span>
              </div>
            </div>
            <a
              href={`${API_BASE}/auth/google`}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-white hover:bg-gray-100 text-gray-800 text-sm font-medium rounded-lg transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v8.4h12.5c-.3 2.1-1.6 5.2-4.7 7.3l7.6 5.9c4.4-4.1 6.7-10.1 6.7-17.5z" />
                <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6.1C1 16.3 0 20 0 24s1 7.7 2.6 10.8l7.8-6.1z" />
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.6-5.9c-2 1.4-4.6 2.4-8.2 2.4-6.3 0-11.7-3.7-13.6-9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
              </svg>
              {t.continueWithGoogle}
            </a>
          </>
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
    <Footer />
    </div>
  );
}
