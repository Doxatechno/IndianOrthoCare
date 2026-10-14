import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const DEFAULT_PAGE_SIZE = 25;

/**
 * Pages a list client-side so a long table does not render every row into the
 * DOM at once. Every list previously rendered its full result set, which grows
 * without bound as the installed base grows.
 *
 * This is deliberately client-side: the data layer loads whole tables into one
 * shared store that every screen reads from, so true server-side paging means
 * reworking that store. See FIXES-APPLIED.md.
 */
export function usePagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  // Filters changing can leave us past the end of a now-shorter list.
  useEffect(() => { if (page > pageCount) setPage(1); }, [page, pageCount]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  return {
    page, setPage, pageCount, pageItems,
    total: items.length,
    from: items.length === 0 ? 0 : (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, items.length),
  };
}

interface PaginationBarProps {
  page: number;
  pageCount: number;
  from: number;
  to: number;
  total: number;
  onChange: (page: number) => void;
  noun?: string;
}

export function PaginationBar({ page, pageCount, from, to, total, onChange, noun = 'records' }: PaginationBarProps) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border/60">
      <p className="text-[11px] text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{from}&ndash;{to}</span> of{' '}
        <span className="font-semibold text-foreground">{total}</span> {noun}
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 rounded-lg gap-1 text-xs"
            disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
            <ChevronLeft size={14} /> Prev
          </Button>
          <span className="text-[11px] text-muted-foreground tabular-nums">{page} / {pageCount}</span>
          <Button variant="outline" size="sm" className="h-8 rounded-lg gap-1 text-xs"
            disabled={page >= pageCount} onClick={() => onChange(page + 1)} aria-label="Next page">
            Next <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
