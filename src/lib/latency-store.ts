'use client';

import { create } from 'zustand';

export interface LatencyRecord {
  timestamp: number;
  totalMs: number;
  dbMs: number;
  isHyperdrive: boolean;
}

interface LatencyStats {
  records: LatencyRecord[];
  addRecord: (record: Omit<LatencyRecord, 'timestamp'>) => void;
  clearRecords: () => void;
}

export const useLatencyStore = create<LatencyStats>((set) => ({
  records: [],
  addRecord: (record) =>
    set((state) => ({
      records: [
        ...state.records.slice(-19), // Keep last 20 records
        { ...record, timestamp: Date.now() },
      ],
    })),
  clearRecords: () => set({ records: [] }),
}));

// Helper functions for computing stats
export function computeStats(records: LatencyRecord[]) {
  const hyperdriveRecords = records.filter((r) => r.isHyperdrive);
  const directRecords = records.filter((r) => !r.isHyperdrive);

  const avgTotal = (recs: LatencyRecord[]) =>
    recs.length > 0
      ? Math.round(recs.reduce((sum, r) => sum + r.totalMs, 0) / recs.length)
      : null;

  const avgDb = (recs: LatencyRecord[]) =>
    recs.length > 0
      ? Math.round(recs.reduce((sum, r) => sum + r.dbMs, 0) / recs.length)
      : null;

  const lastRecord = records.length > 0 ? records[records.length - 1] : null;

  return {
    lastRecord,
    totalRequests: records.length,
    hyperdriveRequests: hyperdriveRecords.length,
    directRequests: directRecords.length,
    avgHyperdriveTotal: avgTotal(hyperdriveRecords),
    avgHyperdriveDb: avgDb(hyperdriveRecords),
    avgDirectTotal: avgTotal(directRecords),
    avgDirectDb: avgDb(directRecords),
  };
}
