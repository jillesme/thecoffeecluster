# Performance follow-ups

This branch focuses on improvements that preserve the core demo goal: making the Hyperdrive vs direct database latency difference visible.

## Implemented in `optimize-next`

- Bean detail pages render as Server Components while still selecting direct vs Hyperdrive from `?hyperdrive=true|false` with cookie fallback.
- Internal bean links and pagination API calls append the current Hyperdrive mode so the comparison survives navigation.
- Count and page queries run concurrently to remove unnecessary request waterfalls without hiding database latency.
- The shared page shell is now a Server Component; only the latency stats panel remains client-side.
- Removed the unused Geist Mono font and unused `tw-animate-css` import.

## Deferred

- Add an explicit optimized/cache mode later: direct, Hyperdrive, and Hyperdrive + app/edge/query cache. This should be separate from the baseline modes so caching does not hide the Hyperdrive comparison.
- Revisit replacing `js-cookie`, Zustand, global theme runtime, and always-loaded toast code if the client bundle remains too large after the server-boundary work.
- Add Cloudflare image transformations or prebuilt responsive variants when the demo moves from small sample images to larger production-like assets.
