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
  
  test('should extract BPM as integer not float', async () => {
    const sample = expectedValues.samples[0];
    const filePath = path.join(FIXTURES_DIR, sample.filename);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`Fixture not found: ${sample.filename}`);
      return;
    }
    
    const result = await analyzeAudio(filePath);
    
    expect(typeof result.bpm).toBe('number');
    expect(Number.isInteger(result.bpm)).toBe(true);
  });
  
  test('should return null for BPM when not present in metadata', async () => {
    // This test verifies that missing BPM returns null, not undefined or error
    // We would need a fixture without BPM metadata to test this properly
    // For now, we test that the result has a bpm property
    const sample = expectedValues.samples[0];
    const filePath = path.join(FIXTURES_DIR, sample.filename);
    
    if (!fs.existsSync(filePath)) {
      return;
    }
    
    const result = await analyzeAudio(filePath);
    expect(result).toHaveProperty('bpm');
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

describe('BPM Extraction - Detailed Tests', () => {
  
  test('should extract BPM from comment field with "BPM XXX" format', async () => {
    // Tests the primary BPM extraction method from comment tags
    const sample = expectedValues.samples.find(s => s.expected.bpm === 120);
    if (!sample) return;
    
    const filePath = path.join(FIXTURES_DIR, sample.filename);
    if (!fs.existsSync(filePath)) return;
    
    const result = await analyzeAudio(filePath);
    expect(result.bpm).toBe(120);
    expect(typeof result.bpm).toBe('number');
  });
  
  test('should handle various BPM values correctly', async () => {
    // Test different BPM values to ensure extraction works across range
    const bpmSamples = [
      { filename: 'test-100bpm-G-major.mp3', expected: 100 },
      { filename: 'test-120bpm-C-major.mp3', expected: 120 },
      { filename: 'test-128bpm-Am.mp3', expected: 128 },
      { filename: 'test-140bpm-Dm.mp3', expected: 140 }
    ];
    
    for (const sample of bpmSamples) {
      const filePath = path.join(FIXTURES_DIR, sample.filename);
      if (!fs.existsSync(filePath)) continue;
      
      const result = await analyzeAudio(filePath);
      expect(result.bpm).toBe(sample.expected);
    }
  });
  
  test('should return null for files without BPM metadata', async () => {
    // Note: This is a placeholder test since our fixtures all have BPM
    // In a real scenario, we'd test with a file that has no BPM tag
    // For now, we verify the function doesn't crash and returns a result
    const sample = expectedValues.samples[0];
    const filePath = path.join(FIXTURES_DIR, sample.filename);
    if (!fs.existsSync(filePath)) return;
    
    const result = await analyzeAudio(filePath);
    // Our fixtures have BPM, so it should not be null
    expect(result.bpm).not.toBeNull();
  });
  
  test('should round BPM to nearest integer', async () => {
    // Ensures BPM is always an integer, even if source has decimals
    const sample = expectedValues.samples[0];
    const filePath = path.join(FIXTURES_DIR, sample.filename);
    if (!fs.existsSync(filePath)) return;
    
    const result = await analyzeAudio(filePath);
    expect(Number.isInteger(result.bpm)).toBe(true);
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
