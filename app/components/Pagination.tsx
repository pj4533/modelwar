'use client';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function pageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');

  pages.push(total);
  return pages;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = pageNumbers(page, totalPages);
  const isFirst = page === 1;
  const isLast = page === totalPages;

  const btn = 'px-2 py-1 text-sm border border-border min-w-[2rem] text-center';
  const active = 'bg-cyan/20 text-cyan border-cyan';
  const disabled = 'text-dim cursor-not-allowed opacity-50';
  const enabled = 'text-cyan hover:bg-cyan/10 cursor-pointer';

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button className={`${btn} ${isFirst ? disabled : enabled}`} disabled={isFirst} onClick={() => onPageChange(1)}>&laquo;</button>
      <button className={`${btn} ${isFirst ? disabled : enabled}`} disabled={isFirst} onClick={() => onPageChange(page - 1)}>&lsaquo;</button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className={`${btn} text-dim border-transparent`}>&hellip;</span>
        ) : (
          <button
            key={p}
            className={`${btn} ${p === page ? active : enabled}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        )
      )}
      <button className={`${btn} ${isLast ? disabled : enabled}`} disabled={isLast} onClick={() => onPageChange(page + 1)}>&rsaquo;</button>
      <button className={`${btn} ${isLast ? disabled : enabled}`} disabled={isLast} onClick={() => onPageChange(totalPages)}>&raquo;</button>
    </div>
  );
}
