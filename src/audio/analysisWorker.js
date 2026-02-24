import { parentPort, workerData } from 'worker_threads';
import path from 'path';
import { spawn, execFileSync } from 'child_process';
import fs from 'fs';

function findPython() {
  if (process.env.PYTHON) return process.env.PYTHON;
  const venv = path.resolve(process.cwd(), '.venv', 'bin', 'python3');
  if (fs.existsSync(venv)) return venv;
  return 'python3';
}

function runPythonAnalysis(filePath) {
  return new Promise((resolve, reject) => {
    const py = findPython();
    const script = path.resolve(process.cwd(), 'python', 'analysis.py');
    // Prefer synchronous execution to avoid spawn/stdout buffering oddities in some environments
    try {
      const syncOut = execFileSync(py, [script, filePath], { encoding: 'utf8' });
      const syncErr = '';
      const candidateRaw = (syncOut && syncOut.trim()) || syncErr || '';
      if (!candidateRaw) return resolve({});
      const firstBrace = candidateRaw.indexOf('{');
      const lastBrace = candidateRaw.lastIndexOf('}');
      let candidate = candidateRaw;
      if (firstBrace >= 0 && lastBrace > firstBrace) candidate = candidateRaw.slice(firstBrace, lastBrace + 1);
      try {
        const json = JSON.parse(candidate);
        // include raw stdout for debugging
        json.py_stdout = syncOut;
        json.py_stderr = syncErr;
        return resolve(json);
      } catch (e) {
        return resolve({ py_error: `invalid json from python: ${e.message}`, py_stdout: syncOut, py_stderr: syncErr });
      }
    } catch (syncErr) {
      // Fallback to async spawn if execFileSync fails
      const p = spawn(py, [script, filePath]);
      let out = '';
      let err = '';
      p.stdout.on('data', (c) => (out += c.toString()));
      p.stderr.on('data', (c) => (err += c.toString()));
      p.on('close', (code) => {
        let candidate = out && out.trim() ? out : err;
        if (!candidate) {
          if (code !== 0) return reject(new Error(`python exited ${code}: ${err}`));
          return resolve({});
        }
        const firstBrace = candidate.indexOf('{');
        const lastBrace = candidate.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) candidate = candidate.slice(firstBrace, lastBrace + 1);
        try {
          const json = JSON.parse(candidate);
          json.py_stdout = out;
          json.py_stderr = err;
          resolve(json);
        } catch (e) {
          resolve({ py_error: `invalid json from python: ${e.message}`, py_stdout: out, py_stderr: err });
        }
      });
    }
  });
}

async function analyzeAudio(filePath) {
  let py = {};
  try {
    py = await runPythonAnalysis(filePath);
  } catch (e) {
    py = { py_error: e.message };
  }

  if (py.py_error) console.error('Python analysis error:', py.py_error);

  return {
    bpm:         py.bpm         ?? null,
    key_raw:     py.key_raw     ?? null,
    key_camelot: py.key_camelot ?? null,
    loudness:    py.lufs        ?? null,
    replay_gain: py.replay_gain ?? null,
    intro_secs:  py.intro_secs  ?? null,
    outro_secs:  py.outro_secs  ?? null,
  };
}

(async () => {
  try {
    if (!workerData || !workerData.filePath) throw new Error('No filePath provided to workerData');
    const result = await analyzeAudio(workerData.filePath);
    parentPort.postMessage({ ok: true, result });
  } catch (err) {
    parentPort.postMessage({ ok: false, error: err.message });
  }
})();
