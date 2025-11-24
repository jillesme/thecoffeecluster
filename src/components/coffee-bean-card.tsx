import Image from 'next/image';

interface CoffeeBeanCardProps {
  id: number;
  name: string;
  description: string | null;
  imageKey: string | null;
  tastingNotes: string | null;
  priceInCents: number;
  roastLevel: 'Light' | 'Medium' | 'Dark' | 'Espresso' | null;
}

const ROAST_COLORS = {
  Light: 'bg-amber-100 text-amber-800',
  Medium: 'bg-amber-200 text-amber-900',
  Dark: 'bg-amber-800 text-amber-50',
  Espresso: 'bg-stone-900 text-stone-50',
};

export function CoffeeBeanCard({
  name,
  description,
  imageKey,
  tastingNotes,
  priceInCents,
  roastLevel,
}: CoffeeBeanCardProps) {
  const price = (priceInCents / 100).toFixed(2);

  // Construct R2 image URL
  const imageUrl = imageKey
    ? `${process.env.NEXT_PUBLIC_R2_URL}/${imageKey}`
    : `https://placehold.co/400x300/8b7355/ffffff?text=${encodeURIComponent(name)}`;

  return (
    <div className="group overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        <Image
          src={imageUrl}
          alt={name}
          fill
          unoptimized
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Name and Price */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg text-stone-900 leading-tight">
            {name}
          </h3>
          <span className="text-lg font-bold text-stone-900 whitespace-nowrap">
            ${price}
          </span>
        </div>

        {/* Roast Level Badge */}
        {roastLevel && (
          <div className="mb-2">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                ROAST_COLORS[roastLevel]
              }`}
            >
              {roastLevel} Roast
            </span>
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="mb-2 text-sm text-stone-600 line-clamp-2">
            {description}
          </p>
        )}

        {/* Tasting Notes */}
        {tastingNotes && (
          <div className="mt-3 pt-3 border-t border-stone-100">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
              Tasting Notes
            </p>
            <p className="text-sm text-stone-700 italic">{tastingNotes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
