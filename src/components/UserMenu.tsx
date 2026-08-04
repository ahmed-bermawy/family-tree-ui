import { useNavigate } from 'react-router-dom';
import { resolveImageUrl } from '../api/imageUrl';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const avatarUrl = user?.avatarUrl ? resolveImageUrl(user.avatarUrl) : '';

  const displayName = user?.name || user?.email || '';

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigate('/profile')}
        className="flex items-center gap-2 group"
        title={t.profileTitle}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="avatar"
            className="w-8 h-8 rounded-full object-cover border-2 border-emerald-600/60 group-hover:border-emerald-500 transition"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-emerald-600/20 border-2 border-emerald-600/60 group-hover:border-emerald-500 transition flex items-center justify-center text-sm text-emerald-400">
            {(displayName[0] || '?').toUpperCase()}
          </div>
        )}
        <span className="hidden sm:block text-gray-300 text-sm group-hover:text-emerald-400 transition max-w-[150px] truncate">
          {displayName}
        </span>
      </button>
      <button onClick={logout} className="text-sm text-gray-400 hover:text-red-400 transition">
        {t.logout}
      </button>
    </div>
  );
}
