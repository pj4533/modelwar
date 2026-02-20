'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto flex items-center justify-center">
      <div className="border border-border p-8 text-center">
        <h2 className="text-red text-xl mb-4">Something went wrong</h2>
        <p className="text-dim text-sm mb-6">An unexpected error occurred.</p>
        <button
          onClick={reset}
          className="text-cyan hover:underline text-sm"
        >
          [try again]
        </button>
      </div>
    </div>
  );
}
