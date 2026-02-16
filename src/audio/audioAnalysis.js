/**
 * Audio Analysis Module (Testable)
 * 
 * This module extracts the core analysis logic from analysisWorker.js
 * to make it testable without Worker threads.
 * 
 * NOTE: BPM extraction is currently metadata-based (reads from ID3 tags).
 * Real-time BPM detection from audio signal would require additional
 * DSP/ML libraries like Essentia.js or aubio.
 */

import { parseFile } from 'music-metadata';
import { toCamelot } from './keyUtils.js';

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
 * Extracts BPM, key, energy, and loudness from audio file
 * 
 * NOTE: BPM is extracted from file metadata (ID3 tags), not from audio signal analysis.
 * This is the standard approach used by DJ software like Serato, Rekordbox, and Traktor.
 * For files without embedded BPM metadata, this function returns null.
 * 
 * Real-time BPM detection from audio signal would require:
 * - FFT analysis of the audio waveform
 * - Beat detection algorithms
 * - ML-based tempo estimation
 * - Libraries like Essentia.js, aubio, or BPM detection APIs
 */
export async function analyzeAudio(filePath) {
  try {
    // Parse metadata using music-metadata library
    const metadata = await parseFile(filePath, { duration: true });
    const tags = metadata.common;
    const native = metadata.native || {};
    
    // Extract BPM from tags (most DJ software embeds this)
    // Supports multiple tag formats: TBPM, comment field, etc.
    let bpm = null;
    if (tags.bpm) {
      bpm = Math.round(tags.bpm);
    } else if (tags.comment && Array.isArray(tags.comment) && tags.comment.some(c => c.includes('BPM'))) {
      // Some software stores BPM in comments
      const commentWithBpm = tags.comment.find(c => c.includes('BPM'));
      const bpmMatch = commentWithBpm.match(/BPM\s*(\d+)/i) || commentWithBpm.match(/(\d+)\s*BPM/i);
      if (bpmMatch) {
        bpm = parseInt(bpmMatch[1]);
      }
    } else if (typeof tags.comment === 'string' && tags.comment.includes('BPM')) {
      // Handle single comment string
      const bpmMatch = tags.comment.match(/BPM\s*(\d+)/i) || tags.comment.match(/(\d+)\s*BPM/i);
      if (bpmMatch) {
        bpm = parseInt(bpmMatch[1]);
      }
    }
    
    // Also check native ID3 tags for comment field
    if (!bpm) {
      // Check all native tag formats
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
    
    // Extract key from tags
    let keyRaw = null;
    let keyCamelot = null;
    if (tags.key) {
      keyRaw = tags.key;
      keyCamelot = parseKeyToCamelot(keyRaw);
    } else if (tags.initialKey) {
      // ID3v2.3 TKEY frame
      keyRaw = tags.initialKey;
      keyCamelot = parseKeyToCamelot(keyRaw);
    }
    
    // Also check native ID3 tags for key field
    if (!keyRaw) {
      // Check all native tag formats
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
    
    // Calculate energy and loudness from format properties
    const energy = calculateEnergy(metadata);
    const loudness = calculateLoudness(metadata);
    
    return {
      bpm: bpm,
      key_raw: keyRaw,
      key_camelot: keyCamelot,
      energy: energy,
      loudness: loudness,
    };
    
  } catch (err) {
    console.error('[Analysis] Error:', err);
    throw err;
  }
}
