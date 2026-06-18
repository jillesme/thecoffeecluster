import type { RoastLevel } from '@/db/schema';

/** Beans shown per catalog page (2 rows × 3 columns on desktop). */
export const BEANS_PER_PAGE = 6;

/** Tailwind classes for each roast-level badge. */
export const ROAST_COLORS: Record<RoastLevel, string> = {
  Light: 'bg-amber-100 text-amber-800',
  Medium: 'bg-amber-200 text-amber-900',
  Dark: 'bg-amber-800 text-amber-50',
  Espresso: 'bg-stone-900 text-stone-50',
};
