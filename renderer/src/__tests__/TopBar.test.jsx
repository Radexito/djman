import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TopBar from '../TopBar.jsx';

describe('TopBar', () => {
  it('calls onOpenHelp when Help is clicked', () => {
    const onOpenHelp = vi.fn();
    render(
      <TopBar search="" onSearchChange={vi.fn()} onOpenHelp={onOpenHelp} onOpenSettings={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    expect(onOpenHelp).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenSettings when Settings is clicked', () => {
    const onOpenSettings = vi.fn();
    render(
      <TopBar
        search=""
        onSearchChange={vi.fn()}
        onOpenHelp={vi.fn()}
        onOpenSettings={onOpenSettings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
