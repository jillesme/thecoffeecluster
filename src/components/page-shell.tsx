'use client';

import Link from 'next/link';
import { LatencyStatsPanel } from '@/components/latency-stats-panel';

interface PageShellProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

export function PageShell({ children, showHeader = true }: PageShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        {showHeader && (
          <header className="mb-8 text-center">
            <Link href="/" className="inline-block">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 mb-4 tracking-tight hover:text-stone-700 transition-colors">
                The Coffee Cluster
              </h1>
            </Link>
            <p className="text-lg text-stone-600 max-w-2xl mx-auto">
              Discover our curated collection of premium coffee beans from around the world
            </p>
          </header>
        )}

        {/* Latency Stats Panel */}
        <div className="mb-8 max-w-3xl mx-auto">
          <LatencyStatsPanel />
        </div>

        {/* Main Content */}
        <main>{children}</main>
      </div>
    </div>
  );
}
