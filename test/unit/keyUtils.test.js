/**
 * Unit Tests for Key Utilities (Camelot Conversion)
 */

import { describe, test, expect } from '@jest/globals';
import { toCamelot } from '../../src/audio/keyUtils.js';

describe('toCamelot', () => {
  
  describe('Major Keys', () => {
    test('should convert natural major keys', () => {
      expect(toCamelot('C', 'major')).toBe('8B');
      expect(toCamelot('D', 'major')).toBe('10B');
      expect(toCamelot('E', 'major')).toBe('12B');
      expect(toCamelot('F', 'major')).toBe('7B');
      expect(toCamelot('G', 'major')).toBe('9B');
      expect(toCamelot('A', 'major')).toBe('11B');
      expect(toCamelot('B', 'major')).toBe('1B');
    });
    
    test('should convert sharp major keys', () => {
      expect(toCamelot('C#', 'major')).toBe('3B');
      expect(toCamelot('D#', 'major')).toBe('5B');
      expect(toCamelot('F#', 'major')).toBe('2B');
      expect(toCamelot('G#', 'major')).toBe('4B');
      expect(toCamelot('A#', 'major')).toBe('6B');
    });
    
    test('should convert flat major keys', () => {
      expect(toCamelot('Db', 'major')).toBe('3B');
      expect(toCamelot('Eb', 'major')).toBe('5B');
      expect(toCamelot('Gb', 'major')).toBe('2B');
      expect(toCamelot('Ab', 'major')).toBe('4B');
      expect(toCamelot('Bb', 'major')).toBe('6B');
    });
    
    test('should default to major when mode not specified', () => {
      expect(toCamelot('C')).toBe('8B');
      expect(toCamelot('G')).toBe('9B');
      expect(toCamelot('D')).toBe('10B');
    });
  });
  
  describe('Minor Keys', () => {
    test('should convert natural minor keys', () => {
      expect(toCamelot('C', 'minor')).toBe('8A');
      expect(toCamelot('D', 'minor')).toBe('10A');
      expect(toCamelot('E', 'minor')).toBe('12A');
      expect(toCamelot('F', 'minor')).toBe('7A');
      expect(toCamelot('G', 'minor')).toBe('9A');
      expect(toCamelot('A', 'minor')).toBe('11A');
      expect(toCamelot('B', 'minor')).toBe('1A');
    });
    
    test('should convert sharp minor keys', () => {
      expect(toCamelot('C#', 'minor')).toBe('3A');
      expect(toCamelot('D#', 'minor')).toBe('5A');
      expect(toCamelot('F#', 'minor')).toBe('2A');
      expect(toCamelot('G#', 'minor')).toBe('4A');
      expect(toCamelot('A#', 'minor')).toBe('6A');
    });
    
    test('should convert flat minor keys', () => {
      expect(toCamelot('Db', 'minor')).toBe('3A');
      expect(toCamelot('Eb', 'minor')).toBe('5A');
      expect(toCamelot('Gb', 'minor')).toBe('2A');
      expect(toCamelot('Ab', 'minor')).toBe('4A');
      expect(toCamelot('Bb', 'minor')).toBe('6A');
    });
  });
  
  describe('Edge Cases', () => {
    test('should return null for invalid keys', () => {
      expect(toCamelot('X', 'major')).toBe(null);
      expect(toCamelot('H', 'minor')).toBe(null);
      expect(toCamelot('', 'major')).toBe(null);
    });
    
    test('should handle enharmonic equivalents', () => {
      // C# and Db should produce the same Camelot key
      expect(toCamelot('C#', 'major')).toBe(toCamelot('Db', 'major'));
      expect(toCamelot('F#', 'major')).toBe(toCamelot('Gb', 'major'));
      expect(toCamelot('G#', 'minor')).toBe(toCamelot('Ab', 'minor'));
    });
  });
  
  describe('Camelot Wheel Structure', () => {
    test('major keys should end with B', () => {
      const majorKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      majorKeys.forEach(key => {
        const camelot = toCamelot(key, 'major');
        expect(camelot).toMatch(/B$/);
      });
    });
    
    test('minor keys should end with A', () => {
      const minorKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      minorKeys.forEach(key => {
        const camelot = toCamelot(key, 'minor');
        expect(camelot).toMatch(/A$/);
      });
    });
    
    test('should produce valid Camelot positions (1-12)', () => {
      const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      keys.forEach(key => {
        const majorCamelot = toCamelot(key, 'major');
        const minorCamelot = toCamelot(key, 'minor');
        
        if (majorCamelot) {
          const position = parseInt(majorCamelot);
          expect(position).toBeGreaterThanOrEqual(1);
          expect(position).toBeLessThanOrEqual(12);
        }
        
        if (minorCamelot) {
          const position = parseInt(minorCamelot);
          expect(position).toBeGreaterThanOrEqual(1);
          expect(position).toBeLessThanOrEqual(12);
        }
      });
    });
  });
  
});
