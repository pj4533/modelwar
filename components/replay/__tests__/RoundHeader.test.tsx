/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoundHeader from '../RoundHeader';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('RoundHeader', () => {
  const defaultProps = {
    battleId: 42,
    roundNumber: 2,
    totalRounds: 5,
    challengerName: 'Drift',
    defenderName: 'TheProfessor',
    onViewCode: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders battle info', () => {
    render(<RoundHeader {...defaultProps} />);
    expect(screen.getByText(/BATTLE #42/)).toBeInTheDocument();
    expect(screen.getByText(/ROUND 2 OF 5/)).toBeInTheDocument();
  });

  it('renders fighter names in bracket notation', () => {
    render(<RoundHeader {...defaultProps} />);
    expect(screen.getByText('[Drift]')).toBeInTheDocument();
    expect(screen.getByText('[TheProfessor]')).toBeInTheDocument();
  });

  it('renders challenger name with green styling', () => {
    render(<RoundHeader {...defaultProps} />);
    const btn = screen.getByText('[Drift]');
    expect(btn.className).toContain('text-green');
    expect(btn.className).toContain('glow-green');
  });

  it('renders defender name with magenta styling', () => {
    render(<RoundHeader {...defaultProps} />);
    const btn = screen.getByText('[TheProfessor]');
    expect(btn.className).toContain('text-magenta');
    expect(btn.className).toContain('glow-magenta');
  });

  it('calls onViewCode("challenger") when challenger name is clicked', () => {
    render(<RoundHeader {...defaultProps} />);
    fireEvent.click(screen.getByText('[Drift]'));
    expect(defaultProps.onViewCode).toHaveBeenCalledWith('challenger');
  });

  it('calls onViewCode("defender") when defender name is clicked', () => {
    render(<RoundHeader {...defaultProps} />);
    fireEvent.click(screen.getByText('[TheProfessor]'));
    expect(defaultProps.onViewCode).toHaveBeenCalledWith('defender');
  });

  it('displays "TAP NAME TO VIEW CODE" hint', () => {
    render(<RoundHeader {...defaultProps} />);
    expect(screen.getByText('TAP NAME TO VIEW CODE')).toBeInTheDocument();
  });

  it('renders HOME link', () => {
    render(<RoundHeader {...defaultProps} />);
    const homeLink = screen.getByText('HOME');
    expect(homeLink).toBeInTheDocument();
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('renders BATTLE link', () => {
    render(<RoundHeader {...defaultProps} />);
    const battleLink = screen.getByText('BATTLE');
    expect(battleLink).toBeInTheDocument();
    expect(battleLink.closest('a')).toHaveAttribute('href', '/battles/42');
  });

  it('shows PREV link when roundNumber > 1', () => {
    render(<RoundHeader {...defaultProps} roundNumber={2} />);
    const prevLink = screen.getByText(/PREV/);
    expect(prevLink).toBeInTheDocument();
    expect(prevLink.closest('a')).toHaveAttribute('href', '/battles/42/rounds/1');
  });

  it('hides PREV link when roundNumber is 1', () => {
    render(<RoundHeader {...defaultProps} roundNumber={1} />);
    expect(screen.queryByText(/PREV/)).not.toBeInTheDocument();
  });

  it('shows NEXT link when roundNumber < totalRounds', () => {
    render(<RoundHeader {...defaultProps} roundNumber={2} totalRounds={5} />);
    const nextLink = screen.getByText(/NEXT/);
    expect(nextLink).toBeInTheDocument();
    expect(nextLink.closest('a')).toHaveAttribute('href', '/battles/42/rounds/3');
  });

  it('hides NEXT link when roundNumber equals totalRounds', () => {
    render(<RoundHeader {...defaultProps} roundNumber={5} totalRounds={5} />);
    expect(screen.queryByText(/NEXT/)).not.toBeInTheDocument();
  });
});
