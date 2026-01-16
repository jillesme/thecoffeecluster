import { describe, it, expect } from 'vitest';
import { computeStats, type LatencyRecord } from './latency-store';

describe('computeStats', () => {
  it('returns null averages for empty records', () => {
    const stats = computeStats([]);

    expect(stats.totalRequests).toBe(0);
    expect(stats.hyperdriveRequests).toBe(0);
    expect(stats.directRequests).toBe(0);
    expect(stats.avgHyperdriveTotal).toBeNull();
    expect(stats.avgHyperdriveDb).toBeNull();
    expect(stats.avgDirectTotal).toBeNull();
    expect(stats.avgDirectDb).toBeNull();
    expect(stats.lastRecord).toBeNull();
  });

  it('calculates stats for hyperdrive-only records', () => {
    const records: LatencyRecord[] = [
      { timestamp: 1000, totalMs: 100, dbMs: 50, isHyperdrive: true },
      { timestamp: 2000, totalMs: 200, dbMs: 100, isHyperdrive: true },
    ];

    const stats = computeStats(records);

    expect(stats.totalRequests).toBe(2);
    expect(stats.hyperdriveRequests).toBe(2);
    expect(stats.directRequests).toBe(0);
    expect(stats.avgHyperdriveTotal).toBe(150); // (100 + 200) / 2
    expect(stats.avgHyperdriveDb).toBe(75); // (50 + 100) / 2
    expect(stats.avgDirectTotal).toBeNull();
    expect(stats.avgDirectDb).toBeNull();
  });

  it('calculates stats for direct-only records', () => {
    const records: LatencyRecord[] = [
      { timestamp: 1000, totalMs: 300, dbMs: 200, isHyperdrive: false },
      { timestamp: 2000, totalMs: 400, dbMs: 250, isHyperdrive: false },
    ];

    const stats = computeStats(records);

    expect(stats.totalRequests).toBe(2);
    expect(stats.hyperdriveRequests).toBe(0);
    expect(stats.directRequests).toBe(2);
    expect(stats.avgHyperdriveTotal).toBeNull();
    expect(stats.avgHyperdriveDb).toBeNull();
    expect(stats.avgDirectTotal).toBe(350); // (300 + 400) / 2
    expect(stats.avgDirectDb).toBe(225); // (200 + 250) / 2
  });

  it('calculates stats for mixed records', () => {
    const records: LatencyRecord[] = [
      { timestamp: 1000, totalMs: 100, dbMs: 50, isHyperdrive: true },
      { timestamp: 2000, totalMs: 120, dbMs: 60, isHyperdrive: true },
      { timestamp: 3000, totalMs: 300, dbMs: 200, isHyperdrive: false },
      { timestamp: 4000, totalMs: 350, dbMs: 220, isHyperdrive: false },
    ];

    const stats = computeStats(records);

    expect(stats.totalRequests).toBe(4);
    expect(stats.hyperdriveRequests).toBe(2);
    expect(stats.directRequests).toBe(2);
    expect(stats.avgHyperdriveTotal).toBe(110); // (100 + 120) / 2
    expect(stats.avgHyperdriveDb).toBe(55); // (50 + 60) / 2
    expect(stats.avgDirectTotal).toBe(325); // (300 + 350) / 2
    expect(stats.avgDirectDb).toBe(210); // (200 + 220) / 2
  });

  it('returns the last record correctly', () => {
    const records: LatencyRecord[] = [
      { timestamp: 1000, totalMs: 100, dbMs: 50, isHyperdrive: true },
      { timestamp: 2000, totalMs: 200, dbMs: 100, isHyperdrive: false },
      { timestamp: 3000, totalMs: 150, dbMs: 75, isHyperdrive: true },
    ];

    const stats = computeStats(records);

    expect(stats.lastRecord).toEqual({
      timestamp: 3000,
      totalMs: 150,
      dbMs: 75,
      isHyperdrive: true,
    });
  });

  it('rounds averages to whole numbers', () => {
    const records: LatencyRecord[] = [
      { timestamp: 1000, totalMs: 100, dbMs: 50, isHyperdrive: true },
      { timestamp: 2000, totalMs: 101, dbMs: 51, isHyperdrive: true },
      { timestamp: 3000, totalMs: 102, dbMs: 52, isHyperdrive: true },
    ];

    const stats = computeStats(records);

    // (100 + 101 + 102) / 3 = 101
    expect(stats.avgHyperdriveTotal).toBe(101);
    // (50 + 51 + 52) / 3 = 51
    expect(stats.avgHyperdriveDb).toBe(51);
  });
});
