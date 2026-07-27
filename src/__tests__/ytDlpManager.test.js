import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }));
vi.mock('../deps.js', () => ({
  getYtDlpRuntimePath: () => '/usr/bin/yt-dlp',
  getFfmpegRuntimePath: () => '/usr/bin/ffmpeg',
}));

vi.mock('fs', () => ({
  default: { existsSync: vi.fn().mockReturnValue(true) },
  existsSync: vi.fn().mockReturnValue(true),
}));

// child_process.spawn mock — captures the args it was called with and lets
// each test control stdout/exit behavior via a fake EventEmitter-based process.
let lastSpawnArgs = null;
let fakeProc;
vi.mock('child_process', () => ({
  spawn: vi.fn((bin, args) => {
    lastSpawnArgs = args;
    return fakeProc;
  }),
}));

function makeFakeProc() {
  const proc = new EventEmitter();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  return proc;
}

import { detectPlatform, searchYouTube } from '../audio/ytDlpManager.js';

describe('detectPlatform', () => {
  it('returns youtube for youtube.com URLs', () => {
    expect(detectPlatform('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
    expect(detectPlatform('https://youtube.com/playlist?list=abc123')).toBe('youtube');
  });

  it('returns youtube for youtu.be URLs', () => {
    expect(detectPlatform('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
  });

  it('returns soundcloud for soundcloud.com URLs', () => {
    expect(detectPlatform('https://soundcloud.com/artist/track')).toBe('soundcloud');
  });

  it('returns bandcamp for bandcamp.com URLs', () => {
    expect(detectPlatform('https://someartist.bandcamp.com/album/release')).toBe('bandcamp');
  });

  it('returns other for generic/unrecognised URLs', () => {
    expect(detectPlatform('https://vimeo.com/123456789')).toBe('other');
    expect(detectPlatform('https://example.com/audio.mp3')).toBe('other');
  });

  it('returns other for invalid / non-URL strings', () => {
    expect(detectPlatform('not-a-url')).toBe('other');
    expect(detectPlatform('')).toBe('other');
    expect(detectPlatform('just some text')).toBe('other');
  });
});

// ── Cloud Search (#376) — YouTube side ────────────────────────────────────────

describe('searchYouTube', () => {
  it('spawns yt-dlp with a ytsearchN: pseudo-URL and maps results to the shared result shape', async () => {
    fakeProc = makeFakeProc();
    const resultPromise = searchYouTube('daft punk', { limit: 5 });

    fakeProc.stdout.emit(
      'data',
      JSON.stringify({
        entries: [
          {
            id: 'abc123',
            title: 'Daft Punk - One More Time',
            url: 'https://youtu.be/abc123',
            duration: 320,
          },
          {
            id: 'def456',
            title: 'Daft Punk - Harder Better Faster Stronger',
            url: 'https://youtu.be/def456',
            duration: 224,
          },
        ],
      })
    );
    fakeProc.emit('close', 0);

    const results = await resultPromise;

    expect(lastSpawnArgs).toContain('ytsearch5:daft punk');
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      source: 'youtube',
      type: 'track',
      id: 'abc123',
      title: 'Daft Punk - One More Time',
      durationSec: 320,
      url: 'https://youtu.be/abc123',
    });
  });

  it('filters out unavailable entries', async () => {
    fakeProc = makeFakeProc();
    const resultPromise = searchYouTube('some query');

    fakeProc.stdout.emit(
      'data',
      JSON.stringify({
        entries: [
          { id: '1', title: 'Available Track', url: 'https://youtu.be/1', duration: 100 },
          { id: '2', title: '[Private video]', url: 'https://youtu.be/2', duration: 100 },
        ],
      })
    );
    fakeProc.emit('close', 0);

    const results = await resultPromise;
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('1');
  });

  it('defaults to a limit of 20 results when none is specified', async () => {
    fakeProc = makeFakeProc();
    const resultPromise = searchYouTube('some query');
    fakeProc.stdout.emit('data', JSON.stringify({ entries: [] }));
    fakeProc.emit('close', 0);
    await resultPromise;

    expect(lastSpawnArgs).toContain('ytsearch20:some query');
  });
});
