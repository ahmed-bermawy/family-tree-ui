import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../api/endpoints';
import { resolveImageUrl } from '../api/imageUrl';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import ImageCropModal from '../components/ImageCropModal';
import Footer from '../components/Footer';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function ProfilePage() {
  const { user, refreshUser, setUser, logout } = useAuth();
  const { t, toggleLang } = useI18n();
  const navigate = useNavigate();

  // Info form
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [infoMsg, setInfoMsg] = useState('');
  const [infoError, setInfoError] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdError, setPwdError] = useState('');

  // Avatar
  const [avatarSrc, setAvatarSrc] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [cropOpen, setCropOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setAvatarError('');
    if (!file) return;
    // Validate on select (before crop/upload)
    if (!file.type.startsWith('image/')) {
      setAvatarError(t.feedbackOnlyImages);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setAvatarError(t.feedbackMaxSize);
      return;
    }
    setAvatarSrc(URL.createObjectURL(file));
    setCropOpen(true);
    e.target.value = '';
  };

  const handleCropDone = async (blob: Blob) => {
    setCropOpen(false);
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.jpg');
      const updated = await auth.uploadAvatar(formData);
      setUser(updated);
      await refreshUser();
      setAvatarError('');
    } catch (err: any) {
      setAvatarError(err.response?.data?.message || t.feedbackFailed);
    } finally {
      setSaving(false);
    }
  };

  const saveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoMsg('');
    setInfoError('');
    if (!name.trim()) {
      setInfoError(t.profileNameRequired);
      return;
    }
    if (!email.trim().includes('@')) {
      setInfoError(t.profileEmailInvalid);
      return;
    }
    setSaving(true);
    try {
      const result = await auth.updateProfile({ name: name.trim(), email: email.trim() });
      if (result.access_token) {
        localStorage.setItem('token', result.access_token);
      }
      await refreshUser();
      setInfoMsg(t.profileSaved);
    } catch (err: any) {
      setInfoError(err.response?.data?.message || t.feedbackFailed);
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg('');
    setPwdError('');
    if (newPassword.length < 6) {
      setPwdError(t.profilePasswordShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError(t.profilePasswordMismatch);
      return;
    }
    setSaving(true);
    try {
      await auth.changePassword({ currentPassword, newPassword });
      setPwdMsg(t.profilePasswordSaved);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdError(err.response?.data?.message || t.feedbackFailed);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition";
  const avatarUrl = user?.avatarUrl ? resolveImageUrl(user.avatarUrl) : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 flex flex-col">
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/trees')} className="text-xl font-bold text-white hover:text-emerald-400 transition">🌳 {t.appName}</button>
          <div className="flex items-center gap-4">
            <button onClick={toggleLang} className="text-xs text-gray-500 hover:text-emerald-400 transition">{t.langSwitch}</button>
            <button onClick={logout} className="text-sm text-gray-400 hover:text-red-400 transition">{t.logout}</button>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">👤 {t.profileTitle}</h1>

        <div className="space-y-8">
          {/* Avatar */}
          <section className="bg-gray-800/60 backdrop-blur-lg border border-gray-700 rounded-2xl p-6 shadow-xl">
            <h2 className="text-white font-semibold mb-4">{t.profilePhoto}</h2>
            <div className="flex items-center gap-6">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-20 h-20 rounded-full object-cover border-2 border-emerald-600" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-emerald-600/20 border-2 border-emerald-600 flex items-center justify-center text-2xl">
                  {(user?.name || user?.email || '?')[0].toUpperCase()}
                </div>
              )}
              <div>
                <label className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition shadow cursor-pointer">
                  {t.profileChangePhoto}
                  <input type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                </label>
                {avatarError && <p className="text-red-400 text-xs mt-2">⚠️ {avatarError}</p>}
              </div>
            </div>
          </section>

          {/* Info */}
          <form onSubmit={saveInfo} className="bg-gray-800/60 backdrop-blur-lg border border-gray-700 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-white font-semibold">{t.profileInfo}</h2>
            {infoMsg && <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 text-sm">✅ {infoMsg}</div>}
            {infoError && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">⚠️ {infoError}</div>}
            <div>
              <label className="text-gray-300 text-sm block mb-1.5">{t.feedbackName}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1.5">{t.feedbackEmail}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            </div>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg transition shadow cursor-pointer">
              {t.profileSaveInfo}
            </button>
          </form>

          {/* Password */}
          <form onSubmit={savePassword} className="bg-gray-800/60 backdrop-blur-lg border border-gray-700 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-white font-semibold">{t.profilePassword}</h2>
            {pwdMsg && <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 text-sm">✅ {pwdMsg}</div>}
            {pwdError && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">⚠️ {pwdError}</div>}
            <div>
              <label className="text-gray-300 text-sm block mb-1.5">{t.profileCurrentPassword}</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1.5">{t.profileNewPassword}</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1.5">{t.profileConfirmPassword}</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} />
            </div>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg transition shadow cursor-pointer">
              {t.profileUpdatePassword}
            </button>
          </form>
        </div>
      </main>

      {cropOpen && avatarSrc && (
        <ImageCropModal
          imageUrl={avatarSrc}
          onCrop={handleCropDone}
          onCancel={() => setCropOpen(false)}
        />
      )}

      <Footer />
    </div>
  );
}
