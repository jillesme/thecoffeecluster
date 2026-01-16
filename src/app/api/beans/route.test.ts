import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock the database module
vi.mock('@/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@/db/schema', () => ({
  coffeeBeans: { id: 'id' },
}));

vi.mock('drizzle-orm', () => ({
  count: vi.fn(() => 'count'),
}));

// Mock bean data
const mockBeans = [
  { id: 1, name: 'Test Bean 1', priceInCents: 1500 },
  { id: 2, name: 'Test Bean 2', priceInCents: 2000 },
];

import { getDb } from '@/db';

// Helper to create a mock db that handles both count and select queries
function createMockDb(totalCount: number, beans: typeof mockBeans, isUsingHyperdrive = false) {
  let callCount = 0;

  return {
    db: {
      select: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call is for count
          return {
            from: vi.fn().mockResolvedValue([{ value: totalCount }]),
          };
        } else {
          // Second call is for beans
          return {
            from: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(beans),
              }),
            }),
          };
        }
      }),
    } as unknown as ReturnType<typeof getDb>['db'],
    isUsingHyperdrive,
  };
}

describe('GET /api/beans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns beans with pagination metadata', async () => {
    vi.mocked(getDb).mockReturnValue(createMockDb(72, mockBeans));

    const request = new NextRequest('http://localhost:3000/api/beans?page=1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('beans');
    expect(data).toHaveProperty('pagination');
    expect(data).toHaveProperty('isUsingHyperdrive');
    expect(data).toHaveProperty('dbDurationMs');
    expect(data.beans).toEqual(mockBeans);
    expect(data.pagination.totalCount).toBe(72);
    expect(data.pagination.currentPage).toBe(1);
  });

  it('defaults to page 1 when no page param', async () => {
    vi.mocked(getDb).mockReturnValue(createMockDb(72, mockBeans));

    const request = new NextRequest('http://localhost:3000/api/beans');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.currentPage).toBe(1);
  });

  it('clamps page to minimum of 1', async () => {
    vi.mocked(getDb).mockReturnValue(createMockDb(72, mockBeans));

    const request = new NextRequest('http://localhost:3000/api/beans?page=-5');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.currentPage).toBe(1);
  });

  it('calculates totalPages correctly', async () => {
    vi.mocked(getDb).mockReturnValue(createMockDb(72, mockBeans));

    const request = new NextRequest('http://localhost:3000/api/beans?page=1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.totalPages).toBe(12); // 72 beans / 6 per page = 12 pages
    expect(data.pagination.perPage).toBe(6);
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getDb).mockReturnValue({
      db: {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockRejectedValue(new Error('Database connection failed')),
        }),
      } as unknown as ReturnType<typeof getDb>['db'],
      isUsingHyperdrive: false,
    });

    const request = new NextRequest('http://localhost:3000/api/beans?page=1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch coffee beans');
  });

  it('reads hyperdrive cookie preference', async () => {
    vi.mocked(getDb).mockReturnValue(createMockDb(72, mockBeans, true));

    const request = new NextRequest('http://localhost:3000/api/beans?page=1', {
      headers: {
        cookie: 'use-hyperdrive=true',
      },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(getDb).toHaveBeenCalledWith(true);
    expect(data.isUsingHyperdrive).toBe(true);
  });

  it('returns correct beans count for partial last page', async () => {
    vi.mocked(getDb).mockReturnValue(createMockDb(10, mockBeans.slice(0, 2)));

    const request = new NextRequest('http://localhost:3000/api/beans?page=1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.totalPages).toBe(2); // 10 beans / 6 per page = 2 pages
  });
});
