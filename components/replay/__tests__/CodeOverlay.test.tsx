/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CodeOverlay from '../CodeOverlay';

const sampleRedcode = `;redcode-94
;name TestWarrior
;author AI
MOV 0, 1
ADD #5, -1
JMP -2`;

describe('CodeOverlay', () => {
  const defaultProps = {
    name: 'TestWarrior',
    redcode: sampleRedcode,
    role: 'challenger' as const,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders fighter name uppercased', () => {
    render(<CodeOverlay {...defaultProps} />);
    expect(screen.getByText('TESTWARRIOR')).toBeInTheDocument();
  });

  it('renders "// REDCODE SOURCE" text', () => {
    render(<CodeOverlay {...defaultProps} />);
    expect(screen.getByText('// REDCODE SOURCE')).toBeInTheDocument();
  });

  it('renders redcode lines with line numbers', () => {
    render(<CodeOverlay {...defaultProps} />);
    const lines = sampleRedcode.split('\n');
    lines.forEach((line, i) => {
      expect(screen.getByText(String(i + 1))).toBeInTheDocument();
      expect(screen.getByText(line)).toBeInTheDocument();
    });
  });

  it('renders [X] CLOSE button', () => {
    render(<CodeOverlay {...defaultProps} />);
    expect(screen.getByText('[X] CLOSE')).toBeInTheDocument();
  });

  it('renders footer text', () => {
    render(<CodeOverlay {...defaultProps} />);
    expect(screen.getByText('PRESS ESC OR CLICK OUTSIDE TO CLOSE')).toBeInTheDocument();
  });

  it('applies green styling for challenger role', () => {
    render(<CodeOverlay {...defaultProps} role="challenger" />);
    const nameEl = screen.getByText('TESTWARRIOR');
    expect(nameEl.className).toContain('text-green');
    expect(nameEl.className).toContain('glow-green');
  });

  it('applies magenta styling for defender role', () => {
    render(<CodeOverlay {...defaultProps} role="defender" />);
    const nameEl = screen.getByText('TESTWARRIOR');
    expect(nameEl.className).toContain('text-magenta');
    expect(nameEl.className).toContain('glow-magenta');
  });

  it('applies green dot for challenger role', () => {
    const { container } = render(<CodeOverlay {...defaultProps} role="challenger" />);
    const dot = container.querySelector('.bg-green');
    expect(dot).toBeInTheDocument();
  });

  it('applies magenta dot for defender role', () => {
    const { container } = render(<CodeOverlay {...defaultProps} role="defender" />);
    const dot = container.querySelector('.bg-magenta');
    expect(dot).toBeInTheDocument();
  });

  it('calls onClose when Escape key is pressed', () => {
    render(<CodeOverlay {...defaultProps} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose for non-Escape keys', () => {
    render(<CodeOverlay {...defaultProps} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    const { container } = render(<CodeOverlay {...defaultProps} />);
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when [X] CLOSE button is clicked', () => {
    render(<CodeOverlay {...defaultProps} />);
    fireEvent.click(screen.getByText('[X] CLOSE'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when clicking inside the code window', () => {
    render(<CodeOverlay {...defaultProps} />);
    const nameEl = screen.getByText('TESTWARRIOR');
    // Click inside the terminal window (on the name element)
    fireEvent.click(nameEl);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('cleans up keydown listener on unmount', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    const { unmount } = render(<CodeOverlay {...defaultProps} />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeSpy.mockRestore();
  });
});
