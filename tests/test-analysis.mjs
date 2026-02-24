import { Worker } from 'worker_threads';

if (process.argv.length < 3) {
  console.error('Usage: node tests/test-analysis.mjs <audio-file>');
  process.exit(2);
}

const filePath = process.argv[2];

const worker = new Worker(new URL('../src/audio/analysisWorker.js', import.meta.url), {
  workerData: { filePath }
});

worker.on('message', (msg) => {
  console.log(JSON.stringify(msg, null, 2));
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
  process.exit(1);
});

worker.on('exit', (code) => {
  if (code !== 0) console.error('Worker exited with code', code);
});
