'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BeanDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Bean detail render failed:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-xl border border-amber-200 bg-white p-8 shadow-sm">
          <div className="mb-4 flex items-center gap-3 text-amber-700">
            <AlertTriangle className="h-6 w-6" />
            <h1 className="text-2xl font-bold text-stone-900">Bean detail failed to load</h1>
          </div>

          <p className="mb-4 text-stone-600">
            The server render for this coffee bean failed. In this demo that usually means
            the selected database connection mode could not complete a query.
          </p>

          <div className="mb-6 rounded-lg bg-stone-50 p-4 text-sm text-stone-600">
            <p>
              <span className="font-semibold text-stone-800">Safe detail:</span>{' '}
              Try toggling Hyperdrive or returning to the catalog and loading another bean.
            </p>
            {error.digest && (
              <p className="mt-2 font-mono text-xs text-stone-500">Digest: {error.digest}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={reset}>Try again</Button>
            <Button asChild variant="outline">
              <Link href="/">Back to catalog</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
