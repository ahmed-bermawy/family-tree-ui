import { describe, it, expect, vi } from 'vitest';

// Mock the API_BASE so tests are deterministic
vi.mock('./client', () => ({
  API_BASE: 'https://family-tree-api.bermawy.tech',
}));

import { resolveImageUrl } from './imageUrl';

describe('resolveImageUrl', () => {
  it('returns empty string for null/undefined', () => {
    expect(resolveImageUrl(null)).toBe('');
    expect(resolveImageUrl(undefined)).toBe('');
  });

  it('passes through absolute http URLs', () => {
    expect(resolveImageUrl('http://example.com/pic.jpg')).toBe('http://example.com/pic.jpg');
  });

  it('passes through absolute https URLs', () => {
    expect(resolveImageUrl('https://cdn.example.com/pic.jpg')).toBe('https://cdn.example.com/pic.jpg');
  });

  it('passes through data URLs', () => {
    expect(resolveImageUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('prefixes relative paths with API_BASE', () => {
    expect(resolveImageUrl('/uploads/avatars/1.jpg')).toBe(
      'https://family-tree-api.bermawy.tech/uploads/avatars/1.jpg',
    );
  });

  it('prefixes bare paths without leading slash', () => {
    expect(resolveImageUrl('uploads/feedback/x.png')).toBe(
      'https://family-tree-api.bermawy.tech/uploads/feedback/x.png',
    );
  });
});
