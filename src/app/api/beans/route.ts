import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { coffeeBeans } from '@/db/schema';
import { count } from 'drizzle-orm';
import {
  HYPERDRIVE_COOKIE,
  resolveHyperdrivePreference,
} from '@/lib/hyperdrive-mode';

const BEANS_PER_PAGE = 6; // 2 rows × 3 columns

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);

    // Ensure page is at least 1
    const currentPage = Math.max(1, page);
    const offset = (currentPage - 1) * BEANS_PER_PAGE;

    // Read cookie to determine which connection to use
    const useHyperdrive = resolveHyperdrivePreference({
      searchParams,
      cookieValue: request.cookies.get(HYPERDRIVE_COOKIE)?.value,
    });
    const { db, isUsingHyperdrive } = await getDb(useHyperdrive);

    // Measure database query time (using Date.now() for Cloudflare Workers compatibility)
    const dbStartTime = Date.now();

    // Count and page queries are independent, so run them concurrently.
    const [[{ value: totalCount }], beans] = await Promise.all([
      db.select({ value: count() }).from(coffeeBeans),
      db.select().from(coffeeBeans).limit(BEANS_PER_PAGE).offset(offset),
    ]);

    const dbEndTime = Date.now();
    const dbDurationMs = dbEndTime - dbStartTime;

    const totalPages = Math.ceil(totalCount / BEANS_PER_PAGE);

    return NextResponse.json({
      beans,
      pagination: {
        currentPage,
        totalPages,
        totalCount,
        perPage: BEANS_PER_PAGE,
      },
      isUsingHyperdrive,
      dbDurationMs,
    });
  } catch (error) {
    console.error('Error fetching beans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coffee beans' },
      { status: 500 }
    );
  }
}
