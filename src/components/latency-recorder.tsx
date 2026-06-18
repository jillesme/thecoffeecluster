'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useLatencyStore } from '@/lib/latency-store';

interface LatencyRecorderProps {
  /** What was loaded, e.g. "page 2" or a bean name. */
  label: string;
  dbDurationMs: number;
  totalMs: number;
  isUsingHyperdrive: boolean;
}

/**
 * Records server-measured latency and surfaces it as a toast. Rendered by
 * server components after a data read, so every (soft) navigation that
 * re-renders the page reports its own PlanetScale-vs-Hyperdrive timing.
 */
export function LatencyRecorder({
  label,
  dbDurationMs,
  totalMs,
  isUsingHyperdrive,
}: LatencyRecorderProps) {
  const addRecord = useLatencyStore((state) => state.addRecord);

  useEffect(() => {
    addRecord({
      totalMs,
      dbMs: dbDurationMs,
      isHyperdrive: isUsingHyperdrive,
    });

    const connectionType = isUsingHyperdrive ? 'Hyperdrive' : 'Direct';
    toast.success(`Loaded ${label}`, {
      description: `${dbDurationMs}ms db / ${totalMs}ms server (${connectionType})`,
    });
  }, [addRecord, label, dbDurationMs, totalMs, isUsingHyperdrive]);

  return null;
}
