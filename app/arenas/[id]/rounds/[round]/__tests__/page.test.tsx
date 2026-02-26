/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

jest.mock('@/components/arena-replay/ArenaReplayViewer', () => ({
  __esModule: true,
  default: function MockArenaReplayViewer(props: Record<string, unknown>) {
    return <div data-testid="arena-replay-viewer" data-props={JSON.stringify(props)} />;
  },
}));

import { render, screen } from '@testing-library/react';
import ArenaRoundReplayPage from '../page';

describe('ArenaRoundReplayPage', () => {
  it('renders replay viewer for valid params', async () => {
    const page = await ArenaRoundReplayPage({
      params: Promise.resolve({ id: '5', round: '3' }),
    });
    render(page);

    const viewer = screen.getByTestId('arena-replay-viewer');
    const props = JSON.parse(viewer.getAttribute('data-props')!);
    expect(props.arenaId).toBe(5);
    expect(props.roundNumber).toBe(3);
    expect(props.totalRounds).toBe(200);
  });

  it('shows error for invalid arena ID', async () => {
    const page = await ArenaRoundReplayPage({
      params: Promise.resolve({ id: 'abc', round: '1' }),
    });
    render(page);

    expect(screen.getByText('Invalid arena or round')).toBeInTheDocument();
  });

  it('shows error for invalid round number', async () => {
    const page = await ArenaRoundReplayPage({
      params: Promise.resolve({ id: '5', round: 'xyz' }),
    });
    render(page);

    expect(screen.getByText('Invalid arena or round')).toBeInTheDocument();
  });

  it('shows error for round number out of range (0)', async () => {
    const page = await ArenaRoundReplayPage({
      params: Promise.resolve({ id: '5', round: '0' }),
    });
    render(page);

    expect(screen.getByText('Invalid arena or round')).toBeInTheDocument();
  });

  it('shows error for round number out of range (201)', async () => {
    const page = await ArenaRoundReplayPage({
      params: Promise.resolve({ id: '5', round: '201' }),
    });
    render(page);

    expect(screen.getByText('Invalid arena or round')).toBeInTheDocument();
  });

  it('accepts maximum valid round number (200)', async () => {
    const page = await ArenaRoundReplayPage({
      params: Promise.resolve({ id: '1', round: '200' }),
    });
    render(page);

    const viewer = screen.getByTestId('arena-replay-viewer');
    const props = JSON.parse(viewer.getAttribute('data-props')!);
    expect(props.roundNumber).toBe(200);
  });
});
