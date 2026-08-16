import { describe, it, expect } from 'vitest';
import { isValidName, hasDigits, stripDigits } from './nameValidation';

describe('nameValidation', () => {
  describe('isValidName', () => {
    it('accepts English names', () => {
      expect(isValidName('Ahmed')).toBe(true);
      expect(isValidName('Mohamed Naser')).toBe(true);
      expect(isValidName("O'Connor")).toBe(true);
      expect(isValidName('Anne-Marie')).toBe(true);
    });

    it('accepts Arabic names', () => {
      expect(isValidName('محمد')).toBe(true);
      expect(isValidName('أحمد البرماوي')).toBe(true);
      expect(isValidName('ياسمين')).toBe(true);
    });

    it('rejects names with digits', () => {
      expect(isValidName('Ahmed123')).toBe(false);
      expect(isValidName('محمد 2024')).toBe(false);
      expect(isValidName('Tamer1234')).toBe(false);
    });

    it('rejects names with only digits', () => {
      expect(isValidName('12345')).toBe(false);
      expect(isValidName('٢٠٢٤')).toBe(false);
    });

    it('rejects empty / whitespace-only names', () => {
      expect(isValidName('')).toBe(false);
      expect(isValidName('   ')).toBe(false);
    });

    it('rejects symbols', () => {
      expect(isValidName('Ahmed!')).toBe(false);
      expect(isValidName('@Mohamed')).toBe(false);
      expect(isValidName('Ahmed_123')).toBe(false);
    });
  });

  describe('hasDigits', () => {
    it('detects western digits', () => {
      expect(hasDigits('Ahmed1')).toBe(true);
      expect(hasDigits('Ahmed')).toBe(false);
    });
    it('detects arabic-indic digits', () => {
      expect(hasDigits('محمد٢')).toBe(true);
      expect(hasDigits('محمد')).toBe(false);
    });
  });

  describe('stripDigits', () => {
    it('removes western digits', () => {
      expect(stripDigits('Ahmed123')).toBe('Ahmed');
    });
    it('removes arabic-indic digits', () => {
      expect(stripDigits('محمد٢٠٢٤')).toBe('محمد');
    });
  });
});
