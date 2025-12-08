'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { ArrowLeft, Globe, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CoffeeBeanDetailSkeleton } from '@/components/coffee-bean-detail-skeleton';
import { PageShell } from '@/components/page-shell';
import { useLatencyStore } from '@/lib/latency-store';

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

interface Supplier {
  id: number;
  name: string;
  country: string;
  isFairTrade: boolean | null;
  websiteUrl: string | null;
}

interface BeanApiResponse {
  bean: CoffeeBean;
  supplier: Supplier | null;
  isUsingHyperdrive: boolean;
  dbDurationMs: number;
}

const ROAST_COLORS = {
  Light: 'bg-amber-100 text-amber-800',
  Medium: 'bg-amber-200 text-amber-900',
  Dark: 'bg-amber-800 text-amber-50',
  Espresso: 'bg-stone-900 text-stone-50',
};

export default function BeanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<BeanApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const addRecord = useLatencyStore((state) => state.addRecord);

  useEffect(() => {
    const fetchBean = async () => {
      setIsLoading(true);
      setError(null);

      const startTime = performance.now();

      try {
        const response = await fetch(`/api/beans/${params.id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Coffee bean not found');
          } else {
            setError('Failed to load coffee bean');
          }
          return;
        }

        const result = await response.json() as BeanApiResponse;
        const endTime = performance.now();
        const totalMs = Math.round(endTime - startTime);

        setData(result);

        // Record latency stats
        addRecord({
          totalMs,
          dbMs: result.dbDurationMs,
          isHyperdrive: result.isUsingHyperdrive,
        });

        // Show toast
        const connectionType = result.isUsingHyperdrive ? 'Hyperdrive' : 'Direct';
        toast.success(`Loaded ${result.bean.name}`, {
          description: `${result.dbDurationMs}ms db / ${totalMs}ms total (${connectionType})`,
        });
      } catch (err) {
        console.error('Error fetching bean:', err);
        setError('Failed to load coffee bean');
        toast.error('Failed to load coffee bean');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchBean();
    }
  }, [params.id, addRecord]);

  if (isLoading) {
    return (
      <PageShell>
        <CoffeeBeanDetailSkeleton />
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto text-center py-12">
          <p className="text-stone-600 mb-4">{error || 'Something went wrong'}</p>
          <Button variant="outline" onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to all beans
          </Button>
        </div>
      </PageShell>
    );
  }

  const { bean, supplier } = data;
  const price = (bean.priceInCents / 100).toFixed(2);

  const imageUrl = bean.imageKey
    ? `${process.env.NEXT_PUBLIC_R2_URL}/${bean.imageKey}`
    : `https://placehold.co/600x600/8b7355/ffffff?text=${encodeURIComponent(bean.name)}`;

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="mb-6 -ml-2 text-stone-600 hover:text-stone-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to all beans
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
