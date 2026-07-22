interface Props {
  x: number;
  y: number;
  onAdd: (type: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function NodeContextMenu({ x, y, onAdd, onEdit, onDelete, onClose }: Props) {
  const options = [
    { label: '➕ Add Spouse', action: () => onAdd('spouse') },
    { label: '👶 Add Child', action: () => onAdd('child') },
    { label: '👴 Add Parent', action: () => onAdd('parent') },
    { label: '👫 Add Sibling', action: () => onAdd('sibling') },
    { label: '✏️ Edit Name', action: onEdit },
    { label: '🗑️ Delete', action: onDelete, danger: true },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-1 min-w-[160px]"
        style={{ left: x, top: y }}
      >
        {options.map((opt) => (
          <button
            key={opt.label}
            onClick={opt.action}
            className={`w-full text-left px-4 py-2 text-sm transition hover:bg-gray-700 ${
              opt.danger ? 'text-red-400 hover:text-red-300' : 'text-gray-200 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </>
  );
}
