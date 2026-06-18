import Image from 'next/image';
import Link from 'next/link';
import { withHyperdriveParam } from '@/lib/hyperdrive-mode';
import { getBeanImageUrl } from '@/lib/bean-image';
import { RoastBadge } from '@/components/roast-badge';
import type { CoffeeBean } from '@/db/schema';

type CoffeeBeanCardProps = Pick<
  CoffeeBean,
  'id' | 'name' | 'description' | 'imageKey' | 'tastingNotes' | 'priceInCents' | 'roastLevel'
> & {
  eager?: boolean;
  useHyperdrive?: boolean;
};

export function CoffeeBeanCard({
  id,
  name,
  description,
  imageKey,
  tastingNotes,
  priceInCents,
  roastLevel,
  eager = false,
  useHyperdrive,
}: CoffeeBeanCardProps) {
  const price = (priceInCents / 100).toFixed(2);
  const href =
    typeof useHyperdrive === 'boolean'
      ? withHyperdriveParam(`/beans/${id}`, useHyperdrive)
      : `/beans/${id}`;

  const imageUrl = getBeanImageUrl({ name, imageKey }, { width: 400, height: 300 });

  return (
    <Link
      href={href}
      prefetch={false}
      className="group block overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-stone-300"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        <Image
          src={imageUrl}
          alt={name}
          fill
          unoptimized
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : 'auto'}
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name and Price */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg text-stone-900 leading-tight group-hover:text-stone-700">
            {name}
          </h3>
          <span className="text-lg font-bold text-stone-900 whitespace-nowrap">
            ${price}
          </span>
        </div>

        {/* Roast Level Badge */}
        {roastLevel && (
          <div className="mb-2">
            <RoastBadge roastLevel={roastLevel} size="sm" />
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="mb-2 text-sm text-stone-600 line-clamp-2">
            {description}
          </p>
        )}

        {/* Tasting Notes */}
        {tastingNotes && (
          <div className="mt-3 pt-3 border-t border-stone-100">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
              Tasting Notes
            </p>
            <p className="text-sm text-stone-700 italic">{tastingNotes}</p>
          </div>
        )}
      </div>
    </Link>
  );
}
