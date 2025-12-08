'use client';

import { useLatencyStore, computeStats } from '@/lib/latency-store';
import { Card } from '@/components/ui/card';
import { Zap, Database, Activity } from 'lucide-react';

export function LatencyStatsPanel() {
  const records = useLatencyStore((state) => state.records);
  const stats = computeStats(records);

  // Calculate improvement percentage when we have both types
  const improvementPercent =
    stats.avgDirectDb && stats.avgHyperdriveDb
      ? Math.round(
          ((stats.avgDirectDb - stats.avgHyperdriveDb) / stats.avgDirectDb) * 100
        )
      : null;

  // Empty state
  if (records.length === 0) {
    return (
      <Card className="bg-white/60 backdrop-blur-sm border-stone-200/50">
        <div className="py-6 px-8">
          <div className="flex items-center justify-center gap-2 text-stone-400">
            <Activity className="w-4 h-4" />
            <span className="text-sm">
              Navigate pages to measure latency
            </span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white/60 backdrop-blur-sm border-stone-200/50 overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-stone-200/50">
        {/* Hyperdrive Stats */}
        <div className="p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Hyperdrive
            </span>
          </div>
          {stats.avgHyperdriveDb !== null ? (
            <>
              <div className="text-3xl font-bold text-orange-600 tabular-nums">
                {stats.avgHyperdriveDb}
                <span className="text-lg font-normal text-orange-400 ml-0.5">ms</span>
              </div>
              <div className="text-xs text-stone-400 mt-1">
                avg of {stats.hyperdriveRequests} request{stats.hyperdriveRequests !== 1 ? 's' : ''}
              </div>
            </>
          ) : (
            <div className="text-2xl font-light text-stone-300">--</div>
          )}
        </div>

        {/* Direct Stats */}
        <div className="p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Database className="w-4 h-4 text-stone-400" />
            <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Direct
            </span>
          </div>
          {stats.avgDirectDb !== null ? (
            <>
              <div className="text-3xl font-bold text-stone-600 tabular-nums">
                {stats.avgDirectDb}
                <span className="text-lg font-normal text-stone-400 ml-0.5">ms</span>
              </div>
              <div className="text-xs text-stone-400 mt-1">
                avg of {stats.directRequests} request{stats.directRequests !== 1 ? 's' : ''}
              </div>
            </>
          ) : (
            <div className="text-2xl font-light text-stone-300">--</div>
          )}
        </div>

        {/* Improvement */}
        <div className="p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xs font-medium uppercase tracking-wide text-stone-500">
              Improvement
            </span>
          </div>
          {improvementPercent !== null && improvementPercent > 0 ? (
            <>
              <div className="text-3xl font-bold text-emerald-600 tabular-nums">
                {improvementPercent}
                <span className="text-lg font-normal text-emerald-400 ml-0.5">%</span>
              </div>
              <div className="text-xs text-emerald-600 mt-1 font-medium">
                faster with Hyperdrive
              </div>
            </>
          ) : stats.avgHyperdriveDb !== null && stats.avgDirectDb !== null ? (
            <>
              <div className="text-2xl font-bold text-stone-400 tabular-nums">0%</div>
              <div className="text-xs text-stone-400 mt-1">no difference</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-light text-stone-300">--</div>
              <div className="text-xs text-stone-400 mt-1">
                try both modes
              </div>
            </>
          )}
        </div>
      </div>

      {/* Last request indicator */}
      {stats.lastRecord && (
        <div className="border-t border-stone-200/50 px-5 py-2.5 bg-stone-50/50">
          <div className="flex items-center justify-center gap-4 text-xs text-stone-500">
            <span>
              Last request:{' '}
              <span className={`font-semibold ${stats.lastRecord.isHyperdrive ? 'text-orange-600' : 'text-stone-600'}`}>
                {stats.lastRecord.dbMs}ms
              </span>
              <span className="text-stone-400"> db</span>
              {' / '}
              <span className="font-medium">{stats.lastRecord.totalMs}ms</span>
              <span className="text-stone-400"> total</span>
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${
              stats.lastRecord.isHyperdrive 
                ? 'bg-orange-100 text-orange-700' 
                : 'bg-stone-200 text-stone-600'
            }`}>
              {stats.lastRecord.isHyperdrive ? (
                <>
                  <Zap className="w-3 h-3" />
                  Hyperdrive
                </>
              ) : (
                <>
                  <Database className="w-3 h-3" />
                  Direct
                </>
              )}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
