import { useI18n } from '../i18n/I18nContext';

interface Props {
  x: number;
  y: number;
  onAdd: (type: string) => void;
  onLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  /** true when "Add Spouse" is not allowed for the clicked person */
  spouseDisabled?: boolean;
  /** short reason shown under the disabled "Add Spouse" item */
  spouseHint?: string;
  /** true when "Add Parent" is not allowed (both parents already known) */
  parentDisabled?: boolean;
  /** short reason shown under the disabled "Add Parent" item */
  parentHint?: string;
}

export default function NodeContextMenu({
  x, y, onAdd, onLink, onEdit, onDelete, onClose,
  spouseDisabled = false, spouseHint = '',
  parentDisabled = false, parentHint = '',
}: Props) {
  const { t } = useI18n();

  const options = [
    { label: t.addSpouse, action: () => onAdd('spouse'), disabled: spouseDisabled, hint: spouseHint },
    { label: t.addChild, action: () => onAdd('child') },
    { label: t.addParent, action: () => onAdd('parent'), disabled: parentDisabled, hint: parentHint },
    { label: t.addSibling, action: () => onAdd('sibling') },
    { label: t.linkPerson, action: onLink },
    { label: t.edit, action: onEdit },
    { label: t.deletePerson, action: onDelete, danger: true },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-1 min-w-[190px]"
        style={{ left: x, top: y }}
      >
        {options.map((opt) => (
          <button
            key={opt.label}
            onClick={opt.disabled ? undefined : opt.action}
            disabled={opt.disabled}
            title={opt.disabled ? opt.hint : undefined}
            className={`w-full text-left px-4 py-2 text-sm transition ${
              opt.disabled
                ? 'text-gray-500 cursor-not-allowed'
                : opt.danger
                  ? 'text-red-400 hover:text-red-300 hover:bg-gray-700'
                  : 'text-gray-200 hover:text-white hover:bg-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              {opt.label}
              {opt.disabled && <span className="text-xs">🔒</span>}
            </span>
            {opt.hint && (
              <span className={`block text-[10px] mt-0.5 ${opt.disabled ? 'text-gray-500' : 'text-gray-400'}`}>
                {opt.hint}
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}
