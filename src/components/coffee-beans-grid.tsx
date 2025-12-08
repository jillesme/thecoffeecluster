'use client';

import { useState, useTransition } from 'react';
import { CoffeeBeanCard } from './coffee-bean-card';
import { CoffeeBeanCardSkeleton } from './coffee-bean-card-skeleton';
import { toast } from 'sonner';
import { useLatencyStore } from '@/lib/latency-store';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface CoffeeBean {
  id: number;
  name: string;
  description: string | null;
  imageKey: string | null;
  tastingNotes: string | null;
  priceInCents: number;
  roastLevel: 'Light' | 'Medium' | 'Dark' | 'Espresso' | null;
  supplierId: number | null;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
}

interface CoffeeBeansGridProps {
  initialBeans: CoffeeBean[];
  initialPagination: PaginationInfo;
}

interface BeansApiResponse {
  beans: CoffeeBean[];
  pagination: PaginationInfo;
  isUsingHyperdrive: boolean;
  dbDurationMs: number;
}

export function CoffeeBeansGrid({
  initialBeans,
  initialPagination,
}: CoffeeBeansGridProps) {
  const [beans, setBeans] = useState<CoffeeBean[]>(initialBeans);
  const [pagination, setPagination] = useState<PaginationInfo>(initialPagination);
  const [isPending, startTransition] = useTransition();
  const addRecord = useLatencyStore((state) => state.addRecord);

  // Fetch data for a specific page
  const fetchPage = async (page: number, showToast = true) => {
    const startTime = performance.now();

    try {
      const response = await fetch(`/api/beans?page=${page}`);
      if (!response.ok) throw new Error('Failed to fetch beans');

      const data = await response.json() as BeansApiResponse;
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
  };

  const handlePageChange = async (page: number) => {
    if (page === pagination.currentPage || page < 1 || page > pagination.totalPages) {
      return;
    }

    startTransition(async () => {
      await fetchPage(page);
    });
  };

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
          Array.from({ length: 6 }).map((_, index) => (
            <CoffeeBeanCardSkeleton key={`skeleton-${index}`} />
          ))
        ) : (
          // Show actual beans when not loading
          beans.map((bean) => (
            <CoffeeBeanCard key={bean.id} {...bean} />
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
