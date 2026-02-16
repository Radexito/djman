/**
 * Audio Analysis Module (Testable)
 * 
 * This module performs real audio signal analysis using essentia.js
 * Detects BPM, musical key, and energy from the actual audio waveform
 */

import { parseFile } from 'music-metadata';
import { toCamelot } from './keyUtils.js';
import { decodeAudioFile } from './audioDecoder.js';
import { analyzeAudioSignal } from './essentiaAnalysis.js';

/**
 * Calculate energy from audio properties (0-10 scale)
 * Based on bitrate, sample rate, and format characteristics
 */
export function calculateEnergy(metadata) {
  const format = metadata.format;
  let energyScore = 5; // Default mid-energy
  
  // Bitrate contribution (higher bitrate = potentially more dynamic range)
  if (format.bitrate) {
    const bitrate = format.bitrate;
    if (bitrate >= 320000) energyScore += 2;
    else if (bitrate >= 256000) energyScore += 1.5;
    else if (bitrate >= 192000) energyScore += 1;
    else if (bitrate < 128000) energyScore -= 1;
  }
  
  // Sample rate contribution
  if (format.sampleRate && format.sampleRate >= 48000) {
    energyScore += 0.5;
  }
  
  // Lossless formats tend to preserve more dynamics
  if (format.codec === 'FLAC' || format.codec === 'ALAC') {
    energyScore += 1;
  }
  
  return Math.max(1, Math.min(10, Math.round(energyScore)));
}

/**
 * Calculate loudness estimation in LUFS
 * This is an approximation based on format properties
 * Real LUFS calculation requires FFT analysis of the actual audio signal
 */
export function calculateLoudness(metadata) {
  const format = metadata.format;
  let loudness = -12; // Default target loudness for music
  
  // Adjust based on bitrate (rough correlation)
  if (format.bitrate) {
    const bitrate = format.bitrate;
    if (bitrate >= 320000) loudness = -8; // High quality, likely louder
    else if (bitrate >= 256000) loudness = -10;
    else if (bitrate >= 192000) loudness = -11;
    else if (bitrate >= 128000) loudness = -12;
    else loudness = -14; // Low bitrate, potentially quieter
  }
  
  // Lossless formats preserve original dynamics
  if (format.codec === 'FLAC' || format.codec === 'ALAC') {
    loudness = -10; // Typically well-mastered
  }
  
  return loudness;
}

/**
 * Parse key string and convert to Camelot notation
 */
