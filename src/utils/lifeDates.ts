/**
 * Life-date helpers — birth and death share the same model.
 *
 * Stored shape (backend): <field>Date (full ISO date) + <field>Precision
 *   "hidden" — a real date, deliberately not shown on the tree
 *   "year"   — show the year alone
 *   "full"   — show day + month + year
 *   null     — no date at all
 *
 * Edit shape (UI): { precision: '', 'year', 'full', 'hidden', value: '1980' | '1980-03-12' }
 */

export type DatePrecision = '' | 'year' | 'full' | 'hidden';

export interface DateEdit {
  precision: DatePrecision;
  /** 'YYYY' when precision is 'year', otherwise 'YYYY-MM-DD' */
  value: string;
}

export const EMPTY_DATE: DateEdit = { precision: '', value: '' };

/** Which of the two dates a field is editing */
export type DateKind = 'birth' | 'death';

/** The four date-ish columns the graph returns for a person */
export interface LifeDates {
  birthDate?: string | null;
  birthPrecision?: string | null;
  deathDate?: string | null;
  deathPrecision?: string | null;
}

/** UI → API payload for one date */
export function dateToApi(
  edit: DateEdit,
  kind: DateKind,
): { birthDate?: string | null; birthPrecision?: string | null; deathDate?: string | null; deathPrecision?: string | null } {
  if (!edit.precision || !edit.value) {
    return kind === 'birth'
      ? { birthDate: null, birthPrecision: null }
      : { deathDate: null, deathPrecision: null };
  }
  const value = edit.precision === 'year' ? `${edit.value}-01-01` : edit.value;
  return kind === 'birth'
    ? { birthDate: value, birthPrecision: edit.precision }
    : { deathDate: value, deathPrecision: edit.precision };
}

/** API → UI for one date */
export function dateFromApi(
  date?: string | null,
  precision?: string | null,
): DateEdit {
  if (!date) return { ...EMPTY_DATE };
  const iso = String(date).slice(0, 10); // 'YYYY-MM-DD'
  const p = (precision as DatePrecision) || 'full';
  return { precision: p, value: p === 'year' ? iso.slice(0, 4) : iso };
}

/** Sensible range check for a year typed by hand */
export function isValidYear(year: string): boolean {
  const n = Number(year);
  return /^\d{4}$/.test(year) && n >= 1800 && n <= 2100;
}

/**
 * Render one date. Null means "show nothing".
 * Month names are avoided on purpose: a node is tiny, and a numeric date
 * reads the same in both languages. Full dates show as DD/MM/YYYY.
 */
export function displayDate(date?: string | null, precision?: string | null): string | null {
  if (!date) return null;
  const p = precision || 'full';
  if (p === 'hidden') return null;

  const iso = String(date).slice(0, 10);
  const [y, m, d] = iso.split('-');
  if (!y) return null;

  if (p === 'year') return y;
  if (!m || !d) return y;
  return `${d}/${m}/${y}`;
}

/**
 * The line under a name: "1952", "1952 – 2011", or "† 2011" when only the
 * death date is known. Hidden/absent dates simply drop out of the string.
 */
export function lifeSpan(dates: LifeDates): string | null {
  const birth = displayDate(dates.birthDate, dates.birthPrecision);
  const death = displayDate(dates.deathDate, dates.deathPrecision);

  if (birth && death) return `${birth} – ${death}`;
  if (birth) return birth;
  if (death) return `† ${death}`;
  return null;
}

/** Is this person recorded as deceased? (any death date, hidden or not) */
export function isDeceased(dates: LifeDates): boolean {
  return !!dates.deathDate;
}

/** Age in whole years from the birth date, or null when there is no usable date */
export function ageFrom(birthDate?: string | null, deathDate?: string | null): number | null {
  if (!birthDate) return null;
  const born = new Date(String(birthDate).slice(0, 10));
  if (Number.isNaN(born.getTime())) return null;
  // Age at death when we know it, otherwise age today
  const end = deathDate ? new Date(String(deathDate).slice(0, 10)) : new Date();
  if (Number.isNaN(end.getTime())) return null;
  let age = end.getFullYear() - born.getFullYear();
  const m = end.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < born.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}
