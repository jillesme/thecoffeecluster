import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { AlertTriangle, ArrowLeft, Globe, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageShell } from '@/components/page-shell';
import { BeanDetailLatencyRecorder } from '@/components/bean-detail-latency-recorder';
import { getDb } from '@/db';
import { coffeeBeans, suppliers } from '@/db/schema';
import {
  HYPERDRIVE_COOKIE,
  resolveHyperdrivePreference,
  withHyperdriveParam,
} from '@/lib/hyperdrive-mode';

const ROAST_COLORS = {
  Light: 'bg-amber-100 text-amber-800',
  Medium: 'bg-amber-200 text-amber-900',
  Dark: 'bg-amber-800 text-amber-50',
  Espresso: 'bg-stone-900 text-stone-50',
};

async function getBeanDetailData(beanId: number, useHyperdrive: boolean) {
  const requestStartTime = Date.now();
  const { db, isUsingHyperdrive } = await getDb(useHyperdrive);

  const dbStartTime = Date.now();
  const result = await db
    .select({
      bean: coffeeBeans,
      supplier: suppliers,
    })
    .from(coffeeBeans)
    .leftJoin(suppliers, eq(coffeeBeans.supplierId, suppliers.id))
    .where(eq(coffeeBeans.id, beanId))
    .limit(1);
  const dbDurationMs = Date.now() - dbStartTime;
  const totalMs = Date.now() - requestStartTime;

  return {
    result,
    dbDurationMs,
    totalMs,
    isUsingHyperdrive,
  };
}

function getSafeBeanDetailError(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes('No database connection string')) {
      return 'Database connection is not configured for the selected mode.';
    }

    if (/timeout|timed out|connect|connection|ECONN/i.test(error.message)) {
      return 'Database connection failed or timed out for the selected mode.';
    }
  }

  return 'Database query failed while loading this bean detail.';
}

function BeanDetailInlineError({
  beanId,
  useHyperdrive,
  error,
}: {
  beanId: number;
  useHyperdrive: boolean;
  error: unknown;
}) {
  const connectionType = useHyperdrive ? 'Hyperdrive' : 'Direct';

  return (
    <PageShell useHyperdrive={useHyperdrive}>
      <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-white p-8 shadow-sm">
        <div className="mb-4 flex items-center gap-3 text-amber-700">
          <AlertTriangle className="h-6 w-6" />
          <h1 className="text-2xl font-bold text-stone-900">Could not load bean #{beanId}</h1>
        </div>

        <p className="mb-4 text-stone-600">{getSafeBeanDetailError(error)}</p>

        <div className="mb-6 rounded-lg bg-stone-50 p-4 text-sm text-stone-600">
          <p>
            <span className="font-semibold text-stone-800">Connection mode:</span>{' '}
            {connectionType}
          </p>
          <p className="mt-2 text-xs text-stone-500">
            The full error is logged server-side. This panel only shows a sanitized demo-safe summary.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href={withHyperdriveParam('/', useHyperdrive)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to all beans
          </Link>
        </Button>
      </div>
    </PageShell>
  );
}

export default async function BeanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, resolvedSearchParams, cookieStore] = await Promise.all([
    params,
    searchParams,
    cookies(),
  ]);
  const beanId = parseInt(id, 10);

  if (isNaN(beanId)) {
    notFound();
  }

  const useHyperdrive = resolveHyperdrivePreference({
    searchParams: resolvedSearchParams,
    cookieValue: cookieStore.get(HYPERDRIVE_COOKIE)?.value,
  });
  let detailData: Awaited<ReturnType<typeof getBeanDetailData>>;

  try {
    detailData = await getBeanDetailData(beanId, useHyperdrive);
  } catch (error) {
    console.error('Failed to load bean detail:', error);
    return (
      <BeanDetailInlineError
        beanId={beanId}
        useHyperdrive={useHyperdrive}
        error={error}
      />
    );
  }

  const { result, dbDurationMs, totalMs, isUsingHyperdrive } = detailData;

  if (result.length === 0) {
    notFound();
  }

  const { bean, supplier } = result[0];
  const price = (bean.priceInCents / 100).toFixed(2);

  const imageUrl = bean.imageKey
    ? `${process.env.NEXT_PUBLIC_R2_URL}/${bean.imageKey}`
    : `https://placehold.co/600x600/8b7355/ffffff?text=${encodeURIComponent(bean.name)}`;

  return (
    <PageShell useHyperdrive={useHyperdrive}>
      <BeanDetailLatencyRecorder
        beanName={bean.name}
        dbDurationMs={dbDurationMs}
        totalMs={totalMs}
        isUsingHyperdrive={isUsingHyperdrive}
      />
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Button asChild variant="ghost" className="mb-6 -ml-2 text-stone-600 hover:text-stone-900">
          <Link href={withHyperdriveParam('/', useHyperdrive)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to all beans
          </Link>
        </Button>

        <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Image */}
            <div className="relative aspect-square md:aspect-auto md:min-h-[500px] bg-stone-100">
              <Image
                src={imageUrl}
                alt={bean.name}
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 flex flex-col">
              {/* Roast badge */}
              {bean.roastLevel && (
                <div className="mb-4">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                      ROAST_COLORS[bean.roastLevel]
                    }`}
                  >
                    {bean.roastLevel} Roast
                  </span>
                </div>
              )}

              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mb-2">
                {bean.name}
              </h1>

              {/* Price */}
              <p className="text-2xl font-bold text-stone-700 mb-6">${price}</p>

              {/* Description */}
              {bean.description && (
                <p className="text-stone-600 leading-relaxed mb-6">
                  {bean.description}
                </p>
              )}

              {/* Tasting notes */}
              {bean.tastingNotes && (
                <div className="mb-6">
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                    Tasting Notes
                  </p>
                  <p className="text-lg text-stone-800 italic">
                    {bean.tastingNotes}
                  </p>
                </div>
              )}

              {/* Supplier info */}
              {supplier && (
                <div className="mt-auto border-t border-stone-100 pt-6">
                  <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">
                    Supplier
                  </p>
                  <div className="bg-stone-50 rounded-lg p-4">
                    <p className="font-semibold text-stone-900 mb-1">
                      {supplier.name}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-stone-600 mb-2">
                      <Globe className="w-4 h-4" />
                      {supplier.country}
                    </div>
                    {supplier.isFairTrade && (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                        <Leaf className="w-3 h-3 mr-1" />
                        Fair Trade
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
