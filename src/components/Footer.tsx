import { Link } from 'react-router-dom';
import { APP_VERSION } from '../version';
import { useI18n } from '../i18n/I18nContext';

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-gray-800 bg-gray-900/50 py-6 mt-auto">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
        <span>🌳 {t.appName} — {t.tagline}</span>
        <span className="flex items-center gap-3">
          <Link to="/feedback" className="text-gray-400 hover:text-emerald-400 transition">
            💬 {t.feedbackTitleShort}
          </Link>
          <span>
            {t.version} <span className="text-emerald-500 font-semibold">v{APP_VERSION}</span>
          </span>
        </span>
      </div>
    </footer>
  );
}
