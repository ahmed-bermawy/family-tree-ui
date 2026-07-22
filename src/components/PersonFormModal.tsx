import { useI18n } from '../i18n/I18nContext';

interface Props {
  title: string;
  name: string;
  gender: string;
  onNameChange: (val: string) => void;
  onGenderChange: (val: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}

export default function PersonFormModal({
  title, name, gender, onNameChange, onGenderChange,
  onConfirm, onCancel, confirmLabel,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl p-5 sm:p-6 w-[90vw] sm:w-96 shadow-2xl animate-in"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      >
        <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
        <p className="text-gray-400 text-sm mb-5">{t.personDetails}</p>

        <label className="text-gray-300 text-xs font-medium mb-1.5 block">{t.name}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && onConfirm()}
          className="w-full px-3.5 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition mb-4"
          placeholder={t.namePlaceholder}
          autoFocus
        />

        <label className="text-gray-300 text-xs font-medium mb-1.5 block">{t.genderTitle}</label>
        <div className="flex gap-3 mb-6">
          {[
            { value: 'male', label: t.male, color: 'blue' },
            { value: 'female', label: t.female, color: 'pink' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onGenderChange(opt.value)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                gender === opt.value
                  ? opt.color === 'blue'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-pink-600/20 border-pink-500 text-pink-300'
                  : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onGenderChange('')}
            className={`px-3 py-2.5 rounded-lg text-sm border transition-all ${
              gender === ''
                ? 'bg-gray-600/30 border-gray-500 text-gray-200'
                : 'bg-gray-700/50 border-gray-600 text-gray-500 hover:border-gray-500'
            }`}
          >
            {t.skip}
          </button>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition rounded-lg hover:bg-gray-700"
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            disabled={!name.trim()}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          >
            {confirmLabel || t.add}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
