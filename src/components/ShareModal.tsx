interface Props {
  url: string;
  treeName: string;
  onClose: () => void;
}

export default function ShareModal({ url, treeName, onClose }: Props) {
  const copyLink = () => {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-96 shadow-2xl"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-1">🔗 Share Tree</h3>
        <p className="text-gray-400 text-sm mb-4">
          Anyone with this link can view <strong className="text-white">{treeName}</strong>
        </p>

        <div className="flex items-center gap-2 bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2.5 mb-5">
          <input
            type="text"
            value={url}
            readOnly
            className="flex-1 bg-transparent text-white text-sm outline-none"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={copyLink}
            className="text-emerald-400 hover:text-emerald-300 text-sm font-medium whitespace-nowrap transition"
          >
            Copy
          </button>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition rounded-lg hover:bg-gray-700"
          >
            Close
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
