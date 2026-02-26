/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ArenaRoundsList from '../ArenaRoundsList';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const warriors = [
  { name: 'Player1', is_stock_bot: false },
  { name: 'Player2', is_stock_bot: false },
  { name: '[BOT] Imp', is_stock_bot: true },
];

function makeRounds(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    round_number: i + 1,
    winner_slot: i % 3 === 0 ? null : (i % 3) - 1,
    survivor_count: i % 3 === 0 ? 2 : 1,
  }));
}

describe('ArenaRoundsList', () => {
  it('renders round rows with winner names and color dots', () => {
    const rounds = [
      { round_number: 1, winner_slot: 0, survivor_count: 1 },
      { round_number: 2, winner_slot: 1, survivor_count: 1 },
      { round_number: 3, winner_slot: null, survivor_count: 3 },
    ];

    render(<ArenaRoundsList arenaId={1} rounds={rounds} warriors={warriors} />);

    expect(screen.getByText('Player1')).toBeInTheDocument();
    expect(screen.getByText('Player2')).toBeInTheDocument();
    expect(screen.getByText('TIE (3 survivors)')).toBeInTheDocument();
  });

  it('renders REPLAY links pointing to correct URLs', () => {
    const rounds = [
      { round_number: 5, winner_slot: 0, survivor_count: 1 },
    ];

    render(<ArenaRoundsList arenaId={42} rounds={rounds} warriors={warriors} />);

    const link = screen.getByText('REPLAY');
    expect(link).toHaveAttribute('href', '/arenas/42/rounds/5');
  });

  it('does not render pagination when rounds fit on one page', () => {
    const rounds = makeRounds(10);
    render(<ArenaRoundsList arenaId={1} rounds={rounds} warriors={warriors} />);

    // Pagination component returns null when totalPages <= 1
    const replayLinks = screen.getAllByText('REPLAY');
    expect(replayLinks).toHaveLength(10);
  });

  it('renders pagination when rounds exceed page size', () => {
    const rounds = makeRounds(25);
    render(<ArenaRoundsList arenaId={1} rounds={rounds} warriors={warriors} />);

    // Should show page 1 with 20 rounds
    const rows = screen.getAllByText('REPLAY');
    expect(rows).toHaveLength(20);
  });

  it('paginates to page 2 on click', () => {
    const rounds = makeRounds(25);
    render(<ArenaRoundsList arenaId={1} rounds={rounds} warriors={warriors} />);

    // Click page 2
    fireEvent.click(screen.getByText('2'));

    // Page 2 should show remaining 5 rounds
    const rows = screen.getAllByText('REPLAY');
    expect(rows).toHaveLength(5);
  });

  it('shows round numbers correctly', () => {
    const rounds = [
      { round_number: 42, winner_slot: 0, survivor_count: 1 },
    ];

    render(<ArenaRoundsList arenaId={1} rounds={rounds} warriors={warriors} />);
    expect(screen.getByText('#42')).toBeInTheDocument();
  });
});
