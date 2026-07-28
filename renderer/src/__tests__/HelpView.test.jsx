import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HelpView from '../HelpView.jsx';

describe('HelpView', () => {
  it('renders the Help title', () => {
    render(<HelpView />);
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('renders each core section title', () => {
    render(<HelpView />);
    expect(screen.getByText('Library management')).toBeInTheDocument();
    expect(screen.getByText('Cue points & beat grid')).toBeInTheDocument();
    expect(screen.getByText('Cloud search & downloads')).toBeInTheDocument();
    expect(screen.getByText('Playlists')).toBeInTheDocument();
    expect(screen.getByText('USB export (Rekordbox)')).toBeInTheDocument();
  });

  it('applies the style prop to the root element', () => {
    const { container } = render(<HelpView style={{ display: 'none' }} />);
    expect(container.querySelector('.help-view')).toHaveStyle({ display: 'none' });
  });
});
