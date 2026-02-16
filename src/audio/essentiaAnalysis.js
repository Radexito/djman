/**
 * Essentia Audio Analysis Module
 * 
 * Real audio signal analysis using essentia.js
 * Detects BPM, musical key, and energy from audio waveform
 */

import { Essentia, EssentiaWASM } from 'essentia.js';

// Initialize essentia.js
let essentiaInstance = null;

/**
 * Initialize Essentia WASM module
 * @returns {Essentia}
 */
function getEssentia() {
  if (!essentiaInstance) {
    essentiaInstance = new Essentia(EssentiaWASM);
  }
  return essentiaInstance;
}

/**
 * Detect BPM from audio signal using beat tracking
 * @param {Float32Array} audioData - Audio samples (mono, normalized -1 to 1)
 * @param {number} sampleRate - Sample rate (typically 44100)
 * @returns {number|null} Detected BPM or null if detection fails
 */
export async function detectBPM(audioData, sampleRate = 44100) {
  try {
    const essentia = getEssentia();
    
    // Convert Float32Array to VectorFloat
    const vectorSignal = essentia.arrayToVector(audioData);
    
    // Use RhythmExtractor2013 for robust BPM detection
    const result = essentia.RhythmExtractor2013(vectorSignal, sampleRate);
    
    // Clean up
    vectorSignal.delete();
    
    // Extract BPM from result
    const bpm = result.bpm;
    
    // Validate BPM is in reasonable range (40-200 BPM typical for music)
    if (bpm && bpm >= 40 && bpm <= 200) {
      return Math.round(bpm);
    }
    
    return null;
  } catch (error) {
    console.error('BPM detection failed:', error.message);
    return null;
  }
}

/**
 * Detect musical key from audio signal
 * @param {Float32Array} audioData - Audio samples (mono, normalized -1 to 1)
 * @param {number} sampleRate - Sample rate (typically 44100)
 * @returns {Object|null} { key: string, scale: string } or null if detection fails
 */
export async function detectKey(audioData, sampleRate = 44100) {
  try {
    const essentia = getEssentia();
    
    // Convert Float32Array to VectorFloat
    const vectorSignal = essentia.arrayToVector(audioData);
    
    // Use KeyExtractor algorithm for key detection
    const result = essentia.KeyExtractor(vectorSignal, sampleRate);
    
    // Clean up
    vectorSignal.delete();
    
    // Extract key and scale
    const key = result.key;
    const scale = result.scale;
    const strength = result.strength;
    
    // Only return if confidence is reasonable
    if (key && scale && strength > 0.3) {
      return {
        key: key,
        scale: scale,
        strength: strength
      };
    }
    
    return null;
  } catch (error) {
    console.error('Key detection failed:', error.message);
    return null;
  }
}

/**
 * Calculate energy from audio signal
 * Uses RMS (Root Mean Square) and dynamic range
 * @param {Float32Array} audioData - Audio samples
 * @returns {number} Energy value from 1-10
 */
export function calculateAudioEnergy(audioData) {
  try {
    // Calculate RMS (Root Mean Square)
    let sumSquares = 0;
    for (let i = 0; i < audioData.length; i++) {
      sumSquares += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sumSquares / audioData.length);
    
    // Calculate dynamic range (difference between max and min)
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < audioData.length; i++) {
      if (audioData[i] < min) min = audioData[i];
      if (audioData[i] > max) max = audioData[i];
    }
    const dynamicRange = max - min;
    
    // Combine RMS and dynamic range to estimate energy
    // Higher RMS and wider dynamic range = more energy
    const energyScore = (rms * 5) + (dynamicRange * 2.5);
    
    // Scale to 1-10 range
    const normalizedEnergy = Math.max(1, Math.min(10, Math.round(energyScore * 5)));
    
    return normalizedEnergy;
  } catch (error) {
    console.error('Energy calculation failed:', error);
    return 5; // Default mid-energy
  }
}

/**
 * Calculate loudness from audio signal (LUFS estimation)
 * @param {Float32Array} audioData - Audio samples
 * @param {number} sampleRate - Sample rate
 * @returns {number} Loudness in LUFS
 */
export function calculateAudioLoudness(audioData, sampleRate = 44100) {
  try {
    // Fallback: estimate from RMS
    let sumSquares = 0;
    for (let i = 0; i < audioData.length; i++) {
      sumSquares += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sumSquares / audioData.length);
    const lufsEstimate = 20 * Math.log10(rms + 0.0001) - 23; // Convert RMS to LUFS estimate (add small value to avoid log(0))
    return Math.round(lufsEstimate * 10) / 10;
  } catch (error) {
    console.error('Loudness calculation failed:', error.message);
    return -12; // Default
  }
}

/**
 * Perform complete audio analysis
 * @param {Float32Array} audioData - Audio samples
 * @param {number} sampleRate - Sample rate
 * @returns {Promise<Object>} Analysis results { bpm, key, scale, energy, loudness }
 */
export async function analyzeAudioSignal(audioData, sampleRate = 44100) {
  const results = {
    bpm: null,
    key: null,
    scale: null,
    energy: 5,
    loudness: -12
  };
  
  try {
    // Detect BPM
    results.bpm = await detectBPM(audioData, sampleRate);
    
    // Detect key
    const keyResult = await detectKey(audioData, sampleRate);
    if (keyResult) {
      results.key = keyResult.key;
      results.scale = keyResult.scale;
    }
    
    // Calculate energy
    results.energy = calculateAudioEnergy(audioData);
    
    // Calculate loudness
    results.loudness = calculateAudioLoudness(audioData, sampleRate);
    
  } catch (error) {
    console.error('Audio analysis failed:', error.message);
  }
  
  return results;
}
