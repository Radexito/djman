import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CloudSearchView from '../CloudSearchView.jsx';

class MockAudio {
  constructor() {
    MockAudio.instances.push(this);
    this._src = '';
    this.currentSrc = '';
    this.paused = true;
    this.listeners = {};
  }
  set src(value) {
    this._src = value;
    this.currentSrc = value;
    if (!value && MockAudio.emitErrorOnEmptySrc) {
      this.listeners.error?.();
    }
  }
  get src() {
    return this._src;
  }
  addEventListener(event, cb) {
    this.listeners[event] = cb;
  }
  removeEventListener(event) {
    delete this.listeners[event];
  }
  play = vi.fn(async () => {
    this.paused = false;
    this.listeners.play?.();
  });
  pause = vi.fn(() => {
    this.paused = true;
    this.listeners.pause?.();
  });
}

describe('CloudSearchView previews', () => {
  const originalAudio = globalThis.Audio;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.Audio = MockAudio;
    MockAudio.instances = [];
    MockAudio.emitErrorOnEmptySrc = false;
    window.api.cloudSearch.mockResolvedValue({
      ok: true,
      results: [
        {
          source: 'youtube',
          type: 'track',
          id: 'abc123',
          title: 'Preview Me',
          artist: '',
          album: '',
          durationSec: 90,
          url: 'https://youtube.com/watch?v=abc123',
        },
      ],
    });
  });

  afterEach(() => {
    globalThis.Audio = originalAudio;
  });

  async function renderAndSearch() {
    const renderResult = render(
      <CloudSearchView onGoToLibrary={vi.fn()} onGoToTidalSetup={vi.fn()} isActive />
    );
    fireEvent.change(screen.getByPlaceholderText(/Search YouTube/), {
      target: { value: 'preview' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(screen.getByText('Preview Me')).toBeInTheDocument());
    return renderResult;
  }

  async function startPreview() {
    await renderAndSearch();
    fireEvent.click(screen.getByLabelText('Play inline preview for Preview Me'));
    await waitFor(() => {
      expect(window.api.cloudSearchPreview).toHaveBeenCalledWith({
        source: 'youtube',
        type: 'track',
        url: 'https://youtube.com/watch?v=abc123',
      });
    });
    await waitFor(() => expect(MockAudio.instances[0].play).toHaveBeenCalled());
  }

  it('keeps the external preview button', async () => {
    await renderAndSearch();

    fireEvent.click(screen.getByLabelText('Preview Preview Me externally'));
    expect(window.api.openExternal).toHaveBeenCalledWith('https://youtube.com/watch?v=abc123');
  });

  it('starts inline preview through cloudSearchPreview', async () => {
    await startPreview();
  });

  it('does not show a preview error when search reset clears an empty audio source', async () => {
    MockAudio.emitErrorOnEmptySrc = true;

    await renderAndSearch();

    expect(screen.queryByText('Inline preview playback failed')).toBeNull();
    expect(screen.getByText('Preview Me')).toBeInTheDocument();
  });

  it('pauses inline preview when switching cloud-search source', async () => {
    await startPreview();

    fireEvent.click(screen.getByRole('button', { name: /TIDAL/i }));

    expect(MockAudio.instances[0].pause).toHaveBeenCalled();
  });

  it('pauses inline preview when cloud search becomes inactive', async () => {
    const { rerender } = await renderAndSearch();

    fireEvent.click(screen.getByLabelText('Play inline preview for Preview Me'));
    await waitFor(() => expect(MockAudio.instances[0].play).toHaveBeenCalled());

    rerender(
      <CloudSearchView onGoToLibrary={vi.fn()} onGoToTidalSetup={vi.fn()} isActive={false} />
    );

    expect(MockAudio.instances[0].pause).toHaveBeenCalled();
  });
});
