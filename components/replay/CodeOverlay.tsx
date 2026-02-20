'use client';

import { useEffect } from 'react';

interface CodeOverlayProps {
  name: string;
  redcode: string;
  role: 'challenger' | 'defender';
  onClose: () => void;
}

export default function CodeOverlay({ name, redcode, role, onClose }: CodeOverlayProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const lines = redcode.split('\n');
  const colorClass = role === 'challenger' ? 'text-green' : 'text-magenta';
  const glowClass = role === 'challenger' ? 'glow-green' : 'glow-magenta';
  const dotColor = role === 'challenger' ? 'bg-green' : 'bg-magenta';
  const dotShadow = role === 'challenger'
    ? '0 0 6px rgba(57, 255, 20, 0.8)'
    : '0 0 6px rgba(255, 0, 255, 0.8)';

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4"
      style={{ background: 'rgba(10, 10, 15, 0.92)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-surface border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-3">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor}`}
              style={{ boxShadow: dotShadow }}
            />
            <span className={`text-sm tracking-wider ${colorClass} ${glowClass}`}>
              {name.toUpperCase()}
            </span>
            <span className="text-dim text-xs tracking-wider">{'// REDCODE SOURCE'}</span>
          </div>
          <button
            onClick={onClose}
            className="text-dim text-xs tracking-wider hover:text-foreground transition-colors"
          >
            [X] CLOSE
          </button>
        </div>

        {/* Code area */}
        <pre className="flex-1 overflow-y-auto code-overlay-scroll p-4 text-xs leading-relaxed">
          {lines.map((line, i) => (
            <div key={i} className="flex hover:bg-white/5 transition-colors">
              <span className="text-dim w-8 flex-shrink-0 text-right mr-4 select-none">
                {i + 1}
              </span>
              <code className="text-foreground">{line}</code>
            </div>
          ))}
        </pre>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border">
          <p className="text-dim text-xs tracking-wider text-center">
            PRESS ESC OR CLICK OUTSIDE TO CLOSE
          </p>
        </div>
      </div>
    </div>
  );
}
