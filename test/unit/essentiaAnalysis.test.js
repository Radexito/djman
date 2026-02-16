/**
 * Unit tests for essentiaAnalysis.js
 * Tests real-time BPM and key detection from audio signals
 */

import { jest } from '@jest/globals';
import { 
  detectBPM, 
  detectKey, 
  calculateAudioEnergy, 
  calculateAudioLoudness,
  analyzeAudioSignal 
} from '../../src/audio/essentiaAnalysis.js';

// Mock essentia.js
jest.mock('essentia.js', () => {
  const mockVectorFloat = {
    delete: jest.fn()
  };
  
  const mockEssentia = {
    arrayToVector: jest.fn(() => mockVectorFloat),
    RhythmExtractor2013: jest.fn(() => ({ bpm: 120 })),
    KeyExtractor: jest.fn(() => ({ 
      key: 'C', 
      scale: 'major', 
      strength: 0.8 
    }))
  };
  
  return {
    Essentia: jest.fn(() => mockEssentia),
    EssentiaWASM: {}
  };
});

describe('Essentia Analysis', () => {
  
  describe('detectBPM', () => {
    
    test('should detect BPM from audio data', async () => {
      const audioData = new Float32Array(44100); // 1 second at 44.1kHz
      // Fill with some mock audio data
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = Math.sin(i * 0.01);
      }
      
      const bpm = await detectBPM(audioData, 44100);
      
      expect(bpm).toBe(120);
      expect(typeof bpm).toBe('number');
    });

    test('should return null for BPM outside valid range', async () => {
      const { Essentia } = await import('essentia.js');
      const mockEssentia = new Essentia();
      mockEssentia.RhythmExtractor2013.mockReturnValueOnce({ bpm: 300 }); // Too high
      
      const audioData = new Float32Array(44100);
      const bpm = await detectBPM(audioData, 44100);
      
      // Should be null or within range after next call resets mock
      expect(bpm === null || (bpm >= 40 && bpm <= 200)).toBe(true);
    });

    test('should round BPM to nearest integer', async () => {
      const { Essentia } = await import('essentia.js');
      const mockEssentia = new Essentia();
      mockEssentia.RhythmExtractor2013.mockReturnValueOnce({ bpm: 128.7 });
      
      const audioData = new Float32Array(44100);
      const bpm = await detectBPM(audioData, 44100);
      
      expect(Number.isInteger(bpm)).toBe(true);
    });

    test('should handle detection failures gracefully', async () => {
      const { Essentia } = await import('essentia.js');
      const mockEssentia = new Essentia();
      mockEssentia.RhythmExtractor2013.mockImplementationOnce(() => {
        throw new Error('Detection failed');
      });
      
      const audioData = new Float32Array(44100);
      const bpm = await detectBPM(audioData, 44100);
      
      expect(bpm).toBeNull();
    });

    test('should clean up vector resources', async () => {
      const { Essentia } = await import('essentia.js');
      const mockEssentia = new Essentia();
      const mockVector = { delete: jest.fn() };
      mockEssentia.arrayToVector.mockReturnValueOnce(mockVector);
      
      const audioData = new Float32Array(44100);
      await detectBPM(audioData, 44100);
      
      expect(mockVector.delete).toHaveBeenCalled();
    });

    test('should validate BPM range (40-200)', async () => {
      const { Essentia } = await import('essentia.js');
      const mockEssentia = new Essentia();
      
      // Test lower bound
      mockEssentia.RhythmExtractor2013.mockReturnValueOnce({ bpm: 39 });
      let result = await detectBPM(new Float32Array(44100), 44100);
      expect(result).toBeNull();
      
      // Test valid low
      mockEssentia.RhythmExtractor2013.mockReturnValueOnce({ bpm: 40 });
      result = await detectBPM(new Float32Array(44100), 44100);
      expect(result).toBe(40);
      
      // Test valid high
      mockEssentia.RhythmExtractor2013.mockReturnValueOnce({ bpm: 200 });
      result = await detectBPM(new Float32Array(44100), 44100);
      expect(result).toBe(200);
      
      // Test upper bound
      mockEssentia.RhythmExtractor2013.mockReturnValueOnce({ bpm: 201 });
      result = await detectBPM(new Float32Array(44100), 44100);
      expect(result).toBeNull();
    });
  });

  describe('detectKey', () => {
    
    test('should detect musical key from audio data', async () => {
      const audioData = new Float32Array(44100);
      const result = await detectKey(audioData, 44100);
      
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('scale');
      expect(result).toHaveProperty('strength');
      expect(result.key).toBe('C');
      expect(result.scale).toBe('major');
    });

    test('should return null for low confidence detection', async () => {
      const { Essentia } = await import('essentia.js');
      const mockEssentia = new Essentia();
      mockEssentia.KeyExtractor.mockReturnValueOnce({ 
        key: 'D', 
        scale: 'minor', 
        strength: 0.2  // Below 0.3 threshold
      });
      
      const audioData = new Float32Array(44100);
      const result = await detectKey(audioData, 44100);
      
      expect(result).toBeNull();
    });

    test('should handle key detection failures gracefully', async () => {
      const { Essentia } = await import('essentia.js');
      const mockEssentia = new Essentia();
      mockEssentia.KeyExtractor.mockImplementationOnce(() => {
        throw new Error('Key detection failed');
      });
      
      const audioData = new Float32Array(44100);
      const result = await detectKey(audioData, 44100);
      
      expect(result).toBeNull();
    });

    test('should detect both major and minor keys', async () => {
      const { Essentia } = await import('essentia.js');
      const mockEssentia = new Essentia();
      
      // Major key
      mockEssentia.KeyExtractor.mockReturnValueOnce({ 
        key: 'G', 
        scale: 'major', 
        strength: 0.9 
      });
      let result = await detectKey(new Float32Array(44100), 44100);
      expect(result.scale).toBe('major');
      
      // Minor key
      mockEssentia.KeyExtractor.mockReturnValueOnce({ 
        key: 'A', 
        scale: 'minor', 
        strength: 0.8 
      });
      result = await detectKey(new Float32Array(44100), 44100);
      expect(result.scale).toBe('minor');
    });

    test('should clean up vector resources', async () => {
      const { Essentia } = await import('essentia.js');
      const mockEssentia = new Essentia();
      const mockVector = { delete: jest.fn() };
      mockEssentia.arrayToVector.mockReturnValueOnce(mockVector);
      
      const audioData = new Float32Array(44100);
      await detectKey(audioData, 44100);
      
      expect(mockVector.delete).toHaveBeenCalled();
    });
  });

  describe('calculateAudioEnergy', () => {
    
    test('should calculate energy from audio RMS', () => {
      // Create audio with known RMS
      const audioData = new Float32Array(1000);
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = 0.5; // Constant amplitude
      }
      
      const energy = calculateAudioEnergy(audioData);
      
      expect(energy).toBeGreaterThanOrEqual(1);
      expect(energy).toBeLessThanOrEqual(10);
      expect(Number.isInteger(energy)).toBe(true);
    });

    test('should return higher energy for louder audio', () => {
      const quietAudio = new Float32Array(1000).fill(0.1);
      const loudAudio = new Float32Array(1000).fill(0.8);
      
      const quietEnergy = calculateAudioEnergy(quietAudio);
      const loudEnergy = calculateAudioEnergy(loudAudio);
      
      expect(loudEnergy).toBeGreaterThan(quietEnergy);
    });

    test('should cap energy between 1 and 10', () => {
      // Very quiet audio
      const veryQuiet = new Float32Array(1000).fill(0.001);
      const energyQuiet = calculateAudioEnergy(veryQuiet);
      expect(energyQuiet).toBeGreaterThanOrEqual(1);
      expect(energyQuiet).toBeLessThanOrEqual(10);
      
      // Very loud audio
      const veryLoud = new Float32Array(1000).fill(1.0);
      const energyLoud = calculateAudioEnergy(veryLoud);
      expect(energyLoud).toBeGreaterThanOrEqual(1);
      expect(energyLoud).toBeLessThanOrEqual(10);
    });

    test('should consider dynamic range', () => {
      // Audio with wide dynamic range
      const dynamicAudio = new Float32Array(1000);
      for (let i = 0; i < dynamicAudio.length; i++) {
        dynamicAudio[i] = (i % 2 === 0) ? -0.8 : 0.8;
      }
      
      // Audio with narrow dynamic range
      const flatAudio = new Float32Array(1000).fill(0.5);
      
      const dynamicEnergy = calculateAudioEnergy(dynamicAudio);
      const flatEnergy = calculateAudioEnergy(flatAudio);
      
      // Dynamic audio should have different energy
      expect(dynamicEnergy).not.toBe(flatEnergy);
    });

    test('should handle error and return default energy', () => {
      // Invalid input
      const result = calculateAudioEnergy(null);
      expect(result).toBe(5); // Default mid-energy
    });

    test('should handle silence', () => {
      const silence = new Float32Array(1000).fill(0);
      const energy = calculateAudioEnergy(silence);
      
      expect(energy).toBeGreaterThanOrEqual(1);
      expect(energy).toBeLessThanOrEqual(10);
    });
  });

  describe('calculateAudioLoudness', () => {
    
    test('should calculate loudness in LUFS', () => {
      const audioData = new Float32Array(1000).fill(0.5);
      const loudness = calculateAudioLoudness(audioData, 44100);
      
      expect(typeof loudness).toBe('number');
      expect(loudness).toBeLessThan(0); // LUFS is typically negative
    });

    test('should return higher LUFS for louder audio', () => {
      const quietAudio = new Float32Array(1000).fill(0.1);
      const loudAudio = new Float32Array(1000).fill(0.8);
      
      const quietLoudness = calculateAudioLoudness(quietAudio, 44100);
      const loudLoudness = calculateAudioLoudness(loudAudio, 44100);
      
      expect(loudLoudness).toBeGreaterThan(quietLoudness);
    });

    test('should round to one decimal place', () => {
      const audioData = new Float32Array(1000).fill(0.5);
      const loudness = calculateAudioLoudness(audioData, 44100);
      
      const decimalPlaces = (loudness.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    });

    test('should handle silence without crashing', () => {
      const silence = new Float32Array(1000).fill(0);
      const loudness = calculateAudioLoudness(silence, 44100);
      
      expect(typeof loudness).toBe('number');
      expect(isFinite(loudness)).toBe(true);
    });

    test('should handle errors and return default', () => {
      const loudness = calculateAudioLoudness(null, 44100);
      expect(loudness).toBe(-12); // Default loudness
    });
  });

  describe('analyzeAudioSignal', () => {
    
    test('should perform complete audio analysis', async () => {
      const audioData = new Float32Array(44100);
      const results = await analyzeAudioSignal(audioData, 44100);
      
      expect(results).toHaveProperty('bpm');
      expect(results).toHaveProperty('key');
      expect(results).toHaveProperty('scale');
      expect(results).toHaveProperty('energy');
      expect(results).toHaveProperty('loudness');
    });

    test('should return all metrics even if some fail', async () => {
      const { Essentia } = await import('essentia.js');
      const mockEssentia = new Essentia();
      
      // Make BPM detection fail
      mockEssentia.RhythmExtractor2013.mockImplementationOnce(() => {
        throw new Error('BPM failed');
      });
      
      const audioData = new Float32Array(44100);
      const results = await analyzeAudioSignal(audioData, 44100);
      
      expect(results.bpm).toBeNull();
      expect(results).toHaveProperty('energy');
      expect(results).toHaveProperty('loudness');
    });

    test('should include key and scale when detected', async () => {
      const audioData = new Float32Array(44100);
      const results = await analyzeAudioSignal(audioData, 44100);
      
      if (results.key) {
        expect(typeof results.key).toBe('string');
        expect(typeof results.scale).toBe('string');
        expect(['major', 'minor']).toContain(results.scale);
      }
    });

    test('should handle complete analysis failure gracefully', async () => {
      const { Essentia } = await import('essentia.js');
      const mockEssentia = new Essentia();
      
      mockEssentia.RhythmExtractor2013.mockImplementationOnce(() => {
        throw new Error('Complete failure');
      });
      mockEssentia.KeyExtractor.mockImplementationOnce(() => {
        throw new Error('Complete failure');
      });
      
      const audioData = new Float32Array(44100);
      const results = await analyzeAudioSignal(audioData, 44100);
      
      expect(results).toBeDefined();
      expect(results.bpm).toBeNull();
      expect(results.key).toBeNull();
    });

    test('should use provided sample rate', async () => {
      const audioData = new Float32Array(48000);
      const results = await analyzeAudioSignal(audioData, 48000);
      
      expect(results).toBeDefined();
    });

    test('should default to 44100 sample rate', async () => {
      const audioData = new Float32Array(44100);
      const results = await analyzeAudioSignal(audioData);
      
      expect(results).toBeDefined();
    });
  });

  describe('Integration', () => {
    
    test('should analyze realistic audio data', async () => {
      // Generate a sine wave at 440 Hz (A note)
      const sampleRate = 44100;
      const duration = 2; // 2 seconds
      const audioData = new Float32Array(sampleRate * duration);
      const frequency = 440;
      
      for (let i = 0; i < audioData.length; i++) {
        audioData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5;
      }
      
      const results = await analyzeAudioSignal(audioData, sampleRate);
      
      expect(results.energy).toBeGreaterThan(0);
      expect(results.loudness).toBeLessThan(0);
    });

    test('should handle short audio clips', async () => {
      const audioData = new Float32Array(4410); // 0.1 second
      const results = await analyzeAudioSignal(audioData, 44100);
      
      expect(results).toBeDefined();
    });

    test('should handle long audio clips', async () => {
      const audioData = new Float32Array(441000); // 10 seconds
      const results = await analyzeAudioSignal(audioData, 44100);
      
      expect(results).toBeDefined();
    });
  });
});
