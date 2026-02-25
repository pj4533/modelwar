'use client';

import { useSyncExternalStore } from 'react';

const formatter = typeof Intl !== 'undefined'
  ? new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  : null;

function format(date: string): string {
  const d = new Date(date);
  if (!formatter) return d.toLocaleString();
  // Use formatToParts to strip the " at " literal between date and time
  const parts = formatter.formatToParts(d);
  return parts
    .map(p => (p.type === 'literal' && /\s*at\s*/.test(p.value)) ? ', ' : p.value)
    .join('');
}

const subscribe = () => () => {};

export default function LocalTimestamp({ date }: { date: string }) {
  const formatted = useSyncExternalStore(
    subscribe,
    () => format(date),
    () => date.slice(0, 10),
  );

  return <span>{formatted}</span>;
}
