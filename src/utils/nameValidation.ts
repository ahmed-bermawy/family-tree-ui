/**
 * Name validation helpers.
 * Names must contain only letters (Arabic + Latin), spaces, dots,
 * hyphens and apostrophes — NO digits, no symbols.
 */

const NAME_REGEX = /^[\p{L}\s.\-']+$/u;

/** True if the name contains only letters/spaces/dots/hyphens/apostrophes. */
export function isValidName(name: string): boolean {
  return NAME_REGEX.test(name.trim());
}

/** True if the name contains any digit (0-9, Arabic-Indic ٠-٩). */
export function hasDigits(name: string): boolean {
  return /[0-9\u0660-\u0669\u06F0-\u06F9]/.test(name);
}

/** Strip digits from a name (used on paste). */
export function stripDigits(name: string): string {
  return name.replace(/[0-9\u0660-\u0669\u06F0-\u06F9]/g, '');
}
