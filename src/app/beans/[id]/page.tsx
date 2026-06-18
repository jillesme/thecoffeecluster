import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { ArrowLeft, Globe, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageShell } from '@/components/page-shell';
import { RoastBadge } from '@/components/roast-badge';
import { LatencyRecorder } from '@/components/latency-recorder';
import { getBeanWithSupplier } from '@/db/queries';
import { getBeanImageUrl } from '@/lib/bean-image';
import {
  HYPERDRIVE_COOKIE,
  resolveHyperdrivePreference,
  withHyperdriveParam,
} from '@/lib/hyperdrive-mode';

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

  // The DAL reports db time, end-to-end server time, and which connection
  // served the read — powering the PlanetScale-vs-Hyperdrive latency panel.
  // Errors propagate to the route's error.tsx boundary.
  const detail = await getBeanWithSupplier({ id: beanId, useHyperdrive });

  if (!detail) {
    notFound();
  }

  const { bean, supplier, dbDurationMs, totalMs, isUsingHyperdrive } = detail;
  const price = (bean.priceInCents / 100).toFixed(2);
  const imageUrl = getBeanImageUrl(bean, { width: 600, height: 600 });

  return (
    <PageShell useHyperdrive={useHyperdrive}>
      <LatencyRecorder
        label={bean.name}
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
                  <RoastBadge roastLevel={bean.roastLevel} size="md" />
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
