import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }));
vi.mock('../deps.js', () => ({
  getYtDlpRuntimePath: () => '/usr/bin/yt-dlp',
  getFfmpegRuntimePath: () => '/usr/bin/ffmpeg',
}));

const spawnCalls = [];
vi.mock('child_process', () => ({
  spawn: vi.fn((_cmd, args) => {
    spawnCalls.push(args);
    const proc = new EventEmitter();
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = vi.fn();

    // Respond like the real yt-dlp binary would for each call this suite makes:
    // --dump-single-json for the initial playlist fetch, --print availability
    // for the per-entry check that runs afterwards.
    queueMicrotask(() => {
      if (args.includes('--dump-single-json')) {
        proc.stdout.emit(
          'data',
          Buffer.from(
            JSON.stringify({
              title: 'Test Playlist',
              entries: [
                {
                  id: 'abc123',
                  title: 'Track 1',
                  webpage_url: 'https://youtube.com/watch?v=abc123',
                  duration: 100,
                },
              ],
            })
          )
        );
      } else if (args.includes('availability')) {
        proc.stdout.emit('data', Buffer.from('public'));
      }
      proc.emit('close', 0);
    });

    return proc;
  }),
}));

import fs from 'fs';
import { detectPlatform, fetchPlaylistInfo } from '../audio/ytDlpManager.js';

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

// Regression for #404: the per-entry availability check used player_client=web
// only, which fails format resolution for most videos (YouTube's SABR-streaming/
// PO-token enforcement on the web client) and was misread as "unavailable".
describe('checkYouTubeAvailability (via fetchPlaylistInfo)', () => {
  beforeEach(() => {
    spawnCalls.length = 0;
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
  });

  it('probes availability using the android_vr,web extractor client', async () => {
    await fetchPlaylistInfo('https://www.youtube.com/playlist?list=xyz');

    const availabilityCall = spawnCalls.find((args) => args.includes('availability'));
    expect(availabilityCall).toBeDefined();
    const clientArgIndex = availabilityCall.indexOf('--extractor-args');
    expect(availabilityCall[clientArgIndex + 1]).toBe('youtube:player_client=android_vr,web');
  });

  it('does not flag a publicly-available entry as unavailable', async () => {
    const info = await fetchPlaylistInfo('https://www.youtube.com/playlist?list=xyz');
    expect(info.entries[0].unavailable).toBe(false);
  });
});
