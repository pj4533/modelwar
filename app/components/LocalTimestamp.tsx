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
  return formatter ? formatter.format(d) : d.toLocaleString();
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
