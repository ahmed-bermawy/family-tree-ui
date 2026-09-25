import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { resolveImageUrl } from '../api/imageUrl';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';

/**
 * Avatar + dropdown for a signed-in member.
 *
 * One component so every page shows the same thing: the member's photo
 * (falling back to their initial), their name, and a menu with their trees,
 * their profile and log out.
 *
 * Note the avatar goes through resolveImageUrl(): avatarUrl is stored as a
 * relative "/uploads/..." path, so using it raw pointed the <img> at the UI
 * origin, which serves the SPA shell instead of the picture — a broken image.
 */
export default function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const avatarUrl = user?.avatarUrl ? resolveImageUrl(user.avatarUrl) : '';
  const displayName = user?.name || user?.email?.split('@')[0] || '';

  // Don't offer a link to the page we are already on.
  const onTrees = location.pathname.startsWith('/trees');
  const onProfile = location.pathname.startsWith('/profile');

  if (!user) return null;

  const itemClass = 'flex items-center gap-2 px-3 py-2 text-xs text-gray-100 hover:bg-gray-700 transition';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t.profileTitle}
        className="flex items-center gap-2 pl-1 pr-2 py-1 bg-gray-800/80 hover:bg-gray-700 border border-gray-600 rounded-full transition"
      >
        {avatarUrl && !imgFailed ? (
          <img
            src={avatarUrl}
            alt={displayName}
            onError={() => setImgFailed(true)}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
            {(displayName || '?').trim().charAt(0).toUpperCase()}
          </span>
        )}
        <span className="hidden sm:inline text-xs text-gray-200 font-medium max-w-[110px] truncate">
          {displayName}
        </span>
        <span className="text-gray-400 text-[9px] leading-none">▼</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute top-full end-0 mt-2 z-30 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl overflow-hidden min-w-[190px]"
          >
            <div className="px-3 py-2 border-b border-gray-700">
              <p className="text-xs text-gray-100 font-medium truncate">{displayName}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
            {!onTrees && (
              <Link to="/trees" onClick={() => setOpen(false)} className={itemClass}>
                🌳 {t.myTrees}
              </Link>
            )}
            {!onProfile && (
              <Link to="/profile" onClick={() => setOpen(false)} className={itemClass}>
                ⚙️ {t.profile}
              </Link>
            )}
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-300 hover:bg-red-600/20 transition border-t border-gray-700"
            >
              🚪 {t.logout}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
