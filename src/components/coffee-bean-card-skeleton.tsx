import { Skeleton } from '@/components/ui/skeleton';

export function CoffeeBeanCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      {/* Image Skeleton */}
      <Skeleton className="aspect-[4/3] w-full" />

      {/* Content */}
      <div className="p-4">
        {/* Name and Price */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-7 w-16" />
        </div>

        {/* Roast Level Badge */}
        <div className="mb-2">
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>

        {/* Description (2 lines) */}
        <div className="mb-2 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Tasting Notes Section */}
        <div className="mt-3 pt-3 border-t border-stone-100">
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}
