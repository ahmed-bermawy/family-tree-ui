import { useState } from 'react';
import { Link } from 'react-router-dom';
import { feedback } from '../api/endpoints';
import { useI18n } from '../i18n/I18nContext';
import Footer from '../components/Footer';
import { usePageMeta } from '../hooks/usePageMeta';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function FeedbackPage() {
  usePageMeta(
    'Feedback — Family Tree',
    'Send us your feedback, suggestions or bug reports for the Family Tree app.',
  );
  const { t, toggleLang } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError('');
    if (!file) {
      setImage(null);
      setImagePreview('');
      return;
    }
    // Validate on select (before upload)
    if (!file.type.startsWith('image/')) {
      setFileError(t.feedbackOnlyImages);
      setImage(null);
      setImagePreview('');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError(t.feedbackMaxSize);
      setImage(null);
      setImagePreview('');
      return;
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError(t.feedbackRequired);
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('email', email.trim());
      formData.append('subject', subject.trim());
      formData.append('message', message.trim());
      if (image) formData.append('image', image);

      await feedback.send(formData);
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || t.feedbackFailed);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-gray-800/60 backdrop-blur-lg border border-gray-700 rounded-2xl p-10 w-full max-w-md shadow-2xl text-center">
            <div className="text-6xl mb-4">💌</div>
            <h1 className="text-2xl font-bold text-white mb-2">{t.feedbackThanks}</h1>
            <p className="text-gray-400 mb-8">{t.feedbackThanksDesc}</p>
            <Link
              to="/"
              className="inline-block px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition shadow-lg cursor-pointer"
            >
              {t.goHome}
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const inputCls = "w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 flex flex-col">
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-white hover:text-emerald-400 transition">🌳 {t.appName}</Link>
          <button onClick={toggleLang} className="text-xs text-gray-500 hover:text-emerald-400 transition">
            {t.langSwitch}
          </button>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-10">
        {/* Nice description */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">💬</div>
          <h1 className="text-3xl font-bold text-white mb-3">{t.feedbackTitle}</h1>
          <p className="text-gray-400 max-w-xl mx-auto leading-relaxed">
            {t.feedbackDesc}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800/60 backdrop-blur-lg border border-gray-700 rounded-2xl p-8 shadow-2xl space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              ⚠️ {error}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="text-gray-300 text-sm block mb-1.5">{t.feedbackName}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder={t.feedbackNamePlaceholder} />
            </div>
            <div>
              <label className="text-gray-300 text-sm block mb-1.5">{t.feedbackEmail}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" />
            </div>
          </div>

          <div>
            <label className="text-gray-300 text-sm block mb-1.5">{t.feedbackSubject}</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} placeholder={t.feedbackSubjectPlaceholder} />
          </div>

          <div>
            <label className="text-gray-300 text-sm block mb-1.5">{t.feedbackMessage}</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className={`${inputCls} resize-none`}
              placeholder={t.feedbackMessagePlaceholder}
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm block mb-1.5">{t.feedbackImage}</label>
            <label className="flex items-center gap-3 p-4 bg-gray-700/40 border border-dashed border-gray-600 rounded-xl cursor-pointer hover:border-emerald-500 transition">
              <span className="text-2xl">📎</span>
              <span className="text-sm text-gray-400">
                {image ? image.name : t.feedbackImagePlaceholder}
              </span>
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </label>
            {fileError && <p className="text-red-400 text-xs mt-2">⚠️ {fileError}</p>}
            {imagePreview && (
              <div className="mt-3">
                <img src={imagePreview} alt="preview" className="h-32 rounded-lg border border-gray-600 object-cover" />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl transition shadow-lg hover:shadow-emerald-500/25 cursor-pointer"
          >
            {loading ? '...' : `💌 ${t.feedbackSend}`}
          </button>
        </form>
      </main>

      <Footer />
    </div>
  );
}
