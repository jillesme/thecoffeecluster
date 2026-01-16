import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock the database module
vi.mock('@/db', () => ({
  getDb: vi.fn(),
}));

vi.mock('@/db/schema', () => ({
  coffeeBeans: { id: 'id', supplierId: 'supplierId' },
  suppliers: { id: 'id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ field: a, value: b })),
}));

// Mock data
const mockBean = {
  id: 1,
  name: 'Ethiopian Yirgacheffe',
  description: 'A bright, fruity coffee',
  priceInCents: 1899,
  roastLevel: 'Light',
  tastingNotes: 'Blueberry, Jasmine',
  imageKey: null,
  supplierId: 1,
};

const mockSupplier = {
  id: 1,
  name: 'Highland Farms',
  country: 'Ethiopia',
  isFairTrade: true,
  websiteUrl: 'https://example.com',
};

import { getDb } from '@/db';

describe('GET /api/beans/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns bean with supplier on valid ID', async () => {
    vi.mocked(getDb).mockImplementation(() => ({
      db: {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { bean: mockBean, supplier: mockSupplier },
                ]),
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>['db'],
      isUsingHyperdrive: false,
    }));

    const request = new NextRequest('http://localhost:3000/api/beans/1');
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.bean).toEqual(mockBean);
    expect(data.supplier).toEqual(mockSupplier);
    expect(data).toHaveProperty('isUsingHyperdrive');
    expect(data).toHaveProperty('dbDurationMs');
  });

  it('returns 400 for invalid (non-numeric) ID', async () => {
    const request = new NextRequest('http://localhost:3000/api/beans/invalid');
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid bean ID');
  });

  it('returns 404 when bean not found', async () => {
    vi.mocked(getDb).mockImplementation(() => ({
      db: {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>['db'],
      isUsingHyperdrive: false,
    }));

    const request = new NextRequest('http://localhost:3000/api/beans/9999');
    const response = await GET(request, { params: Promise.resolve({ id: '9999' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Coffee bean not found');
  });

  it('returns 500 on database error', async () => {
    vi.mocked(getDb).mockImplementation(() => ({
      db: {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockRejectedValue(new Error('Database error')),
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>['db'],
      isUsingHyperdrive: false,
    }));

    const request = new NextRequest('http://localhost:3000/api/beans/1');
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch coffee bean');
  });

  it('sets no-cache headers on response', async () => {
    vi.mocked(getDb).mockImplementation(() => ({
      db: {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { bean: mockBean, supplier: mockSupplier },
                ]),
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>['db'],
      isUsingHyperdrive: false,
    }));

    const request = new NextRequest('http://localhost:3000/api/beans/1');
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

    expect(response.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate');
  });

  it('reads hyperdrive cookie preference', async () => {
    vi.mocked(getDb).mockImplementation(() => ({
      db: {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { bean: mockBean, supplier: mockSupplier },
                ]),
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof getDb>['db'],
      isUsingHyperdrive: true,
    }));

    const request = new NextRequest('http://localhost:3000/api/beans/1', {
      headers: {
        cookie: 'use-hyperdrive=true',
      },
    });
    const response = await GET(request, { params: Promise.resolve({ id: '1' }) });
    const data = await response.json();

    expect(getDb).toHaveBeenCalledWith(true);
    expect(data.isUsingHyperdrive).toBe(true);
  });
});
