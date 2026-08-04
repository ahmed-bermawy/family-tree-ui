import { describe, it, expect } from 'vitest';
import { en } from './en';
import { ar } from './ar';

function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return flatten(v as Record<string, unknown>, key);
    }
    return [key];
  });
}

describe('i18n key parity', () => {
  const enKeys = flatten(en as unknown as Record<string, unknown>);
  const arKeys = flatten(ar as unknown as Record<string, unknown>);

  it('EN and AR have the same number of keys', () => {
    expect(enKeys.length).toBe(arKeys.length);
  });

  it('every EN key exists in AR', () => {
    const missing = enKeys.filter((k) => !arKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it('every AR key exists in EN', () => {
    const extra = arKeys.filter((k) => !enKeys.includes(k));
    expect(extra).toEqual([]);
  });

  it('EN values are non-empty strings', () => {
    const empty = enKeys.filter((k) => {
      const v = getByPath(en as unknown as Record<string, unknown>, k);
      return typeof v !== 'string' || v.trim() === '';
    });
    expect(empty).toEqual([]);
  });

  it('AR values are non-empty strings', () => {
    const empty = arKeys.filter((k) => {
      const v = getByPath(ar as unknown as Record<string, unknown>, k);
      return typeof v !== 'string' || v.trim() === '';
    });
    expect(empty).toEqual([]);
  });
});

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}
