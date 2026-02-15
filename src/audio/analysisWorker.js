import { parentPort, workerData } from 'worker_threads';
import { parseFile } from 'music-metadata';
import { toCamelot } from './keyUtils.js';

/**
 * Calculate energy from audio properties (0-10 scale)
 * Based on bitrate, sample rate, and format characteristics
 */
function calculateEnergy(metadata) {
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
function calculateLoudness(metadata) {
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
function parseKeyToCamelot(keyString) {
  if (!keyString) return null;
  
  // Handle various key formats:
  // "C#m", "Db minor", "F# Major", "A", etc.
  const keyMatch = keyString.match(/([A-G][#b]?)\s*(m|min|minor|maj|major)?/i);
  
  if (keyMatch) {
    const note = keyMatch[1];
    const modeStr = keyMatch[2] || '';
    const mode = modeStr.toLowerCase().startsWith('m') && modeStr.toLowerCase() !== 'maj' ? 'minor' : 'major';
    
    return toCamelot(note, mode);
  }
  
  return null;
}

/**
 * Main audio analysis function
 * Extracts BPM, key, energy, and loudness from audio file
 */
async function analyzeAudio(filePath) {
  console.log(`[Worker] Analyzing: ${filePath}`);
  
  try {
    // Parse metadata using music-metadata library
    const metadata = await parseFile(filePath, { duration: true });
    const tags = metadata.common;
    
    // Extract BPM from tags (most DJ software embeds this)
    let bpm = null;
    if (tags.bpm) {
      bpm = Math.round(tags.bpm);
      console.log(`[Worker] BPM found in tags: ${bpm}`);
    } else if (tags.comment && tags.comment.some(c => c.includes('BPM'))) {
      // Some software stores BPM in comments
      const commentWithBpm = tags.comment.find(c => c.includes('BPM'));
      const bpmMatch = commentWithBpm.match(/(\d+)\s*BPM/i);
      if (bpmMatch) {
        bpm = parseInt(bpmMatch[1]);
        console.log(`[Worker] BPM extracted from comment: ${bpm}`);
      }
    }
    
    // Extract key from tags
    let keyRaw = null;
    let keyCamelot = null;
    if (tags.key) {
      keyRaw = tags.key;
      keyCamelot = parseKeyToCamelot(keyRaw);
      console.log(`[Worker] Key found: ${keyRaw} → ${keyCamelot}`);
    } else if (tags.initialKey) {
      // ID3v2.3 TKEY frame
      keyRaw = tags.initialKey;
      keyCamelot = parseKeyToCamelot(keyRaw);
      console.log(`[Worker] Initial key found: ${keyRaw} → ${keyCamelot}`);
    }
    
    // Calculate energy and loudness from format properties
    const energy = calculateEnergy(metadata);
    const loudness = calculateLoudness(metadata);
    
    console.log(`[Worker] Analysis complete: BPM=${bpm}, Key=${keyRaw}, Energy=${energy}, Loudness=${loudness}`);
    
    return {
      bpm: bpm,
      key_raw: keyRaw,
      key_camelot: keyCamelot,
      energy: energy,
      loudness: loudness,
    };
    
  } catch (err) {
    console.error('[Worker] Analysis error:', err);
    throw err;
  }
}

// Worker entry point
(async () => {
  try {
    const result = await analyzeAudio(workerData.filePath);
    parentPort.postMessage(result);
  } catch (err) {
    parentPort.postMessage({ error: err.message });
  }
})();
