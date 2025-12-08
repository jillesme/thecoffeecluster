import { Skeleton } from '@/components/ui/skeleton';

export function CoffeeBeanDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button skeleton */}
      <Skeleton className="h-9 w-24 mb-6" />

      <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Image skeleton */}
          <Skeleton className="aspect-square md:aspect-auto md:h-full min-h-[300px]" />

          {/* Content skeleton */}
          <div className="p-6 md:p-8">
            {/* Roast badge */}
            <Skeleton className="h-6 w-24 rounded-full mb-4" />

            {/* Title */}
            <Skeleton className="h-10 w-3/4 mb-2" />

            {/* Price */}
            <Skeleton className="h-8 w-20 mb-6" />

            {/* Description */}
            <div className="space-y-2 mb-6">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>

            {/* Tasting notes */}
            <div className="mb-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-5 w-48" />
            </div>

            {/* Supplier card */}
            <div className="border-t border-stone-100 pt-6">
              <Skeleton className="h-4 w-16 mb-3" />
              <div className="bg-stone-50 rounded-lg p-4">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
