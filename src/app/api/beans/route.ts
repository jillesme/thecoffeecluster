import { NextRequest, NextResponse } from 'next/server';
import { getBeansPage } from '@/db/queries';
import {
  HYPERDRIVE_COOKIE,
  resolveHyperdrivePreference,
} from '@/lib/hyperdrive-mode';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);

    // Read cookie to determine which connection to use
    const useHyperdrive = resolveHyperdrivePreference({
      searchParams,
      cookieValue: request.cookies.get(HYPERDRIVE_COOKIE)?.value,
    });

    const { beans, pagination, isUsingHyperdrive, dbDurationMs } =
      await getBeansPage({ page, useHyperdrive });

    return NextResponse.json({
      beans,
      pagination,
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
