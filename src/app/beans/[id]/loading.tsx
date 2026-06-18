import { PageShell } from '@/components/page-shell';
import { CoffeeBeanDetailSkeleton } from '@/components/coffee-bean-detail-skeleton';

export default function BeanDetailLoading() {
  return (
    <PageShell>
      <CoffeeBeanDetailSkeleton />
    </PageShell>
  );
}
