#!/usr/bin/env node

/**
 * Setup Test Fixtures Script
 * 
 * Ensures test audio fixtures exist before running tests.
 * Only generates missing fixtures to save time.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.join(__dirname, '..', 'test', 'fixtures');
const EXPECTED_VALUES_PATH = path.join(FIXTURES_DIR, 'expected-values.json');

// Parse command line args
const args = process.argv.slice(2);
const quiet = args.includes('--quiet') || args.includes('-q');

function log(...args) {
  if (!quiet) {
    console.log(...args);
  }
}

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
 * Check which fixtures are missing
 */
function getMissingFixtures() {
  if (!fs.existsSync(EXPECTED_VALUES_PATH)) {
    return [];
  }

  const expectedValues = JSON.parse(fs.readFileSync(EXPECTED_VALUES_PATH, 'utf8'));
  const missing = [];

  for (const sample of expectedValues.samples) {
    const filePath = path.join(FIXTURES_DIR, sample.filename);
    if (!fs.existsSync(filePath)) {
      missing.push(sample.filename);
    }
  }

  return missing;
}

/**
 * Main setup function
 */
function setupFixtures() {
  const missing = getMissingFixtures();

  if (missing.length === 0) {
    log('✓ All test fixtures are present');
    return 0;
  }

  log(`⚠️  Missing ${missing.length} test fixture(s)`);

  const hasFFmpeg = checkFFmpeg();
  if (!hasFFmpeg) {
    console.error('❌ FFmpeg not found!');
    console.error('   Test fixtures cannot be generated without FFmpeg.');
    console.error('   Please install FFmpeg or run: npm run generate-fixtures');
    console.error('');
    console.error('   Installation:');
    console.error('   - Ubuntu/Debian: sudo apt-get install ffmpeg');
    console.error('   - macOS: brew install ffmpeg');
    console.error('   - Windows: choco install ffmpeg');
    return 1;
  }

  log('🎵 Generating missing fixtures...\n');

  try {
    // Run the full generator script
    execSync('node scripts/generate-test-fixtures.js', {
      cwd: path.join(__dirname, '..'),
      stdio: quiet ? 'ignore' : 'inherit'
    });
    
    log('\n✅ Test fixtures ready!');
    return 0;
  } catch (err) {
    console.error('❌ Failed to generate fixtures:', err.message);
    return 1;
  }
}

// Run setup
const exitCode = setupFixtures();
process.exit(exitCode);