export function parseKeyToCamelot(keyString) {
  if (!keyString) return null;
  
  // Handle various key formats:
  // "C#m", "Db minor", "F# Major", "A", etc.
  // Important: Check for "maj" before "m" to avoid matching "m" in "major"
  const keyMatch = keyString.match(/([A-G][#b]?)\s*(?:(maj(?:or)?)|(m(?:inor)?))?/i);
  
  if (keyMatch) {
    const note = keyMatch[1];
    const majorMode = keyMatch[2]; // "maj" or "major"
    const minorMode = keyMatch[3]; // "m" or "minor"
    
    // If explicitly major or no mode specified, default to major
    // If explicitly minor, use minor
    const mode = minorMode ? 'minor' : 'major';
    
    return toCamelot(note, mode);
  }
  
  return null;
}

/**
 * Main audio analysis function
 * Performs real audio signal analysis to detect BPM, key, energy, and loudness
 * 
 * This function uses essentia.js to analyze the actual audio waveform:
 * - BPM detection via beat tracking algorithms
 * - Key detection via pitch analysis
 * - Energy calculation from RMS and dynamic range
 * - Loudness estimation (LUFS)
 * 
 * Falls back to metadata extraction if signal analysis fails.
 */
export async function analyzeAudio(filePath) {
  try {
    // First, try real audio signal analysis
    let analysisResults = {
      bpm: null,
      key_raw: null,
      key_camelot: null,
      energy: 5,
      loudness: -12
    };
    
    try {
      // Decode audio file to PCM data
      const { audioData, sampleRate, duration } = await decodeAudioFile(filePath);
      
      // Perform audio signal analysis with essentia.js
      const signalAnalysis = await analyzeAudioSignal(audioData, sampleRate);
      
      // Use detected BPM
      if (signalAnalysis.bpm) {
        analysisResults.bpm = signalAnalysis.bpm;
      }
      
      // Use detected key and convert to Camelot
      if (signalAnalysis.key && signalAnalysis.scale) {
        // Convert essentia key format to standard format
        // Essentia returns key as 'A', 'A#', etc. and scale as 'major' or 'minor'
        const keyNote = signalAnalysis.key;
        const scale = signalAnalysis.scale;
        
        // Format key for Camelot conversion
        if (scale === 'minor') {
          analysisResults.key_raw = keyNote + 'm';
        } else {
          analysisResults.key_raw = keyNote;
        }
        
        analysisResults.key_camelot = toCamelot(keyNote, scale);
      }
      
      // Use calculated energy and loudness
      analysisResults.energy = signalAnalysis.energy;
      analysisResults.loudness = signalAnalysis.loudness;
      
    } catch (signalError) {
      console.warn('[Analysis] Signal analysis failed, falling back to metadata:', signalError.message);
      
      // Fallback: Try to extract from metadata
      const metadata = await parseFile(filePath, { duration: true });
      const tags = metadata.common;
      const native = metadata.native || {};
      
      // Extract BPM from metadata tags
      let bpm = null;
      if (tags.bpm) {
        bpm = Math.round(tags.bpm);
      } else if (tags.comment && Array.isArray(tags.comment) && tags.comment.some(c => c.includes('BPM'))) {
        const commentWithBpm = tags.comment.find(c => c.includes('BPM'));
        const bpmMatch = commentWithBpm.match(/BPM\s*(\d+)/i) || commentWithBpm.match(/(\d+)\s*BPM/i);
        if (bpmMatch) {
          bpm = parseInt(bpmMatch[1]);
        }
      } else if (typeof tags.comment === 'string' && tags.comment.includes('BPM')) {
        const bpmMatch = tags.comment.match(/BPM\s*(\d+)/i) || tags.comment.match(/(\d+)\s*BPM/i);
        if (bpmMatch) {
          bpm = parseInt(bpmMatch[1]);
        }
      }
      
      // Check native ID3 tags
      if (!bpm) {
        for (const format in native) {
          if (!native[format]) continue;
          const commentTag = native[format].find(t => 
            t.id === 'TXXX:comment' || t.id === 'COMM' || t.id === 'comment'
          );
          if (commentTag && typeof commentTag.value === 'string') {
            const bpmMatch = commentTag.value.match(/BPM\s*(\d+)/i) || commentTag.value.match(/(\d+)\s*BPM/i);
            if (bpmMatch) {
              bpm = parseInt(bpmMatch[1]);
              break;
            }
          }
        }
      }
      
      // Extract key from metadata tags
      let keyRaw = null;
      let keyCamelot = null;
      if (tags.key) {
        keyRaw = tags.key;
        keyCamelot = parseKeyToCamelot(keyRaw);
      } else if (tags.initialKey) {
        keyRaw = tags.initialKey;
        keyCamelot = parseKeyToCamelot(keyRaw);
      }
      
      // Check native ID3 tags for key
      if (!keyRaw) {
        for (const format in native) {
          if (!native[format]) continue;
          const keyTag = native[format].find(t => 
            t.id === 'TXXX:key' || t.id === 'TKEY' || t.id === 'key'
          );
          if (keyTag && keyTag.value) {
            keyRaw = keyTag.value;
            keyCamelot = parseKeyToCamelot(keyRaw);
            break;
          }
        }
      }
      
      // Use metadata-based estimates for energy/loudness
      const energy = calculateEnergy(metadata);
      const loudness = calculateLoudness(metadata);
      
      analysisResults.bpm = bpm;
      analysisResults.key_raw = keyRaw;
      analysisResults.key_camelot = keyCamelot;
      analysisResults.energy = energy;
      analysisResults.loudness = loudness;
    }
    
    return analysisResults;
    
  } catch (err) {
    console.error('[Analysis] Error:', err);
    throw err;
  }
}
