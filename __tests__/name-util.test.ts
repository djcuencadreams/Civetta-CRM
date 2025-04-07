/**
 * Test suite for name-utils functionality
 * 
 * These tests verify that the name utility functions work correctly
 * and maintain consistency in name generation throughout the application
 */

import { 
  generateFullName, 
  ensureNameField, 
  isNameConsistent 
} from "../server/utils/name-utils";

describe('Name utilities', () => {
  describe('generateFullName', () => {
    it('should generate a full name from firstName and lastName', () => {
      expect(generateFullName('Juan', 'Pérez')).toBe('Juan Pérez');
    });

    it('should handle null or undefined inputs', () => {
      expect(generateFullName(null, 'Pérez')).toBe('Pérez');
      expect(generateFullName('Juan', null)).toBe('Juan');
      expect(generateFullName(null, null)).toBe('');
      expect(generateFullName(undefined, 'Pérez')).toBe('Pérez');
      expect(generateFullName('Juan', undefined)).toBe('Juan');
    });

    it('should trim whitespace from inputs', () => {
      expect(generateFullName(' Juan ', ' Pérez ')).toBe('Juan Pérez');
    });
  });

  describe('ensureNameField', () => {
    it('should set name field based on firstName and lastName', () => {
      const data = { firstName: 'Juan', lastName: 'Pérez' };
      const result = ensureNameField(data);
      expect(result.name).toBe('Juan Pérez');
    });

    it('should not modify object if firstName and lastName are missing', () => {
      const data = { email: 'test@example.com' } as any;
      const result = ensureNameField(data);
      expect(result).toEqual(data);
      expect(result.name).toBeUndefined();
    });

    it('should handle existing name field', () => {
      const data = { firstName: 'Juan', lastName: 'Pérez', name: 'Old Name' };
      const result = ensureNameField(data);
      expect(result.name).toBe('Juan Pérez');
    });
  });

  describe('isNameConsistent', () => {
    it('should return true when name matches firstName + lastName', () => {
      const data = { firstName: 'Juan', lastName: 'Pérez', name: 'Juan Pérez' };
      expect(isNameConsistent(data)).toBe(true);
    });

    it('should return false when name does not match firstName + lastName', () => {
      const data = { firstName: 'Juan', lastName: 'Pérez', name: 'Different Name' };
      expect(isNameConsistent(data)).toBe(false);
    });

    it('should return true if firstName or lastName is missing', () => {
      expect(isNameConsistent({ name: 'Some Name' })).toBe(true);
      expect(isNameConsistent({ firstName: 'Juan' })).toBe(true);
      expect(isNameConsistent({ lastName: 'Pérez' })).toBe(true);
    });
  });
});