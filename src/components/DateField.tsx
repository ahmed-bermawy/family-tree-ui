import { useI18n } from '../i18n/I18nContext';
import { isValidYear, type DateEdit, type DateKind, type DatePrecision } from '../utils/lifeDates';

interface Props {
  kind: DateKind;
  value: DateEdit;
  onChange: (next: DateEdit) => void;
}

/**
 * Optional birth or death date.
 *
 * The visitor chooses how much to enter — and, importantly, how much of it
 * is allowed to appear on the tree ("hidden" keeps the date for age and
 * sorting without ever rendering it).
 */
export default function DateField({ kind, value, onChange }: Props) {
  const { t } = useI18n();

  const label = kind === 'birth' ? t.dateBirthLabel : t.dateDeathLabel;
  const hint = kind === 'birth' ? t.dateBirthHint : t.dateDeathHint;

  const options: { key: DatePrecision; label: string }[] = [
    { key: '', label: t.dateNone },
    { key: 'year', label: t.dateYearOnly },
    { key: 'full', label: t.dateFull },
    { key: 'hidden', label: t.dateHidden },
  ];

  const yearInvalid = value.precision === 'year' && value.value !== '' && !isValidYear(value.value);

  const pick = (key: DatePrecision) => {
    // Keep whatever was typed when it still makes sense (full ↔ hidden share a shape)
    let next = '';
    if (key !== '' && value.value) next = value.value;
    if (key === 'year') next = value.value.slice(0, 4);
    if (key === 'full' || key === 'hidden') {
      next = /^\d{4}$/.test(value.value) ? `${value.value}-01-01` : value.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) next = '';
    }
    onChange({ precision: key, value: next });
  };

  return (
    <div className="mb-5">
      <label className="text-gray-300 text-xs font-medium mb-1.5 block">
        {kind === 'death' ? '🕊️ ' : ''}
        {label} <span className="text-gray-500">({t.dateOptional})</span>
      </label>

      <select
        value={value.precision}
        onChange={(e) => pick(e.target.value as DatePrecision)}
        className="w-full px-3.5 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>

      {value.precision !== '' && (
        <div className="mt-2">
          {value.precision === 'year' ? (
            <input
              type="number"
              min={1800}
              max={2100}
              value={value.value}
              onChange={(e) => onChange({ ...value, value: e.target.value.slice(0, 4) })}
              placeholder={t.dateYearPlaceholder}
              className={`w-full px-3.5 py-2.5 bg-gray-700/50 border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition ${
                yearInvalid ? 'border-red-500' : 'border-gray-600'
              }`}
            />
          ) : (
            <input
              type="date"
              value={value.value}
              onChange={(e) => onChange({ ...value, value: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          )}
        </div>
      )}

      {yearInvalid ? (
        <p className="text-red-400 text-xs mt-1.5">⚠️ {t.dateInvalidYear}</p>
      ) : (
        <p className="text-gray-600 text-[10px] mt-1.5">{hint}</p>
      )}
    </div>
  );
}
