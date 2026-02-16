#!/usr/bin/env node

/**
 * Download Test Fixtures Script
 * 
 * This script downloads CC-licensed music samples with known BPM and key values
 * for testing the audio analysis extraction logic.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.join(__dirname, '..', 'test', 'fixtures');
const CATALOG_PATH = path.join(FIXTURES_DIR, 'samples-catalog.json');

console.log('📦 Audio Test Fixtures Download Script\n');

// Read the catalog
if (!fs.existsSync(CATALOG_PATH)) {
  console.error('❌ Catalog file not found:', CATALOG_PATH);
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));

/**
 * Download a file from URL
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
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
 * Embed metadata into audio file using ffmpeg
 */
function embedMetadata(filePath, metadata) {
  const tempPath = filePath + '.tmp.mp3';
  
  const metadataArgs = [];
  if (metadata.bpm) {
    metadataArgs.push('-metadata', `comment=BPM ${metadata.bpm}`);
    // Note: Some tools use TBPM frame, but ffmpeg doesn't support it directly
  }
  if (metadata.key_raw) {
    metadataArgs.push('-metadata', `key=${metadata.key_raw}`);
  }
  
  try {
    // Copy file with new metadata
    const cmd = [
      'ffmpeg',
      '-i', filePath,
      '-c', 'copy',
      ...metadataArgs,
      '-y',
      tempPath
    ].join(' ');
    
    execSync(cmd, { stdio: 'ignore' });
    
    // Replace original with tagged version
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (err) {
    console.warn(`⚠️  Failed to embed metadata: ${err.message}`);
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    return false;
  }
}

/**
 * Main download function
 */
async function downloadFixtures() {
  const hasFFmpeg = checkFFmpeg();
  
  if (!hasFFmpeg) {
    console.warn('⚠️  FFmpeg not found. Metadata embedding will be skipped.');
    console.warn('   Install FFmpeg to enable metadata embedding.\n');
  }
  
  console.log(`Found ${catalog.samples.length} sample(s) in catalog\n`);
  
  for (const sample of catalog.samples) {
    const destPath = path.join(FIXTURES_DIR, sample.name);
    
    console.log(`📥 Downloading: ${sample.name}`);
    console.log(`   Source: ${sample.source}`);
    console.log(`   License: ${sample.license}`);
    
    // Skip if already exists
    if (fs.existsSync(destPath)) {
      console.log(`   ✓ Already exists, skipping download\n`);
      continue;
    }
    
    try {
      // Download the file
      await downloadFile(sample.url, destPath);
      console.log(`   ✓ Downloaded successfully`);
      
      // Embed metadata if ffmpeg is available
      if (hasFFmpeg && sample.expected) {
        console.log(`   🏷️  Embedding metadata...`);
        const success = embedMetadata(destPath, sample.expected);
        if (success) {
          console.log(`   ✓ Metadata embedded`);
        }
      }
      
      // Show file size
      const stats = fs.statSync(destPath);
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB\n`);
      
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}\n`);
    }
  }
  
  console.log('✅ Download complete!\n');
  console.log('Test fixtures are ready in:', FIXTURES_DIR);
}

// Run the download
downloadFixtures().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
