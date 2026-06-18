import { count, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { coffeeBeans, suppliers } from '@/db/schema';
import { BEANS_PER_PAGE } from '@/lib/constants';
import type { BeanDetailResult, BeanListResult } from '@/types/beans';

interface BeanQueryOptions {
  /** Whether to route the query through Hyperdrive (the demo toggle). */
  useHyperdrive: boolean;
}

/**
 * Fetch a single page of coffee beans plus pagination + latency metadata.
 *
 * The query shape (count + limit/offset) is intentionally kept simple so the
 * timing reflects a representative read for the PlanetScale-vs-Hyperdrive demo.
 */
export async function getBeansPage({
  page,
  useHyperdrive,
}: BeanQueryOptions & { page: number }): Promise<BeanListResult> {
  const currentPage = Math.max(1, Number.isFinite(page) ? page : 1);
  const offset = (currentPage - 1) * BEANS_PER_PAGE;

  const totalStartTime = Date.now();
  const { db, isUsingHyperdrive } = await getDb(useHyperdrive);

  // Measure DB time with Date.now() for Cloudflare Workers compatibility.
  const dbStartTime = Date.now();

  // Count and page queries are independent, so run them concurrently.
  const [[{ value: totalCount }], beans] = await Promise.all([
    db.select({ value: count() }).from(coffeeBeans),
    db
      .select({
        id: coffeeBeans.id,
        name: coffeeBeans.name,
        description: coffeeBeans.description,
        imageKey: coffeeBeans.imageKey,
        tastingNotes: coffeeBeans.tastingNotes,
        priceInCents: coffeeBeans.priceInCents,
        roastLevel: coffeeBeans.roastLevel,
      })
      .from(coffeeBeans)
      .limit(BEANS_PER_PAGE)
      .offset(offset),
  ]);

  const dbDurationMs = Date.now() - dbStartTime;
  const totalPages = Math.ceil(totalCount / BEANS_PER_PAGE);

  return {
    beans,
    pagination: {
      currentPage,
      totalPages,
      totalCount,
      perPage: BEANS_PER_PAGE,
    },
    isUsingHyperdrive,
    dbDurationMs,
    totalMs: Date.now() - totalStartTime,
  };
}

/**
 * Fetch a single bean joined with its supplier, plus latency metadata.
 * Returns `null` when no bean matches the id.
 */
export async function getBeanWithSupplier({
  id,
  useHyperdrive,
}: BeanQueryOptions & { id: number }): Promise<BeanDetailResult | null> {
  const totalStartTime = Date.now();
  const { db, isUsingHyperdrive } = await getDb(useHyperdrive);

  const dbStartTime = Date.now();

  const rows = await db
    .select({
      bean: coffeeBeans,
      supplier: suppliers,
    })
    .from(coffeeBeans)
    .leftJoin(suppliers, eq(coffeeBeans.supplierId, suppliers.id))
    .where(eq(coffeeBeans.id, id))
    .limit(1);

  const dbDurationMs = Date.now() - dbStartTime;

  if (rows.length === 0) {
    return null;
  }

  const { bean, supplier } = rows[0];

  return {
    bean,
    supplier,
    isUsingHyperdrive,
    dbDurationMs,
    totalMs: Date.now() - totalStartTime,
  };
}
