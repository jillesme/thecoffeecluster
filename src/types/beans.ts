import type { CoffeeBean, Supplier } from '@/db/schema';

/** Pagination metadata returned alongside a page of beans. */
export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
}

/**
 * Latency metadata that powers the PlanetScale-vs-Hyperdrive demo.
 * Every data-access call reports how long the DB query took and which
 * connection actually served it.
 */
export interface LatencyMeta {
  dbDurationMs: number;
  isUsingHyperdrive: boolean;
}

/** Result of fetching a page of beans. */
export interface BeanListResult extends LatencyMeta {
  beans: CoffeeBean[];
  pagination: Pagination;
}

/** Result of fetching a single bean with its supplier. */
export interface BeanDetailResult extends LatencyMeta {
  bean: CoffeeBean;
  supplier: Supplier | null;
  /** End-to-end server time including connection acquisition. */
  totalMs: number;
}

/** Shape of the JSON returned by `GET /api/beans`. */
export interface BeansApiResponse extends LatencyMeta {
  beans: CoffeeBean[];
  pagination: Pagination;
}
