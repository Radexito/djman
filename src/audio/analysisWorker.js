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
        const bpmEnergy = Math.min((result.bpm - 60) / 20, 10);
        const keyEnergy = result.key_strength * 10;
        const energy = Math.round((bpmEnergy + keyEnergy) / 2);
        
        resolve({
          bpm: result.bpm,
          key_raw: result.key_raw,
          key_camelot: result.key_camelot,
          energy: Math.max(1, Math.min(10, energy)),
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
