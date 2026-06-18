import { CoffeeBeanCardSkeleton } from '@/components/coffee-bean-card-skeleton';
import { BEANS_PER_PAGE } from '@/lib/constants';

export function BeansGridSkeleton() {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {Array.from({ length: BEANS_PER_PAGE }).map((_, index) => (
          <CoffeeBeanCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    </div>
  );
}
