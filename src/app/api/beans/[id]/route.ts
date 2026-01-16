import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db';
import { coffeeBeans, suppliers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const beanId = parseInt(id, 10);

    if (isNaN(beanId)) {
      return NextResponse.json(
        { error: 'Invalid bean ID' },
        { status: 400 }
      );
    }

    // Read cookie to determine which connection to use
    const useHyperdrive = request.cookies.get('use-hyperdrive')?.value === 'true';
    const { db, isUsingHyperdrive } = await getDb(useHyperdrive);

    // Measure database query time
    const dbStartTime = Date.now();

    // Fetch bean with supplier JOIN
    const result = await db
      .select({
        bean: coffeeBeans,
        supplier: suppliers,
      })
      .from(coffeeBeans)
      .leftJoin(suppliers, eq(coffeeBeans.supplierId, suppliers.id))
      .where(eq(coffeeBeans.id, beanId))
      .limit(1);

    const dbEndTime = Date.now();
    const dbDurationMs = dbEndTime - dbStartTime;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Coffee bean not found' },
        { status: 404 }
      );
    }

    const { bean, supplier } = result[0];

    // Return with no-cache headers to ensure fresh data on every request
    return NextResponse.json(
      {
        bean,
        supplier,
        isUsingHyperdrive,
        dbDurationMs,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching bean:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coffee bean' },
      { status: 500 }
    );
  }
}
