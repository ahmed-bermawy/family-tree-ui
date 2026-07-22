import { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';

interface Props {
  url: string;
  treeName: string;
  onClose: () => void;
}

export default function ShareModal({ url, treeName, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  const copyLink = () => {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl p-7 w-[420px] shadow-2xl"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <span className="text-4xl">🔗</span>
        </div>

        <h3 className="text-xl font-bold text-white text-center mb-1">{t.shareTitle}</h3>
        <p className="text-gray-400 text-sm text-center mb-5 leading-relaxed">
          {t.shareDesc} <strong className="text-white">{treeName}</strong> {t.shareDesc2}{' '}
          <span className="text-emerald-400">{t.shareDesc3}</span>{t.shareDesc4}
        </p>

        <div className="bg-gray-700/30 border border-gray-600/50 rounded-xl px-1 py-1 flex items-center gap-1 mb-2">
          <input
            type="text"
            value={url}
            readOnly
            className="flex-1 bg-transparent text-white text-xs outline-none px-3 py-2.5 select-all"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={copyLink}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition cursor-pointer select-none ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 hover:text-emerald-300'
            }`}
          >
            {copied ? t.copied : t.copy}
          </button>
        </div>

        <div className="flex justify-center mt-4">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm text-gray-400 hover:text-white transition rounded-lg hover:bg-gray-700 cursor-pointer select-none"
          >
            {t.close}
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
