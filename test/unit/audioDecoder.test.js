/**
 * Unit tests for audioDecoder.js
 * Tests audio file decoding to PCM format for analysis
 */

import { jest } from '@jest/globals';
import { decodeAudioToWav, parseWavBuffer, decodeAudioFile } from '../../src/audio/audioDecoder.js';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Mock external dependencies
jest.mock('child_process');
jest.mock('fs');
jest.mock('os');
jest.mock('music-metadata');

describe('Audio Decoder', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseWavBuffer', () => {
    
    test('should parse 16-bit WAV buffer correctly', () => {
      // Create a minimal valid WAV buffer
      const buffer = Buffer.alloc(100);
      
      // RIFF header
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(92, 4); // File size - 8
      buffer.write('WAVE', 8);
      
      // fmt chunk
      buffer.write('fmt ', 12);
      buffer.writeUInt32LE(16, 16); // fmt chunk size
      buffer.writeUInt16LE(1, 20); // Audio format (PCM)
      buffer.writeUInt16LE(1, 22); // Num channels (mono)
      buffer.writeUInt32LE(44100, 24); // Sample rate
      buffer.writeUInt32LE(88200, 28); // Byte rate
      buffer.writeUInt16LE(2, 32); // Block align
      buffer.writeUInt16LE(16, 34); // Bits per sample
      
      // data chunk
      buffer.write('data', 36);
      buffer.writeUInt32LE(44, 40); // Data size (22 samples * 2 bytes)
      
      // Sample data (22 samples)
      for (let i = 0; i < 22; i++) {
        buffer.writeInt16LE(i * 1000, 44 + i * 2);
      }
      
      const result = parseWavBuffer(buffer);
      
      expect(result.sampleRate).toBe(44100);
      expect(result.audioData).toBeInstanceOf(Float32Array);
      expect(result.audioData.length).toBe(22);
      expect(result.duration).toBeCloseTo(22 / 44100, 5);
      
      // First sample should be normalized
      expect(result.audioData[0]).toBeCloseTo(0, 2);
    });

    test('should handle different sample rates', () => {
      const buffer = Buffer.alloc(100);
      
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(92, 4);
      buffer.write('WAVE', 8);
      buffer.write('fmt ', 12);
      buffer.writeUInt32LE(16, 16);
      buffer.writeUInt16LE(1, 20);
      buffer.writeUInt16LE(1, 22);
      buffer.writeUInt32LE(48000, 24); // 48kHz
      buffer.writeUInt32LE(96000, 28);
      buffer.writeUInt16LE(2, 32);
      buffer.writeUInt16LE(16, 34);
      buffer.write('data', 36);
      buffer.writeUInt32LE(20, 40);
      
      const result = parseWavBuffer(buffer);
      expect(result.sampleRate).toBe(48000);
    });

    test('should throw error for missing data chunk', () => {
      const buffer = Buffer.alloc(44);
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(36, 4);
      buffer.write('WAVE', 8);
      buffer.write('fmt ', 12);
      buffer.writeUInt32LE(16, 16);
      
      expect(() => parseWavBuffer(buffer)).toThrow('No data chunk found');
    });

    test('should normalize 16-bit samples to [-1, 1] range', () => {
      const buffer = Buffer.alloc(100);
      
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(92, 4);
      buffer.write('WAVE', 8);
      buffer.write('fmt ', 12);
      buffer.writeUInt32LE(16, 16);
      buffer.writeUInt16LE(1, 20);
      buffer.writeUInt16LE(1, 22);
      buffer.writeUInt32LE(44100, 24);
      buffer.writeUInt32LE(88200, 28);
      buffer.writeUInt16LE(2, 32);
      buffer.writeUInt16LE(16, 34);
      buffer.write('data', 36);
      buffer.writeUInt32LE(4, 40);
      
      // Max positive value
      buffer.writeInt16LE(32767, 44);
      // Max negative value
      buffer.writeInt16LE(-32768, 46);
      
      const result = parseWavBuffer(buffer);
      
      expect(result.audioData[0]).toBeCloseTo(1.0, 2);
      expect(result.audioData[1]).toBeCloseTo(-1.0, 2);
    });
  });

  describe('decodeAudioToWav', () => {
    
    beforeEach(() => {
      os.tmpdir.mockReturnValue('/tmp');
      path.join = jest.fn((...args) => args.join('/'));
    });

    test('should decode audio file using ffmpeg', async () => {
      const mockWavBuffer = Buffer.from('mock wav data');
      
      fs.readFileSync.mockReturnValue(mockWavBuffer);
      fs.unlinkSync.mockImplementation(() => {});
      fs.existsSync.mockReturnValue(false);
      execSync.mockImplementation(() => {});
      
      const result = await decodeAudioToWav('/path/to/audio.mp3');
      
      expect(execSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(result).toBe(mockWavBuffer);
    });

    test('should handle files with spaces in path', async () => {
      const mockWavBuffer = Buffer.from('mock wav data');
      
      fs.readFileSync.mockReturnValue(mockWavBuffer);
      fs.unlinkSync.mockImplementation(() => {});
      fs.existsSync.mockReturnValue(false);
      execSync.mockImplementation(() => {});
      
      await decodeAudioToWav('/path/to/my audio file.mp3');
      
      const execCall = execSync.mock.calls[0][0];
      expect(execCall).toContain('"my audio file.mp3"');
    });

    test('should clean up temp file on error', async () => {
      fs.existsSync.mockReturnValue(true);
      execSync.mockImplementation(() => {
        throw new Error('ffmpeg failed');
      });
      
      await expect(decodeAudioToWav('/path/to/audio.mp3'))
        .rejects.toThrow('Failed to decode audio');
      
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    test('should convert to mono 44.1kHz', async () => {
      const mockWavBuffer = Buffer.from('mock wav data');
      
      fs.readFileSync.mockReturnValue(mockWavBuffer);
      fs.unlinkSync.mockImplementation(() => {});
      fs.existsSync.mockReturnValue(false);
      execSync.mockImplementation(() => {});
      
      await decodeAudioToWav('/path/to/audio.mp3');
      
      const execCall = execSync.mock.calls[0][0];
      expect(execCall).toContain('-ar 44100');
      expect(execCall).toContain('-ac 1');
    });
  });

  describe('decodeAudioFile', () => {
    
    test('should decode and parse audio file in one step', async () => {
      const mockWavBuffer = Buffer.alloc(100);
      
      // Setup valid WAV buffer
      mockWavBuffer.write('RIFF', 0);
      mockWavBuffer.writeUInt32LE(92, 4);
      mockWavBuffer.write('WAVE', 8);
      mockWavBuffer.write('fmt ', 12);
      mockWavBuffer.writeUInt32LE(16, 16);
      mockWavBuffer.writeUInt16LE(1, 20);
      mockWavBuffer.writeUInt16LE(1, 22);
      mockWavBuffer.writeUInt32LE(44100, 24);
      mockWavBuffer.writeUInt32LE(88200, 28);
      mockWavBuffer.writeUInt16LE(2, 32);
      mockWavBuffer.writeUInt16LE(16, 34);
      mockWavBuffer.write('data', 36);
      mockWavBuffer.writeUInt32LE(10, 40);
      
      os.tmpdir.mockReturnValue('/tmp');
      fs.readFileSync.mockReturnValue(mockWavBuffer);
      fs.unlinkSync.mockImplementation(() => {});
      fs.existsSync.mockReturnValue(false);
      execSync.mockImplementation(() => {});
      
      const result = await decodeAudioFile('/path/to/audio.mp3');
      
      expect(result).toHaveProperty('audioData');
      expect(result).toHaveProperty('sampleRate');
      expect(result).toHaveProperty('duration');
      expect(result.audioData).toBeInstanceOf(Float32Array);
    });

    test('should propagate decoding errors', async () => {
      execSync.mockImplementation(() => {
        throw new Error('ffmpeg not found');
      });
      fs.existsSync.mockReturnValue(false);
      
      await expect(decodeAudioFile('/path/to/audio.mp3'))
        .rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    
    test('should handle unsupported bit depths', () => {
      const buffer = Buffer.alloc(100);
      
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(92, 4);
      buffer.write('WAVE', 8);
      buffer.write('fmt ', 12);
      buffer.writeUInt32LE(16, 16);
      buffer.writeUInt16LE(1, 20);
      buffer.writeUInt16LE(1, 22);
      buffer.writeUInt32LE(44100, 24);
      buffer.writeUInt32LE(88200, 28);
      buffer.writeUInt16LE(2, 32);
      buffer.writeUInt16LE(8, 34); // 8-bit (unsupported)
      buffer.write('data', 36);
      buffer.writeUInt32LE(10, 40);
      
      expect(() => parseWavBuffer(buffer)).toThrow('Unsupported bit depth');
    });

    test('should handle file read errors', async () => {
      execSync.mockImplementation(() => {});
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      fs.existsSync.mockReturnValue(true);
      fs.unlinkSync.mockImplementation(() => {});
      os.tmpdir.mockReturnValue('/tmp');
      
      await expect(decodeAudioToWav('/invalid/path.mp3'))
        .rejects.toThrow('Failed to decode audio');
    });
  });
});
