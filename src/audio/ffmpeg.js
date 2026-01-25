import path from 'path';
import { spawn } from 'child_process';
import { app } from 'electron';
import fs from 'fs';

export function getFfmpegPath() {
  let ffmpegPath;

  if (app.isPackaged) {
    // When bundled
    ffmpegPath = path.join(process.resourcesPath, 'ffmpeg', getBinaryName());
  } else {
    // DEV mode (project root)
    ffmpegPath = path.join(process.cwd(), 'ffmpeg', getBinaryName());
  }

  if (!fs.existsSync(ffmpegPath)) {
    throw new Error(`FFmpeg binary not found at ${ffmpegPath}`);
  }

  return ffmpegPath;
}

function getFfprobePath() {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'ffmpeg')
    : path.join(process.cwd(), 'ffmpeg');

  const name = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
  const fullPath = path.join(base, name);

  if (!fs.existsSync(fullPath)) throw new Error(`ffprobe not found at ${fullPath}`);
  return fullPath;
}

export function ffprobe(filePath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(getFfprobePath(), [
      '-v', 'error',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ]);

    let out = '', err = '';
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => err += d);

    proc.on('close', code => {
      if (code !== 0) reject(new Error(err));
      else resolve(JSON.parse(out));
    });
  });
}

function getBinaryName() {
  if (process.platform === 'win32') return 'ffmpeg.exe';
  return 'ffmpeg';
}
