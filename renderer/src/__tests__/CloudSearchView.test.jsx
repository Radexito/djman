import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CloudSearchView from '../CloudSearchView.jsx';

class MockAudio {
  constructor() {
    this.src = '';
    this.paused = true;
    this.listeners = {};
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
    render(<CloudSearchView onGoToLibrary={vi.fn()} onGoToTidalSetup={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Search YouTube/), {
      target: { value: 'preview' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(screen.getByText('Preview Me')).toBeInTheDocument());
  }

  it('keeps the external preview button', async () => {
    await renderAndSearch();

    fireEvent.click(screen.getByLabelText('Preview Preview Me externally'));
    expect(window.api.openExternal).toHaveBeenCalledWith('https://youtube.com/watch?v=abc123');
  });

  it('starts inline preview through cloudSearchPreview', async () => {
    await renderAndSearch();

    fireEvent.click(screen.getByLabelText('Play inline preview for Preview Me'));

    await waitFor(() => {
      expect(window.api.cloudSearchPreview).toHaveBeenCalledWith({
        source: 'youtube',
        type: 'track',
        url: 'https://youtube.com/watch?v=abc123',
      });
    });
  });
});
