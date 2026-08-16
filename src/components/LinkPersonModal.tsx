import { useMemo, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';

interface PersonOption {
  id: number;
  name: string;
}

interface Props {
  title: string;
  targetName: string;
  persons: PersonOption[];
  onLink: (personId: number, relationType: string) => void;
  onCancel: () => void;
}

export default function LinkPersonModal({ title, targetName, persons, onLink, onCancel }: Props) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [relationType, setRelationType] = useState('spouse');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return persons;
    return persons.filter((p) => p.name.toLowerCase().includes(q));
  }, [persons, search]);

  const selected = persons.find((p) => p.id === selectedId);

  const relationOptions = [
    { value: 'spouse', label: t.relSpouse },
    { value: 'child', label: t.relChild },
    { value: 'parent', label: t.relParent },
    { value: 'sibling', label: t.relSibling },
  ];

  // Clear preview: "Tamer will become a child of Mohamed"
  const preview = selected
    ? `${selected.name} ${t.willBecome} ${relationOptions.find((o) => o.value === relationType)?.label} ${t.of} ${targetName}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl p-5 sm:p-6 w-[90vw] sm:w-96 shadow-2xl"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
      >
        <h3 className="text-lg font-semibold text-white mb-1">🔗 {title}</h3>
        <p className="text-gray-400 text-sm mb-5">{t.linkPersonDesc}</p>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.selectPerson}
          className="w-full px-3.5 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition mb-3"
          autoFocus
        />

        {/* Person list */}
        <div className="max-h-44 overflow-y-auto border border-gray-700 rounded-lg mb-4 bg-gray-900/40">
          {filtered.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-6">{t.noTrees}</p>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={`w-full text-left px-3.5 py-2 text-sm transition border-b border-gray-800 last:border-0 ${
                selectedId === p.id
                  ? 'bg-emerald-600/20 text-emerald-300'
                  : 'text-gray-200 hover:bg-gray-700/50'
              }`}
            >
              👤 {p.name}
            </button>
          ))}
        </div>

        {/* Relation type */}
        <label className="text-gray-300 text-xs font-medium mb-1.5 block">{t.linkAs}</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {relationOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRelationType(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                relationType === opt.value
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                  : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Direction preview */}
        {preview && (
          <div className="bg-gray-900/60 border border-emerald-700/50 rounded-lg px-3 py-2.5 mb-5">
            <p className="text-sm text-emerald-300 font-medium" dir="auto">{preview}</p>
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition rounded-lg hover:bg-gray-700"
          >
            {t.cancel}
          </button>
          <button
            onClick={() => selectedId !== null && onLink(selectedId, relationType)}
            disabled={selectedId === null}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          >
            {t.linkPerson.replace(/^[^\s]+\s/, '')}
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
