import type { CoffeeBean } from '@/db/schema';

interface PlaceholderSize {
  width: number;
  height: number;
}

/**
 * Resolve the image URL for a bean.
 * - Uses the R2 asset when an `imageKey` is present.
 * - Falls back to a coffee-colored placeholder sized for the surface.
 */
export function getBeanImageUrl(
  bean: Pick<CoffeeBean, 'name' | 'imageKey'>,
  { width = 400, height = 300 }: Partial<PlaceholderSize> = {}
): string {
  if (bean.imageKey) {
    return `${process.env.NEXT_PUBLIC_R2_URL}/${bean.imageKey}`;
  }

  return `https://placehold.co/${width}x${height}/8b7355/ffffff?text=${encodeURIComponent(
    bean.name
  )}`;
}
