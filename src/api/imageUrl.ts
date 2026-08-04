import { API_BASE } from './client';

/**
 * Resolves a relative image/upload path to a full URL using the
 * environment's API base (staging vs production). Absolute URLs pass through.
 */
export function resolveImageUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  // Normalize: ensure exactly one slash between base and path
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}
