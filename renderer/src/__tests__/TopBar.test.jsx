import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TopBar from '../TopBar.jsx';

describe('TopBar logo', () => {
  it('calls onLogoClick when the logo is clicked', () => {
    const onLogoClick = vi.fn();
    render(
      <TopBar
        search=""
        onSearchChange={() => {}}
        onOpenSettings={() => {}}
        onLogoClick={onLogoClick}
      />
    );

    fireEvent.click(screen.getByAltText('DJ Manager'));

    expect(onLogoClick).toHaveBeenCalledTimes(1);
  });

  it('calls onLogoClick on Enter/Space when the logo is focused', () => {
    const onLogoClick = vi.fn();
    render(
      <TopBar
        search=""
        onSearchChange={() => {}}
        onOpenSettings={() => {}}
        onLogoClick={onLogoClick}
      />
    );

    const logo = screen.getByRole('button', { name: 'DJ Manager' });
    fireEvent.keyDown(logo, { key: 'Enter' });
    fireEvent.keyDown(logo, { key: ' ' });

    expect(onLogoClick).toHaveBeenCalledTimes(2);
  });
});
