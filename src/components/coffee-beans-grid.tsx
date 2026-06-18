'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { CoffeeBeanCard } from './coffee-bean-card';
import { CoffeeBeanCardSkeleton } from './coffee-bean-card-skeleton';
import { toast } from 'sonner';
import { useLatencyStore } from '@/lib/latency-store';
import { BEANS_PER_PAGE } from '@/lib/constants';
import { HYPERDRIVE_QUERY_PARAM } from '@/lib/hyperdrive-mode';
import type { CoffeeBean } from '@/db/schema';
import type { BeansApiResponse, Pagination as PaginationInfo } from '@/types/beans';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface CoffeeBeansGridProps {
  initialBeans: CoffeeBean[];
  initialPagination: PaginationInfo;
  useHyperdrive: boolean;
}

export function CoffeeBeansGrid({
  initialBeans,
  initialPagination,
  useHyperdrive,
}: CoffeeBeansGridProps) {
  const [beans, setBeans] = useState<CoffeeBean[]>(initialBeans);
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination);
  const [isPending, startTransition] = useTransition();
  const addRecord = useLatencyStore((state) => state.addRecord);

  // Track the active page for the popstate handler without re-subscribing.
  const currentPageRef = useRef(pagination.currentPage);
  useEffect(() => {
    currentPageRef.current = pagination.currentPage;
  }, [pagination.currentPage]);

  // Fetch a page via the API "latency probe" and record timing for the demo.
  const fetchPage = useCallback(
    async (page: number, showToast = true) => {
      const startTime = performance.now();

      try {
        const response = await fetch(
          `/api/beans?page=${page}&${HYPERDRIVE_QUERY_PARAM}=${useHyperdrive ? 'true' : 'false'}`
        );
        if (!response.ok) throw new Error('Failed to fetch beans');

        const data = (await response.json()) as BeansApiResponse;
        const endTime = performance.now();
        const totalMs = Math.round(endTime - startTime);

        setBeans(data.beans);
        setPagination(data.pagination);

        // Record latency stats
        addRecord({
          totalMs,
          dbMs: data.dbDurationMs,
          isHyperdrive: data.isUsingHyperdrive,
        });

        // Show success toast with request time and connection type
        if (showToast) {
          const connectionType = data.isUsingHyperdrive ? 'Hyperdrive' : 'Direct';
          toast.success(`Loaded page ${page}`, {
            description: `${data.dbDurationMs}ms db / ${totalMs}ms total (${connectionType})`,
          });
        }
      } catch (error) {
        console.error('Error fetching beans:', error);
        toast.error('Failed to load coffee beans', {
          description: 'Please try again',
        });
      }
    },
    [addRecord, useHyperdrive]
  );

  // Reflect the active page in the URL (shallow, no server round-trip) so pages
  // are bookmarkable/shareable while preserving the client-side latency probe.
  const buildPageUrl = useCallback(
    (page: number) => {
      const params = new URLSearchParams(window.location.search);
      params.set('page', String(page));
      params.set(HYPERDRIVE_QUERY_PARAM, useHyperdrive ? 'true' : 'false');
      return `${window.location.pathname}?${params.toString()}`;
    },
    [useHyperdrive]
  );

  const handlePageChange = (page: number) => {
    if (page === pagination.currentPage || page < 1 || page > pagination.totalPages) {
      return;
    }

    window.history.pushState(null, '', buildPageUrl(page));
    startTransition(async () => {
      await fetchPage(page);
    });
  };

  // Keep the grid in sync with browser back/forward navigation.
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const parsed = parseInt(params.get('page') ?? '1', 10);
      const target = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
      if (target !== currentPageRef.current) {
        startTransition(async () => {
          await fetchPage(target, false);
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [fetchPage]);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const { currentPage, totalPages } = pagination;

    if (totalPages <= 7) {
      // Show all pages if total is 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="w-full">
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {isPending ? (
          // Show skeleton cards while loading
          Array.from({ length: pagination.perPage || BEANS_PER_PAGE }).map((_, index) => (
            <CoffeeBeanCardSkeleton key={`skeleton-${index}`} />
          ))
        ) : (
          // Show actual beans when not loading
          beans.map((bean, index) => (
            <CoffeeBeanCard
              key={bean.id}
              {...bean}
              eager={index < 3}
              useHyperdrive={useHyperdrive}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(pagination.currentPage - 1);
                }}
                aria-disabled={pagination.currentPage === 1}
                className={
                  pagination.currentPage === 1
                    ? 'pointer-events-none opacity-50'
                    : ''
                }
              />
            </PaginationItem>

            {pageNumbers.map((page, index) => (
              <PaginationItem key={index}>
                {page === 'ellipsis' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page);
                    }}
                    isActive={page === pagination.currentPage}
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageChange(pagination.currentPage + 1);
                }}
                aria-disabled={pagination.currentPage === pagination.totalPages}
                className={
                  pagination.currentPage === pagination.totalPages
                    ? 'pointer-events-none opacity-50'
                    : ''
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
