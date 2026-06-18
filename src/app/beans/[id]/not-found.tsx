import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BeanNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="mb-4 flex items-center gap-3 text-stone-700">
            <SearchX className="h-6 w-6" />
            <h1 className="text-2xl font-bold text-stone-900">Bean not found</h1>
          </div>

          <p className="mb-6 text-stone-600">
            We couldn&apos;t find a coffee bean with that id. It may have been removed
            from the catalog.
          </p>

          <Button asChild variant="outline">
            <Link href="/">Back to all beans</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
