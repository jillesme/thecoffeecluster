import { NextRequest, NextResponse } from 'next/server';
import { getBeanWithSupplier } from '@/db/queries';
import {
  HYPERDRIVE_COOKIE,
  resolveHyperdrivePreference,
} from '@/lib/hyperdrive-mode';

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
    const useHyperdrive = resolveHyperdrivePreference({
      searchParams: request.nextUrl.searchParams,
      cookieValue: request.cookies.get(HYPERDRIVE_COOKIE)?.value,
    });

    const detail = await getBeanWithSupplier({ id: beanId, useHyperdrive });

    if (!detail) {
      return NextResponse.json(
        { error: 'Coffee bean not found' },
        { status: 404 }
      );
    }

    const { bean, supplier, isUsingHyperdrive, dbDurationMs } = detail;

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
