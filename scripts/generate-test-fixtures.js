#!/usr/bin/env node

/**
 * Generate Test Audio Fixtures Script
 * 
 * This script generates small audio files with known BPM and key metadata
 * for testing the audio analysis extraction logic.
 * Uses ffmpeg to generate synthetic audio with embedded metadata.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.join(__dirname, '..', 'test', 'fixtures');

console.log('🎵 Audio Test Fixtures Generator\n');

// Test samples with known values
const testSamples = [
  {
    name: 'test-120bpm-C-major.mp3',
    bpm: 120,
    key: 'C',
    mode: 'major',
    duration: 2,
    description: '120 BPM in C major'
  },
  {
    name: 'test-128bpm-Am.mp3',
    bpm: 128,
    key: 'Am',
    mode: 'minor',
    duration: 2,
    description: '128 BPM in A minor'
  },
  {
    name: 'test-140bpm-Dm.mp3',
    bpm: 140,
    key: 'Dm',
    mode: 'minor',
    duration: 2,
    description: '140 BPM in D minor'
  },
  {
    name: 'test-100bpm-G-major.mp3',
    bpm: 100,
    key: 'G',
    mode: 'major',
    duration: 2,
    description: '100 BPM in G major'
  }
];

/**
 * Check if ffmpeg is available
 */
function checkFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate audio file with metadata
 */
function generateAudioFile(sample) {
  const destPath = path.join(FIXTURES_DIR, sample.name);
  
  console.log(`🎼 Generating: ${sample.name}`);
  console.log(`   ${sample.description}`);
  
  // Skip if already exists
  if (fs.existsSync(destPath)) {
    console.log(`   ✓ Already exists\n`);
    return true;
  }
  
  try {
    // Generate a simple sine wave audio file
    // The frequency doesn't matter - we're testing metadata extraction
    const args = [
      '-f', 'lavfi',
      '-i', `sine=frequency=440:duration=${sample.duration}`,
      '-metadata', `comment=BPM ${sample.bpm}`,
      '-metadata', `key=${sample.key}`,
      '-metadata', `title=${sample.description}`,
      '-metadata', `artist=Test Generator`,
      '-b:a', '128k',
      '-y',
      destPath
    ];
    
    execSync(`ffmpeg ${args.map(a => `"${a}"`).join(' ')}`, { stdio: 'ignore' });
    
    // Show file size
    const stats = fs.statSync(destPath);
    console.log(`   ✓ Generated (${(stats.size / 1024).toFixed(2)} KB)\n`);
    
    return true;
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}\n`);
    return false;
  }
}

/**
 * Main generation function
 */
function generateFixtures() {
  const hasFFmpeg = checkFFmpeg();
  
  if (!hasFFmpeg) {
    console.error('❌ FFmpeg not found!');
    console.error('   Please install FFmpeg to generate test fixtures.');
    console.error('   See readme.md for installation instructions.\n');
    process.exit(1);
  }
  
  // Ensure fixtures directory exists
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }
  
  console.log(`Generating ${testSamples.length} test sample(s)\n`);
  
  let successCount = 0;
  for (const sample of testSamples) {
    if (generateAudioFile(sample)) {
      successCount++;
    }
  }
  
  console.log(`✅ Generated ${successCount}/${testSamples.length} fixtures!\n`);
  console.log('Test fixtures are ready in:', FIXTURES_DIR);
  
  // Save the expected values catalog
  const catalogPath = path.join(FIXTURES_DIR, 'expected-values.json');
  const catalog = {
    description: 'Expected values for test audio fixtures',
    samples: testSamples.map(s => ({
      filename: s.name,
      expected: {
        bpm: s.bpm,
        key_raw: s.key,
        key_camelot: getCamelotKey(s.key, s.mode)
      }
    }))
  };
  
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
  console.log('Expected values saved to:', catalogPath);
}

/**
 * Helper to get Camelot key notation
 * Uses the same mapping as keyUtils.js for consistency
 */
function getCamelotKey(key, mode) {
  // Map of note to Camelot number (for major keys ending in B)
  const camelotMap = {
    'C': '8',
    'G': '9',
    'D': '10',
    'A': '11',
    'E': '12',
    'B': '1',
    'F#': '2', 'Gb': '2',
    'Db': '3', 'C#': '3',
    'Ab': '4', 'G#': '4',
    'Eb': '5', 'D#': '5',
    'Bb': '6', 'A#': '6',
    'F': '7'
  };
  
  // For keys like "Am" or "Dm", extract the note
  let note = key;
  let keyMode = mode;
  
  if (key.endsWith('m')) {
    note = key.slice(0, -1);
    keyMode = 'minor';
  }
  
  const camelotNumber = camelotMap[note];
  if (!camelotNumber) return null;
  
  // Major keys end with B, minor keys end with A
  return `${camelotNumber}${keyMode === 'minor' ? 'A' : 'B'}`;
}

// Run the generator
generateFixtures();
