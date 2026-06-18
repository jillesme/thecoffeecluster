import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { CoffeeBeanCard } from './coffee-bean-card';
import { HYPERDRIVE_QUERY_PARAM } from '@/lib/hyperdrive-mode';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BeanListItem, Pagination as PaginationInfo } from '@/types/beans';

interface CoffeeBeansGridProps {
  beans: BeanListItem[];
  pagination: PaginationInfo;
  useHyperdrive: boolean;
}

/** Build a catalog href that preserves the Hyperdrive demo toggle. */
function pageHref(page: number, useHyperdrive: boolean) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set(HYPERDRIVE_QUERY_PARAM, useHyperdrive ? 'true' : 'false');
  return `/?${params.toString()}`;
}

/** Page numbers to render, collapsing long ranges with ellipses. */
function getPageNumbers({ currentPage, totalPages }: PaginationInfo) {
  const pages: (number | 'ellipsis')[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }

  pages.push(1);
  if (currentPage > 3) pages.push('ellipsis');

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (currentPage < totalPages - 2) pages.push('ellipsis');
  pages.push(totalPages);

  return pages;
}

// Shared dark-mode overrides matching the original shadcn pagination styling.
const pageLinkClass =
  'dark:!bg-white dark:!text-black dark:!border-gray-300 dark:hover:!bg-gray-100';

export function CoffeeBeansGrid({
  beans,
  pagination,
  useHyperdrive,
}: CoffeeBeansGridProps) {
  const { currentPage, totalPages } = pagination;
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <div className="w-full">
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {beans.map((bean, index) => (
          <CoffeeBeanCard
            key={bean.id}
            {...bean}
            eager={index < 3}
            useHyperdrive={useHyperdrive}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          role="navigation"
          aria-label="pagination"
          className="mx-auto flex w-full justify-center"
        >
          <ul className="flex flex-row items-center gap-1">
            <li>
              {isFirstPage ? (
                <span
                  aria-disabled
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'default' }),
                    pageLinkClass,
                    'gap-1 px-2.5 sm:pl-2.5 pointer-events-none opacity-50'
                  )}
                >
                  <ChevronLeftIcon />
                  <span className="hidden sm:block">Previous</span>
                </span>
              ) : (
                <Link
                  href={pageHref(currentPage - 1, useHyperdrive)}
                  scroll={false}
                  aria-label="Go to previous page"
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'default' }),
                    pageLinkClass,
                    'gap-1 px-2.5 sm:pl-2.5'
                  )}
                >
                  <ChevronLeftIcon />
                  <span className="hidden sm:block">Previous</span>
                </Link>
              )}
            </li>

            {getPageNumbers(pagination).map((page, index) =>
              page === 'ellipsis' ? (
                <li key={`ellipsis-${index}`}>
                  <span
                    aria-hidden
                    className="flex size-9 items-center justify-center dark:text-black"
                  >
                    &hellip;
                    <span className="sr-only">More pages</span>
                  </span>
                </li>
              ) : (
                <li key={page}>
                  <Link
                    href={pageHref(page, useHyperdrive)}
                    scroll={false}
                    aria-current={page === currentPage ? 'page' : undefined}
                    className={cn(
                      buttonVariants({
                        variant: page === currentPage ? 'outline' : 'ghost',
                        size: 'icon',
                      }),
                      pageLinkClass
                    )}
                  >
                    {page}
                  </Link>
                </li>
              )
            )}

            <li>
              {isLastPage ? (
                <span
                  aria-disabled
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'default' }),
                    pageLinkClass,
                    'gap-1 px-2.5 sm:pr-2.5 pointer-events-none opacity-50'
                  )}
                >
                  <span className="hidden sm:block">Next</span>
                  <ChevronRightIcon />
                </span>
              ) : (
                <Link
                  href={pageHref(currentPage + 1, useHyperdrive)}
                  scroll={false}
                  aria-label="Go to next page"
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'default' }),
                    pageLinkClass,
                    'gap-1 px-2.5 sm:pr-2.5'
                  )}
                >
                  <span className="hidden sm:block">Next</span>
                  <ChevronRightIcon />
                </Link>
              )}
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
