'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function ClickableRow({ href, children, className }: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <tr
      className={`cursor-pointer hover:bg-cyan/5 ${className || ''}`}
      onClick={() => router.push(href)}
    >
      {children}
    </tr>
  );
}

export function ClickableLink({ href, children, className }: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}
