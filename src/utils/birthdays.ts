/**
 * Upcoming birthdays.
 *
 * Only people with a FULL birth date can have a birthday computed — a
 * year-only entry has no day/month, and "hidden" is deliberately not shown.
 */
export interface BirthdayPerson {
  id: number;
  name: string;
  birthDate?: string | null;
  birthPrecision?: string | null;
}

export interface UpcomingBirthday {
  personId: number;
  name: string;
  /** When it next occurs (local time, start of day). */
  next: Date;
  /** 0 = today, 1 = tomorrow … */
  daysUntil: number;
  /** The age they turn, when a usable birth year is known. */
  turning: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight today, so comparisons ignore the time of day. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Birthdays occurring within `withinDays`. Feb 29 falls back to Mar 1 in
 * common years, which is what `Date` does on its own.
 */
export function upcomingBirthdays(
  persons: BirthdayPerson[],
  withinDays = 30,
  now: Date = new Date(),
): UpcomingBirthday[] {
  const today = startOfDay(now);
  const out: UpcomingBirthday[] = [];

  for (const p of persons) {
    // A full date is required: "year" has no day/month, "hidden" stays private.
    if (!p.birthDate || p.birthPrecision !== 'full') continue;

    const src = new Date(p.birthDate);
    if (Number.isNaN(src.getTime())) continue;

    let next = new Date(today.getFullYear(), src.getMonth(), src.getDate());
    if (next.getTime() < today.getTime()) {
      next = new Date(today.getFullYear() + 1, src.getMonth(), src.getDate());
    }

    const daysUntil = Math.round((next.getTime() - today.getTime()) / DAY_MS);
    if (daysUntil > withinDays) continue;

    const birthYear = src.getFullYear();
    out.push({
      personId: p.id,
      name: p.name,
      next,
      daysUntil,
      // Guard against junk years (1800s default dates, typos).
      turning: birthYear > 1900 ? next.getFullYear() - birthYear : null,
    });
  }

  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}

/** "اليوم" / "بكرة" / "بعد 5 أيام" — the caller supplies the wording. */
export function birthdayWhen(daysUntil: number): 'today' | 'tomorrow' | 'soon' {
  if (daysUntil <= 0) return 'today';
  if (daysUntil === 1) return 'tomorrow';
  return 'soon';
}

/** A pre-filled WhatsApp congratulation link (no API, opens the app/web). */
export function whatsappGreeting(name: string, lang: 'ar' | 'en', turning: number | null): string {
  const msg =
    lang === 'ar'
      ? `🎂 كل سنة وانت طيب يا ${name}!${turning ? ` عقبال ${turning} سنة 🎉` : ''}`
      : `🎂 Happy birthday, ${name}!${turning ? ` Here's to ${turning}! 🎉` : ''}`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

/** Short, locale-independent display: numeric so EN and AR read the same. */
export function formatBirthday(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}
