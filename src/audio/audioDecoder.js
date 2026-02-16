/**
 * Audio Decoder Module
 * 
 * Decodes audio files to PCM format for analysis with essentia.js
 * Uses ffmpeg to handle various audio formats (MP3, FLAC, WAV, M4A, etc.)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseFile } from 'music-metadata';

/**
 * Decode audio file to WAV format using ffmpeg
 * @param {string} inputPath - Path to input audio file
 * @returns {Promise<Buffer>} WAV file buffer
 */
export async function decodeAudioToWav(inputPath) {
  // Create temporary output file
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `audio-decode-${Date.now()}.wav`);
  
  try {
    // Use ffmpeg to convert to mono 44100Hz WAV (standard for music analysis)
    const ffmpegArgs = [
      '-i', inputPath,
      '-ar', '44100',        // Sample rate 44.1kHz
      '-ac', '1',            // Mono
      '-f', 'wav',           // WAV format
      '-y',                  // Overwrite output
      tmpFile
    ];
    
    const ffmpegCmd = 'ffmpeg ' + ffmpegArgs.map(arg => {
      // Quote arguments that contain spaces or special characters
      if (arg.includes(' ') || arg.includes('(') || arg.includes(')')) {
        return `"${arg}"`;
      }
      return arg;
    }).join(' ');
    
    execSync(ffmpegCmd, { stdio: 'ignore' });
    
    // Read the WAV file
    const wavBuffer = fs.readFileSync(tmpFile);
    
    // Clean up temp file
    fs.unlinkSync(tmpFile);
    
    return wavBuffer;
  } catch (error) {
    // Clean up temp file if it exists
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
    throw new Error(`Failed to decode audio: ${error.message}`);
  }
}

/**
 * Parse WAV buffer and extract PCM audio data as Float32Array
 * @param {Buffer} wavBuffer - WAV file buffer
 * @returns {Object} { audioData: Float32Array, sampleRate: number, duration: number }
 */
export function parseWavBuffer(wavBuffer) {
  // WAV file structure:
  // - RIFF header (12 bytes)
  // - fmt chunk (24+ bytes)
  // - data chunk (8+ bytes + audio data)
  
  // Find 'data' chunk
  let dataOffset = 12; // Skip RIFF header
  let dataSize = 0;
  let sampleRate = 44100; // Default
  let bitsPerSample = 16; // Default
  
  // Parse fmt chunk to get sample rate and bit depth
  const fmtMarker = wavBuffer.toString('ascii', 12, 16);
  if (fmtMarker === 'fmt ') {
    sampleRate = wavBuffer.readUInt32LE(24);
    bitsPerSample = wavBuffer.readUInt16LE(34);
  }
  
  // Find data chunk
  while (dataOffset < wavBuffer.length - 8) {
    const chunkId = wavBuffer.toString('ascii', dataOffset, dataOffset + 4);
    const chunkSize = wavBuffer.readUInt32LE(dataOffset + 4);
    
    if (chunkId === 'data') {
      dataOffset += 8; // Skip chunk header
      dataSize = chunkSize;
      break;
    }
    
    dataOffset += 8 + chunkSize;
  }
  
  if (dataSize === 0) {
    throw new Error('No data chunk found in WAV file');
  }
  
  // Convert PCM data to Float32Array
  const numSamples = dataSize / (bitsPerSample / 8);
  const audioData = new Float32Array(numSamples);
  
  if (bitsPerSample === 16) {
    // 16-bit PCM
    for (let i = 0; i < numSamples; i++) {
      const sample = wavBuffer.readInt16LE(dataOffset + i * 2);
      audioData[i] = sample / 32768.0; // Normalize to [-1, 1]
    }
  } else if (bitsPerSample === 24) {
    // 24-bit PCM
    for (let i = 0; i < numSamples; i++) {
      const byte1 = wavBuffer.readUInt8(dataOffset + i * 3);
      const byte2 = wavBuffer.readUInt8(dataOffset + i * 3 + 1);
      const byte3 = wavBuffer.readInt8(dataOffset + i * 3 + 2);
      const sample = (byte3 << 16) | (byte2 << 8) | byte1;
      audioData[i] = sample / 8388608.0; // Normalize to [-1, 1]
    }
  } else if (bitsPerSample === 32) {
    // 32-bit float PCM
    for (let i = 0; i < numSamples; i++) {
      audioData[i] = wavBuffer.readFloatLE(dataOffset + i * 4);
    }
  } else {
    throw new Error(`Unsupported bit depth: ${bitsPerSample}`);
  }
  
  const duration = numSamples / sampleRate;
  
  return {
    audioData,
    sampleRate,
    duration
  };
}

/**
 * Decode audio file and return audio data ready for analysis
 * @param {string} inputPath - Path to input audio file
 * @returns {Promise<Object>} { audioData: Float32Array, sampleRate: number, duration: number }
 */
export async function decodeAudioFile(inputPath) {
  const wavBuffer = await decodeAudioToWav(inputPath);
  return parseWavBuffer(wavBuffer);
}
