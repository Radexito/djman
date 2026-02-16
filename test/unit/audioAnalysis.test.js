/**
 * Unit Tests for Audio Analysis Extraction Logic
 * 
 * Tests the BPM and key extraction against known test fixtures.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { analyzeAudio, calculateEnergy, calculateLoudness, parseKeyToCamelot } from '../../src/audio/audioAnalysis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const EXPECTED_VALUES_PATH = path.join(FIXTURES_DIR, 'expected-values.json');

let expectedValues;

beforeAll(() => {
  // Load expected values
  if (!fs.existsSync(EXPECTED_VALUES_PATH)) {
    throw new Error(`Expected values file not found: ${EXPECTED_VALUES_PATH}`);
  }
  expectedValues = JSON.parse(fs.readFileSync(EXPECTED_VALUES_PATH, 'utf8'));
});

describe('Audio Analysis - BPM and Key Extraction', () => {
  
  test('should extract BPM from test fixtures', async () => {
    for (const sample of expectedValues.samples) {
      const filePath = path.join(FIXTURES_DIR, sample.filename);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`Fixture not found: ${sample.filename}`);
        continue;
      }
      
      const result = await analyzeAudio(filePath);
      
      expect(result.bpm).toBe(sample.expected.bpm);
    }
  });
  
  test('should extract key from test fixtures', async () => {
    for (const sample of expectedValues.samples) {
      const filePath = path.join(FIXTURES_DIR, sample.filename);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`Fixture not found: ${sample.filename}`);
        continue;
      }
      
      const result = await analyzeAudio(filePath);
      
      expect(result.key_raw).toBe(sample.expected.key_raw);
    }
  });
  
  test('should convert key to Camelot notation', async () => {
    for (const sample of expectedValues.samples) {
      const filePath = path.join(FIXTURES_DIR, sample.filename);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`Fixture not found: ${sample.filename}`);
        continue;
      }
      
      const result = await analyzeAudio(filePath);
      
      expect(result.key_camelot).toBe(sample.expected.key_camelot);
    }
  });
  
  test('should calculate energy and loudness', async () => {
    const sample = expectedValues.samples[0];
    const filePath = path.join(FIXTURES_DIR, sample.filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Fixture not found: ${sample.filename}`);
    }
    
    const result = await analyzeAudio(filePath);
    
    // Energy should be between 1 and 10
    expect(result.energy).toBeGreaterThanOrEqual(1);
    expect(result.energy).toBeLessThanOrEqual(10);
    
    // Loudness should be negative (LUFS)
    expect(result.loudness).toBeLessThan(0);
  });
  
});

describe('Key to Camelot Conversion', () => {
  
  test('should convert major keys correctly', () => {
    expect(parseKeyToCamelot('C')).toBe('8B');
    expect(parseKeyToCamelot('C major')).toBe('8B');
    expect(parseKeyToCamelot('G')).toBe('9B');
    expect(parseKeyToCamelot('D')).toBe('10B');
    expect(parseKeyToCamelot('A')).toBe('11B');
  });
  
  test('should convert minor keys correctly', () => {
    expect(parseKeyToCamelot('Am')).toBe('11A');
    expect(parseKeyToCamelot('A minor')).toBe('11A');
    expect(parseKeyToCamelot('Dm')).toBe('10A');
    expect(parseKeyToCamelot('Em')).toBe('12A');
    expect(parseKeyToCamelot('Bm')).toBe('1A');
  });
  
  test('should handle sharp and flat keys', () => {
    expect(parseKeyToCamelot('C#')).toBe('3B');
    expect(parseKeyToCamelot('Db')).toBe('3B');
    expect(parseKeyToCamelot('F#')).toBe('2B');
    expect(parseKeyToCamelot('Gb')).toBe('2B');
    expect(parseKeyToCamelot('C#m')).toBe('3A');
    expect(parseKeyToCamelot('Dbm')).toBe('3A');
  });
  
  test('should return null for invalid keys', () => {
    expect(parseKeyToCamelot(null)).toBe(null);
    expect(parseKeyToCamelot('')).toBe(null);
    expect(parseKeyToCamelot('invalid')).toBe(null);
    expect(parseKeyToCamelot('123')).toBe(null);
  });
  
});

describe('Energy Calculation', () => {
  
  test('should calculate energy based on bitrate', () => {
    const lowBitrate = {
      format: { bitrate: 96000 }
    };
    const midBitrate = {
      format: { bitrate: 192000 }
    };
    const highBitrate = {
      format: { bitrate: 320000 }
    };
    
    expect(calculateEnergy(lowBitrate)).toBe(4); // 5 - 1 = 4
    expect(calculateEnergy(midBitrate)).toBe(6); // 5 + 1 = 6
    expect(calculateEnergy(highBitrate)).toBe(7); // 5 + 2 = 7
  });
  
  test('should cap energy between 1 and 10', () => {
    const veryLow = {
      format: { bitrate: 32000 }
    };
    const veryHigh = {
      format: { bitrate: 320000, sampleRate: 48000, codec: 'FLAC' }
    };
    
    const lowEnergy = calculateEnergy(veryLow);
    const highEnergy = calculateEnergy(veryHigh);
    
    expect(lowEnergy).toBeGreaterThanOrEqual(1);
    expect(highEnergy).toBeLessThanOrEqual(10);
  });
  
});

describe('Loudness Calculation', () => {
  
  test('should calculate loudness based on bitrate', () => {
    expect(calculateLoudness({ format: { bitrate: 128000 } })).toBe(-12);
    expect(calculateLoudness({ format: { bitrate: 192000 } })).toBe(-11);
    expect(calculateLoudness({ format: { bitrate: 256000 } })).toBe(-10);
    expect(calculateLoudness({ format: { bitrate: 320000 } })).toBe(-8);
  });
  
  test('should adjust for lossless formats', () => {
    expect(calculateLoudness({ format: { codec: 'FLAC' } })).toBe(-10);
    expect(calculateLoudness({ format: { codec: 'ALAC' } })).toBe(-10);
  });
  
});
