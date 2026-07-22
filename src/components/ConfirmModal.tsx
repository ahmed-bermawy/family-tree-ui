interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger, onConfirm, onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-[90vw] sm:w-96 shadow-2xl"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      >
        <div className="text-center mb-1">
          <span className="text-3xl">{danger ? '⚠️' : '❓'}</span>
        </div>
        <h3 className="text-lg font-semibold text-white text-center mb-2">{title}</h3>
        <p className="text-gray-400 text-sm text-center mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="px-5 py-2 text-sm text-gray-400 hover:text-white transition rounded-lg hover:bg-gray-700"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 text-sm font-semibold text-white rounded-lg transition ${
              danger
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {confirmLabel}
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
