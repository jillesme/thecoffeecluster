import { PageShell } from '@/components/page-shell';
import { BeansGridSkeleton } from '@/components/beans-grid-skeleton';

export default function HomeLoading() {
  return (
    <PageShell>
      <BeansGridSkeleton />
    </PageShell>
  );
}
