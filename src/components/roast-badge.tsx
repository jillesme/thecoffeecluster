import { ROAST_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { RoastLevel } from '@/db/schema';

interface RoastBadgeProps {
  roastLevel: RoastLevel;
  /** `sm` for the catalog card, `md` for the detail hero. */
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
} as const;

export function RoastBadge({ roastLevel, size = 'sm', className }: RoastBadgeProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-full font-medium',
        SIZE_CLASSES[size],
        ROAST_COLORS[roastLevel],
        className
      )}
    >
      {roastLevel} Roast
    </span>
  );
}
