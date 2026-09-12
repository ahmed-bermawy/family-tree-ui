import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../hooks/usePageMeta';
import Footer from '../components/Footer';

export default function FeaturesPage() {
  const { t, toggleLang } = useI18n();
  const { user } = useAuth();
  usePageMeta('Features — Family Tree', 'Everything you can do with your family tree: build, organize, view, share, export and manage.');

  const sections = [
    {
      title: t.featBuildTitle,
      desc: t.featBuildDesc,
      items: [t.featBuild1, t.featBuild2, t.featBuild3, t.featBuild4],
      gradient: 'from-emerald-500/10 to-transparent',
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
          <div className="flex items-center gap-4">
            <Link to="/feedback" className="text-xs text-gray-500 hover:text-emerald-400 transition">
              💬 {t.feedbackTitleShort}
            </Link>
            <button onClick={toggleLang} className="text-xs text-gray-500 hover:text-emerald-400 transition">
              {t.langSwitch}
            </button>
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
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          {user ? (
            <Link
              to="/trees"
              className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition shadow-lg hover:shadow-emerald-500/25 hover:scale-105"
            >
              🌳 {t.featuresOpenTrees}
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition shadow-lg hover:shadow-emerald-500/25 hover:scale-105"
              >
                {t.featuresGetStarted}
              </Link>
              <Link
                to="/login"
                className="px-8 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-semibold rounded-xl transition"
              >
                {t.signInBtn}
              </Link>
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

        {/* CTA */}
        <div className="mt-14 bg-gray-800/60 border border-gray-700 rounded-2xl p-8 sm:p-10 text-center">
          <div className="text-5xl mb-4">🌳</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">{t.featuresTryIt}</h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-6 text-sm sm:text-base">{t.treeDesc}</p>
          {user ? (
            <Link
              to="/trees"
              className="inline-block px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition shadow-lg hover:shadow-emerald-500/25 hover:scale-105"
            >
              🌳 {t.featuresOpenTrees}
            </Link>
          ) : (
            <Link
              to="/register"
              className="inline-block px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition shadow-lg hover:shadow-emerald-500/25 hover:scale-105"
            >
              {t.featuresGetStarted}
            </Link>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
