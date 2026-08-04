import { describe, it, expect } from 'vitest';
import { resolveDeletePersonIds } from './deleteResolution';

const personNode = (id: string) => ({ id, type: 'personNode', data: {} });
const coupleNode = (id: string, p1?: number, p2?: number) => ({
  id,
  type: 'coupleNode',
  data: { person1: { id: p1 }, person2: { id: p2 } },
});

describe('resolveDeletePersonIds — the couple-delete bug', () => {
  it('returns the numeric id for a regular person node', () => {
    expect(resolveDeletePersonIds('42', [personNode('42')])).toEqual([42]);
  });

  it('returns BOTH person ids for a couple node (was NaN before the fix)', () => {
    const nodes = [coupleNode('couple-3', 12, 13)];
    const ids = resolveDeletePersonIds('couple-3', nodes);
    expect(ids).toEqual([12, 13]);
    // The core regression: NO NaN in the result
    expect(ids.every((n) => !Number.isNaN(n))).toBe(true);
  });

  it('filters out missing person ids in a couple node', () => {
    const nodes = [coupleNode('couple-3', 12, undefined)];
    expect(resolveDeletePersonIds('couple-3', nodes)).toEqual([12]);
  });

  it('returns empty array for unknown node id', () => {
    expect(resolveDeletePersonIds('couple-9', [coupleNode('couple-3', 1, 2)])).toEqual([]);
  });

  it('returns empty array for non-numeric single node id', () => {
    expect(resolveDeletePersonIds('abc', [personNode('abc')])).toEqual([]);
  });

  it('never returns NaN even for malformed couple data', () => {
    const nodes = [{ id: 'couple-1', type: 'coupleNode', data: {} }];
    const ids = resolveDeletePersonIds('couple-1', nodes);
    expect(ids).toEqual([]);
  });
});
