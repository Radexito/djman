import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TopBar from '../TopBar.jsx';

const player = {
  isPlaying: false,
  shuffle: false,
  repeat: 'none',
  togglePlay: vi.fn(),
  next: vi.fn(),
  prev: vi.fn(),
  toggleShuffle: vi.fn(),
  cycleRepeat: vi.fn(),
};

vi.mock('../PlayerContext.jsx', () => ({
  usePlayer: () => player,
}));

describe('TopBar logo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onLogoClick when the logo is clicked', () => {
    const onLogoClick = vi.fn();
    render(<TopBar onOpenSettings={() => {}} onLogoClick={onLogoClick} />);

    fireEvent.click(screen.getByAltText('DJ Manager'));

    expect(onLogoClick).toHaveBeenCalledTimes(1);
  });

  it('calls onLogoClick on Enter/Space when the logo is focused', () => {
    const onLogoClick = vi.fn();
    render(<TopBar onOpenSettings={() => {}} onLogoClick={onLogoClick} />);

    const logo = screen.getByRole('button', { name: 'DJ Manager' });
    fireEvent.keyDown(logo, { key: 'Enter' });
    fireEvent.keyDown(logo, { key: ' ' });

    expect(onLogoClick).toHaveBeenCalledTimes(2);
  });
});

describe('TopBar transport controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders playback controls sourced from PlayerContext and wires up handlers', () => {
    render(<TopBar onOpenSettings={() => {}} onLogoClick={() => {}} />);

    fireEvent.click(screen.getByTitle('Shuffle'));
    expect(player.toggleShuffle).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTitle('Previous'));
    expect(player.prev).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTitle('Play / Pause'));
    expect(player.togglePlay).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTitle('Next'));
    expect(player.next).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTitle('Repeat: none'));
    expect(player.cycleRepeat).toHaveBeenCalledTimes(1);
  });

  it('shows the play icon when paused and the pause icon when playing', () => {
    player.isPlaying = true;
    render(<TopBar onOpenSettings={() => {}} onLogoClick={() => {}} />);
    expect(screen.getByTitle('Play / Pause')).toHaveTextContent('⏸');
    player.isPlaying = false;
  });

  it('does not render a search bar', () => {
    render(<TopBar onOpenSettings={() => {}} onLogoClick={() => {}} />);
    expect(screen.queryByPlaceholderText(/Search…/)).not.toBeInTheDocument();
  });
});
