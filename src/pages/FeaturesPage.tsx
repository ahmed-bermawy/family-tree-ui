
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../context/AuthContext';
import UserMenu from '../components/UserMenu';
import { usePageMeta } from '../hooks/usePageMeta';
import Footer from '../components/Footer';

export default function FeaturesPage() {
  const { t, toggleLang } = useI18n();
  const { user } = useAuth();
  // This page IS the home page (crawlers and signed-out visitors land here),
  // so it carries the search-facing title/description.
  usePageMeta(
    '🌳 Family Tree Maker — Build, Share & Explore Your Family History',
    'Free online family tree maker. Add relatives, upload photos, connect multiple spouses, and share your family history with a private link — in English and Arabic.',
  );

  const sections = [
    {
      title: t.featBuildTitle,
      desc: t.featBuildDesc,
      items: [t.featBuild1, t.featBuild2, t.featBuild3, t.featBuild4],
      gradient: 'from-emerald-500/10 to-transparent',
    },
    {
      title: t.featGuestTitle,
      desc: t.featGuestDesc,
      items: [t.featGuest1, t.featGuest2, t.featGuest3, t.featGuest4],
    },
    {
      title: t.featDatesTitle,
      desc: t.featDatesDesc,
      items: [t.featDates1, t.featDates2, t.featDates3, t.featDates4],
    },
    {
      title: t.featBirthdaysTitle,
      desc: t.featBirthdaysDesc,
      items: [t.featBirthdays1, t.featBirthdays2, t.featBirthdays3, t.featBirthdays4],
    },
    {
      title: t.featLayoutTitle,
      desc: t.featLayoutDesc,
      items: [t.featLayout1, t.featLayout2, t.featLayout3, t.featLayout4],
    },
    {
      title: t.featOrganizeTitle,
      desc: t.featOrganizeDesc,
      items: [t.featOrganize1, t.featOrganize2, t.featOrganize3, t.featOrganize4],
      gradient: 'from-blue-500/10 to-transparent',
    },
    {
      title: t.featViewTitle,
      desc: t.featViewDesc,
      items: [t.featView1, t.featView2, t.featView3, t.featView4, t.featView5],
      gradient: 'from-purple-500/10 to-transparent',
    },
    {
      title: t.featPolygamyTitle,
      desc: t.featPolygamyDesc,
      items: [t.featPolygamy1, t.featPolygamy2, t.featPolygamy3, t.featPolygamy4],
      gradient: 'from-rose-500/10 to-transparent',
    },
    {
      title: t.featShareTitle,
      desc: t.featShareDesc,
      items: [t.featShare1, t.featShare2, t.featShare3],
      gradient: 'from-pink-500/10 to-transparent',
    },
    {
      title: t.featExportTitle,
      desc: t.featExportDesc,
      items: [t.featExport1, t.featExport2, t.featExport3],
      gradient: 'from-amber-500/10 to-transparent',
    },
    {
      title: t.featManageTitle,
      desc: t.featManageDesc,
      items: [t.featManage1, t.featManage2, t.featManage3, t.featManage4],
      gradient: 'from-cyan-500/10 to-transparent',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-white hover:text-emerald-400 transition">🌳 {t.appName}</Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to="/feedback" className="hidden sm:inline text-xs text-gray-500 hover:text-emerald-400 transition">
              💬 {t.feedbackTitleShort}
            </Link>
            <button onClick={toggleLang} className="text-xs text-gray-500 hover:text-emerald-400 transition">
              {t.langSwitch}
            </button>
            {/* Same avatar + menu as every other page */}
            {user ? (
              <UserMenu />
            ) : (
              <Link
                to="/login"
                className="px-3 sm:px-4 py-1.5 text-xs font-semibold text-emerald-300 border border-emerald-600/60 hover:bg-emerald-600/20 rounded-lg transition whitespace-nowrap"
              >
                {t.signInBtn}
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="max-w-6xl mx-auto px-4 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium mb-6">
          🌳 {t.features}
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-white mb-5 leading-tight">{t.featuresTitle}</h1>
        <p className="text-gray-400 max-w-2xl mx-auto leading-relaxed text-sm sm:text-base">{t.featuresDesc}</p>
        <div className="mt-8 flex flex-col items-center gap-4">
          {user ? (
            <Link
              to="/trees"
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition shadow-lg hover:shadow-emerald-500/25 hover:scale-105"
            >
              🌳 {t.featuresOpenTrees}
            </Link>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full sm:w-auto">
                {/* Primary action: straight into the builder, no account needed */}
                <Link
                  to="/try"
                  className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition shadow-lg hover:shadow-emerald-500/25 hover:scale-105"
                >
                  🚀 {t.guestTryCta}
                </Link>
                <Link
                  to="/register"
                  className="px-8 py-3.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-emerald-500/50 text-gray-100 font-semibold rounded-xl transition"
                >
                  {t.featuresGetStarted}
                </Link>
              </div>
              <p className="text-gray-500 text-xs">{t.guestTryHint}</p>
              <p className="text-gray-400 text-xs">
                {t.haveAccount}{' '}
                <Link to="/login" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                  {t.signInBtn}
                </Link>
              </p>
            </>
          )}
        </div>
      </header>

      {/* Features grid */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-6">
          {sections.map((s, i) => (
            <div
              key={i}
              className={`bg-gradient-to-br ${s.gradient} bg-gray-800/50 border border-gray-700/60 rounded-2xl p-6 sm:p-7 transition hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5`}
            >
              <h2 className="text-lg sm:text-xl font-bold text-white mb-1.5">{s.title}</h2>
              <p className="text-gray-400 text-sm mb-4">{s.desc}</p>
              <ul className="space-y-2.5">
                {s.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
