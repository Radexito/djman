import { parentPort, workerData } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Real audio analysis using Python/Essentia
function analyzeAudio(filePath) {
  return new Promise((resolve, reject) => {
    console.log(`Worker analyzing: ${filePath}`);
    
    // Path to the Python audio analyzer script
    const scriptPath = path.join(__dirname, '../../scripts/audio_analyzer.py');
    
    // Spawn Python process
    const pythonProcess = spawn('python3', [scriptPath, filePath]);
    
    let outputData = '';
    let errorData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', errorData);
        // Fall back to placeholder values on error
        resolve({
          bpm: 128,
          key_raw: 'Unknown',
          key_camelot: '8A',
          energy: 5,
          loudness: -18,
          error: errorData || 'Analysis failed'
        });
        return;
      }
      
      try {
        const result = JSON.parse(outputData);
        
        if (!result.success) {
          console.error('Analysis error:', result.error);
          // Fall back to placeholder values
          resolve({
            bpm: 128,
            key_raw: 'Unknown',
            key_camelot: '8A',
            energy: 5,
            loudness: -18,
            error: result.error
          });
          return;
        }
        
        // Calculate energy from BPM and key strength (0-10 scale)
        // Higher BPM and stronger key detection = higher energy
        
        // Energy calculation parameters
        const MIN_BPM = 60;           // Minimum BPM for energy calculation baseline
        const BPM_ENERGY_SCALE = 20;  // BPM range per energy point (60-80=1, 80-100=2, etc.)
        const MAX_ENERGY = 10;        // Maximum energy value on 0-10 scale
        
        const bpmEnergy = Math.min((result.bpm - MIN_BPM) / BPM_ENERGY_SCALE, MAX_ENERGY);
        const keyEnergy = result.key_strength * MAX_ENERGY;
        const energy = Math.round((bpmEnergy + keyEnergy) / 2);
        
        resolve({
          bpm: result.bpm,
          key_raw: result.key_raw,
          key_camelot: result.key_camelot,
          energy: Math.max(1, Math.min(MAX_ENERGY, energy)),
          loudness: result.loudness
        });
        
      } catch (err) {
        console.error('Failed to parse Python output:', err);
        console.error('Output was:', outputData);
        // Fall back to placeholder values
        resolve({
          bpm: 128,
          key_raw: 'Unknown',
          key_camelot: '8A',
          energy: 5,
          loudness: -18,
          error: err.message
        });
      }
    });
    
    pythonProcess.on('error', (err) => {
      console.error('Failed to start Python process:', err);
      // Fall back to placeholder values
      resolve({
        bpm: 128,
        key_raw: 'Unknown',
        key_camelot: '8A',
        energy: 5,
        loudness: -18,
        error: err.message
      });
    });
  });
}

(async () => {
  try {
    const result = await analyzeAudio(workerData.filePath);
    parentPort.postMessage(result);
  } catch (err) {
    parentPort.postMessage({ error: err.message });
  }
})();
