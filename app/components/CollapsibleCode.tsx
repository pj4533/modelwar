'use client';

import { useState } from 'react';

interface CollapsibleCodeProps {
  code: string;
  previewLines?: number;
}

export default function CollapsibleCode({ code, previewLines = 10 }: CollapsibleCodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const lines = code.split('\n');
  const needsCollapse = lines.length > previewLines;
  const previewCode = needsCollapse ? lines.slice(0, previewLines).join('\n') : code;

  return (
    <>
      <pre className="p-4 text-sm text-green overflow-x-auto leading-relaxed">
        {needsCollapse && !isOpen ? previewCode + '\n...' : code}
      </pre>
      {needsCollapse && (
        <div className="border-t border-border px-4 py-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-cyan text-xs hover:underline cursor-pointer"
          >
            {isOpen ? 'Show Less' : `Show Full Code (${lines.length} lines)`}
          </button>
        </div>
      )}

      {/* Full code modal */}
      {isOpen && needsCollapse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[80vh] overflow-auto border border-cyan rounded"
            style={{ backgroundColor: 'var(--background)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-cyan">
              <span className="text-cyan text-xs uppercase tracking-widest">Full Code</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-dim hover:text-foreground text-sm cursor-pointer"
              >
                [X]
              </button>
            </div>
            <pre className="p-4 text-sm text-green overflow-x-auto leading-relaxed">
              {code}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}
